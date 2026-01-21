export interface SpeedtestResult {
  downloadMbps: number;
  uploadMbps: number;
  ping: number;
  jitter: number;
}

export type ProgressCallback = (value: number, phase: 'download' | 'upload' | 'ping' | 'jitter', elapsed: number, total: number) => void;
