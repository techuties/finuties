export interface PythonComputeRequest {
  strategy: string;
  series: number[];
  options?: Record<string, unknown>;
}

export interface PythonComputeResponse {
  ok: boolean;
  result?: {
    values: number[];
    meta?: Record<string, unknown>;
  };
  error?: string;
}

export interface PythonAdapterConfig {
  enabled: boolean;
  origin: string;
  timeoutMs: number;
  maxSeriesLength: number;
}
