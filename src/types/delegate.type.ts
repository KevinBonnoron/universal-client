export type HttpDelegate = {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, body: unknown): Promise<T>;
  patch<T>(url: string, body: unknown): Promise<T>;
  put<T>(url: string, body: unknown): Promise<T>;
  delete<T>(url: string): Promise<T>;
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
  onOpen(callback: (event: Event) => void): void;
  onError(callback: (event: Event) => void): void;
  onMessage(callback: (data: unknown) => void): void;
  subscribe(event: string, callback: (data: unknown) => void): void;
}

export type Delegate = HttpDelegate | WebSocketDelegate | ServerSentEventDelegate;
