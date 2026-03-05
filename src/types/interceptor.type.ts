import type { SseOpenOptions } from './delegate.type';

/**
 * Context for request interception, allows modifying request properties
 */
export interface RequestInterceptorContext {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * Context for response interception
 */
export interface ResponseInterceptorContext<T = unknown> {
  method: string;
  url: string;
  response: T;
}

/**
 * Interceptor for HTTP delegate methods
 */
export interface HttpInterceptor {
  onBeforeRequest?: (context: RequestInterceptorContext) => undefined | Partial<RequestInterceptorContext> | Promise<Partial<RequestInterceptorContext> | undefined>;
  onAfterResponse?: <T>(context: ResponseInterceptorContext<T>) => undefined | Partial<T> | Promise<Partial<T> | undefined>;
  onError?: (method: string, url: string, error: Error, body?: unknown) => void | Promise<void>;
}

/**
 * Interceptor for WebSocket delegate methods
 */
export interface WebSocketInterceptor {
  beforeConnect?: () => void | Promise<void>;
  afterConnect?: () => void | Promise<void>;
  beforeSend?: (message: unknown) => void | Promise<void>;
  afterSend?: (message: unknown) => void | Promise<void>;
  beforeClose?: () => void | Promise<void>;
  afterClose?: () => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
}

/**
 * Interceptor for Server-Sent Event delegate methods
 */
export interface ServerSentEventInterceptor {
  beforeOpen?: (options?: SseOpenOptions) => void | Promise<void>;
  afterOpen?: (options?: SseOpenOptions) => void | Promise<void>;
  beforeClose?: () => void | Promise<void>;
  afterClose?: () => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  onMessage?: (data: unknown) => void | Promise<void>;
}
