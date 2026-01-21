import { runDownloadTest, runUploadTest, runPingJitterTest } from './speedtest-worker';

declare var self: Worker;

type WorkerMessage = 
  | { type: 'runDownloadTest'; baseURL: string }
  | { type: 'runUploadTest'; baseURL: string }
  | { type: 'runPingJitterTest'; baseURL: string }
  | { type: 'abort' };

type WorkerResponse = 
  | { type: 'progress'; phase: 'download' | 'upload' | 'ping' | 'jitter'; value: number; elapsed: number; total: number }
  | { type: 'complete'; test: 'download' | 'upload' | 'pingJitter'; result: number | { ping: number; jitter: number } }
  | { type: 'error'; message: string };

let abortController: AbortController | null = null;

function onProgress(value: number, phase: 'download' | 'upload' | 'ping' | 'jitter', elapsed: number, total: number) {
  postMessage({ type: 'progress', phase, value, elapsed, total } as WorkerResponse);
}

async function handleMessage(message: WorkerMessage) {
  try {
    if (message.type === 'runDownloadTest') {
      abortController = new AbortController();
      const result = await runDownloadTest(message.baseURL, onProgress, abortController.signal);
      postMessage({ type: 'complete', test: 'download', result } as WorkerResponse);
    } else if (message.type === 'runUploadTest') {
      abortController = new AbortController();
      const result = await runUploadTest(message.baseURL, onProgress, abortController.signal);
      postMessage({ type: 'complete', test: 'upload', result } as WorkerResponse);
    } else if (message.type === 'runPingJitterTest') {
      abortController = new AbortController();
      const result = await runPingJitterTest(message.baseURL, onProgress, abortController.signal);
      postMessage({ type: 'complete', test: 'pingJitter', result } as WorkerResponse);
    } else if (message.type === 'abort') {
      abortController?.abort();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    postMessage({ type: 'error', message } as WorkerResponse);
  }
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  handleMessage(event.data);
};
