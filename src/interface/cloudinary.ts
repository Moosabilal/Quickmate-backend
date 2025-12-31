export interface CloudinaryError extends Error {
  http_code?: number;
  code?: string;
  error?: {
    code?: string;
  };
}

export interface CloudinaryDeleteResponse {
  result: string;
  [key: string]: unknown;
}