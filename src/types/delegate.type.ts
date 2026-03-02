export interface HttpRequestOptions {
  headers?: Record<string, string>;
  params?: Record<PropertyKey, string | number | Date | boolean | null | undefined | Array<string | number | Date | boolean | null | undefined>>;
  format?: 'json' | 'text' | 'blob' | 'raw';
  signal?: AbortSignal;
}

export type HttpDelegate = {
  get<T>(url: string, options?: HttpRequestOptions): Promise<T>;
  post<T>(url: string, body: unknown, options?: HttpRequestOptions): Promise<T>;
  patch<T>(url: string, body: unknown, options?: HttpRequestOptions): Promise<T>;
  put<T>(url: string, body: unknown, options?: HttpRequestOptions): Promise<T>;
  delete<T>(url: string, options?: HttpRequestOptions): Promise<T>;
};

export interface WebSocketDelegate {
  connect(): void;
  send(message: unknown): void;
  close(): void;
  onOpen(callback: (event: Event) => void): () => void;
  onClose(callback: (event: CloseEvent) => void): () => void;
  onError(callback: (event: Event) => void): () => void;
  onMessage(callback: (data: unknown) => void): () => void;
}

export interface SseOpenOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  url?: string;
}

export interface ServerSentEventDelegate {
  open(options?: SseOpenOptions): void;
  close(): void;
  onOpen(callback: (event: Event) => void): () => void;
  onError(callback: (event: Event) => void): () => void;
  onMessage(callback: (data: unknown) => void): () => void;
  subscribe(event: string, callback: (data: unknown) => void): () => void;
}

export type Delegate = HttpDelegate | WebSocketDelegate | ServerSentEventDelegate;
