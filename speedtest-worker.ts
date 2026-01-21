import type { ProgressCallback } from './types';

const MEGABIT = 1000000;

function calcBandwidth(size: number, start: number): number {
  return (size * 8) / ((performance.now() - start) / 1000);
}

function convertToMbps(num: number): string {
  return (num / MEGABIT).toFixed(2);
}

export async function runDownloadTest(
  baseURL: string,
  onProgress: ProgressCallback,
  abortSignal: AbortSignal
): Promise<number> {
  const CHUNK_SIZE = 10000000;
  const MAX_TIME = 3000;
  const NUM_STREAMS = 8;

  const startTime = performance.now();
  let totalBytes = 0;
  let maxSpeed = 0.0;
  let running = true;

  const controllers: (AbortController | undefined)[] = [];

  async function downloadStream(streamId: number): Promise<void> {
    while (running && !abortSignal.aborted) {
      const controller = new AbortController();
      controllers[streamId] = controller;

      const url = `${baseURL}/download?bytes=${CHUNK_SIZE}`;

      try {
        const start = performance.now();
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Download request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        let streamBytes = 0;
        while (running && !abortSignal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          if (abortSignal.aborted) {
            reader.cancel();
            break;
          }
          streamBytes += value.length;
          totalBytes += value.length;
        }

      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error(`Download stream ${streamId} error:`, error.message);
        }
        return;
      }

      if (!running || abortSignal.aborted) {
        return;
      }
    }
  }

  const streams = Array.from({ length: NUM_STREAMS }, (_, i) => downloadStream(i));

  const intervalPromise = new Promise<void>((resolve) => {
    const intervalId = setInterval(() => {
      const elapsed = performance.now() - startTime;

      if (elapsed >= MAX_TIME || abortSignal.aborted || !running) {
        clearInterval(intervalId);
        running = false;
        controllers.forEach(c => c?.abort());
        resolve();
        return;
      }

      const speed = totalBytes / (elapsed / 1000.0);
      const speedMbps = ((speed * 8) / MEGABIT);
      if (speedMbps > maxSpeed) {
        maxSpeed = speedMbps;
      }
      onProgress(speedMbps, 'download', elapsed, MAX_TIME);
    }, 200);
  });

  await Promise.all([...streams, intervalPromise]);

  return maxSpeed;
}

function generateRandomBuffer(size: number): Uint8Array {
  const buffer = new ArrayBuffer(size);
  const uint32 = new Uint32Array(buffer);
  const maxInt = 2 ** 32 - 1;
  for (let i = 0; i < uint32.length; i++) {
    uint32[i] = Math.floor(Math.random() * maxInt);
  }
  return new Uint8Array(buffer);
}

export async function runUploadTest(
  baseURL: string,
  onProgress: ProgressCallback,
  abortSignal: AbortSignal
): Promise<number> {
  const maxTime = 7000;
  const startTime = performance.now();
  let totalUploaded = 0.0;
  let maxSpeed = 0.0;
  let running = true;

  const r = generateRandomBuffer(1048576);
  const req: Blob[] = [];
  for (let i = 0; i < 20; i++) {
    req.push(new Blob([r]));
  }
  const reqBlob = new Blob(req);

  const controllers: (AbortController | undefined)[] = [];

  async function testStream(i: number, delay: number): Promise<void> {
    if (!running || abortSignal.aborted) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, delay));

    while (running && !abortSignal.aborted) {
      const controller = new AbortController();
      controllers[i] = controller;

      const url = `${baseURL}/upload`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          body: reqBlob,
          signal: controller.signal,
          headers: {
            'Content-Encoding': 'identity',
          },
        });

        if (response.ok && running) {
          totalUploaded += reqBlob.size;
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error(`Upload stream ${i} error:`, error.message);
        }
        return;
      }

      if (!running || abortSignal.aborted) {
        return;
      }
    }
  }

  const streams = [
    testStream(0, 0),
    testStream(1, 300),
    testStream(2, 600),
  ];

  const intervalPromise = new Promise<void>((resolve) => {
    const intervalId = setInterval(() => {
      const elapsed = performance.now() - startTime;

      if (elapsed >= maxTime || abortSignal.aborted || !running) {
        clearInterval(intervalId);
        running = false;
        controllers.forEach(c => c?.abort());
        resolve();
        return;
      }

      const speed = totalUploaded / (elapsed / 1000.0);
      const ulSpeed = ((speed * 8) / MEGABIT);
      if (ulSpeed > maxSpeed) {
        maxSpeed = ulSpeed;
      }
      onProgress(ulSpeed, 'upload', elapsed, maxTime);
    }, 200);
  });

  await Promise.all([...streams, intervalPromise]);

  return maxSpeed;
}

function parseHostAndPort(baseURL: string): { host: string; port: number } {
  const url = new URL(baseURL);
  const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
  return { host: url.hostname, port };
}

async function tcpPing(host: string, port: number, abortSignal: AbortSignal): Promise<number> {
  const net = await import('net');
  
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port, timeout: 2000 });
    
    const start = performance.now();
    
    socket.on('connect', () => {
      const end = performance.now();
      socket.destroy();
      resolve(end - start);
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('TCP ping timeout'));
    });

    abortSignal.addEventListener('abort', () => {
      socket.destroy();
      reject(new Error('Aborted'));
    });
  });
}

export async function runPingJitterTest(
  baseURL: string,
  onProgress: ProgressCallback,
  abortSignal: AbortSignal
): Promise<{ ping: number; jitter: number }> {
  const { host, port } = parseHostAndPort(baseURL);
  let ping = 0.0;
  let jitter = 0.0;
  let numPings = 0;
  let previousPingTime = 0.0;
  const startTime = performance.now();

  const maxPings = 10;
  const estimatedTimePerPing = 200;

  async function doPing(): Promise<void> {
    if (abortSignal.aborted || numPings >= maxPings) {
      return;
    }

    try {
      const latency = await tcpPing(host, port, abortSignal);

      if (numPings === 0) {
        ping = latency;
        previousPingTime = latency;
      } else {
        const curJitter = Math.abs(latency - previousPingTime);

        if (latency < ping) {
          ping = latency;
        }

        if (numPings === 1) {
          jitter = curJitter;
        } else {
          if (curJitter > jitter) {
            jitter = jitter * 0.3 + curJitter * 0.7;
          } else {
            jitter = jitter * 0.8 + curJitter * 0.2;
          }
        }

        previousPingTime = latency;
      }

      numPings++;

      const elapsed = performance.now() - startTime;
      const total = maxPings * estimatedTimePerPing;
      onProgress(ping, 'ping', elapsed, total);
      onProgress(jitter, 'jitter', elapsed, total);

      if (numPings < maxPings) {
        await doPing();
      }
    } catch (error) {
      if (abortSignal.aborted) {
        throw new Error('Ping test aborted');
      }
      throw error;
    }
  }

  await doPing();

  return { ping, jitter };
}
