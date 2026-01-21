import type { ProgressCallback } from './types';

type WorkerMessage = 
  | { type: 'runDownloadTest'; baseURL: string }
  | { type: 'runUploadTest'; baseURL: string }
  | { type: 'runPingJitterTest'; baseURL: string }
  | { type: 'abort' };

type WorkerResponse = 
  | { type: 'progress'; phase: 'download' | 'upload' | 'ping' | 'jitter'; value: number; elapsed: number; total: number }
  | { type: 'complete'; test: 'download' | 'upload' | 'pingJitter'; result: number | { ping: number; jitter: number } }
  | { type: 'error'; message: string };

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url));
  }
  return worker;
}

async function runInWorker<T>(
  message: WorkerMessage,
  onProgress: ProgressCallback,
  abortSignal: AbortSignal
): Promise<T> {
  const w = getWorker();
  
  return new Promise((resolve, reject) => {
    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      
      if (data.type === 'progress') {
        onProgress(data.value, data.phase, data.elapsed, data.total);
      } else if (data.type === 'complete') {
        w.removeEventListener('message', handleMessage);
        if (abortSignal.aborted) {
          reject(new Error('Test aborted'));
        } else {
          resolve(data.result as T);
        }
      } else if (data.type === 'error') {
        w.removeEventListener('message', handleMessage);
        reject(new Error(data.message));
      }
    };

    w.addEventListener('message', handleMessage);
    
    abortSignal.addEventListener('abort', () => {
      w.postMessage({ type: 'abort' } as WorkerMessage);
    });

    w.postMessage(message);
  });
}

export async function runDownloadTest(
  baseURL: string,
  onProgress: ProgressCallback,
  abortSignal: AbortSignal
): Promise<number> {
  return runInWorker<number>(
    { type: 'runDownloadTest', baseURL },
    onProgress,
    abortSignal
  );
}

export async function runUploadTest(
  baseURL: string,
  onProgress: ProgressCallback,
  abortSignal: AbortSignal
): Promise<number> {
  return runInWorker<number>(
    { type: 'runUploadTest', baseURL },
    onProgress,
    abortSignal
  );
}

export async function runPingJitterTest(
  baseURL: string,
  onProgress: ProgressCallback,
  abortSignal: AbortSignal
): Promise<{ ping: number; jitter: number }> {
  return runInWorker<{ ping: number; jitter: number }>(
    { type: 'runPingJitterTest', baseURL },
    onProgress,
    abortSignal
  );
}
