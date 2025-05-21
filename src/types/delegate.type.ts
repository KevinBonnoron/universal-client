export interface HttpRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
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

export interface ServerSentEventDelegate {
  close(): void;
  onOpen(callback: (event: Event) => void): () => void;
  onError(callback: (event: Event) => void): () => void;
  onMessage(callback: (data: unknown) => void): () => void;
  subscribe(event: string, callback: (data: unknown) => void): () => void;
}

export type Delegate = HttpDelegate | WebSocketDelegate | ServerSentEventDelegate;
