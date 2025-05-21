import type { Delegate, HttpDelegate, ServerSentEventDelegate, WebSocketDelegate } from '../types';
import { createHttpDelegate, createServerSentEventDelegate, createWebSocketDelegate, type HttpDelegateOptions, type ServerSentEventDelegateOptions, type WebSocketDelegateOptions } from './delegate';

export function isHttpDelegate(delegate: unknown): delegate is HttpDelegate {
  return typeof delegate === 'object' && delegate !== null && 'get' in delegate && 'post' in delegate && 'patch' in delegate && 'put' in delegate && 'delete' in delegate;
}

export function isWebSocketDelegate(delegate: unknown): delegate is WebSocketDelegate {
  return typeof delegate === 'object' && delegate !== null && 'connect' in delegate && 'send' in delegate && 'close' in delegate;
}

export function isServerSentEventDelegate(delegate: unknown): delegate is ServerSentEventDelegate {
  return typeof delegate === 'object' && delegate !== null && 'onMessage' in delegate && 'onError' in delegate && 'onOpen' in delegate && 'subscribe' in delegate;
}

export function isDelegate(delegate: unknown): delegate is Delegate {
  return isHttpDelegate(delegate) || isWebSocketDelegate(delegate) || isServerSentEventDelegate(delegate);
}

export type DelegateOptions = HttpDelegateOptions | WebSocketDelegateOptions | ServerSentEventDelegateOptions;

const isDelegateOptions = (value: unknown): value is DelegateOptions => {
  return typeof value === 'object' && value !== null && 'type' in value;
};

export function createDelegate(delegateOrOptions: Delegate | DelegateOptions): Delegate {
  if (isDelegateOptions(delegateOrOptions)) {
    if (delegateOrOptions.type === 'http') {
      return createLazyHttpDelegate(delegateOrOptions);
    }

    if (delegateOrOptions.type === 'websocket') {
      return createWebSocketDelegate(delegateOrOptions);
    }

    if (delegateOrOptions.type === 'server-sent-event') {
      return createLazyServerSentEventDelegate(delegateOrOptions);
    }

    throw new Error('Unsupported delegate type');
  }

  return delegateOrOptions;
}

function createLazyHttpDelegate(options: HttpDelegateOptions): HttpDelegate {
  let delegatePromise: Promise<HttpDelegate> | null = null;

  const ensureDelegate = () => {
    if (!delegatePromise) {
      delegatePromise = createHttpDelegate(options);
    }
    return delegatePromise;
  };

  return {
    async get<T>(url: string, requestOptions?: Record<string, unknown>): Promise<T> {
      const d = await ensureDelegate();
      return d.get<T>(url, requestOptions);
    },
    async post<T>(url: string, body: unknown, requestOptions?: Record<string, unknown>): Promise<T> {
      const d = await ensureDelegate();
      return d.post<T>(url, body, requestOptions);
    },
    async patch<T>(url: string, body: unknown, requestOptions?: Record<string, unknown>): Promise<T> {
      const d = await ensureDelegate();
      return d.patch<T>(url, body, requestOptions);
    },
    async put<T>(url: string, body: unknown, requestOptions?: Record<string, unknown>): Promise<T> {
      const d = await ensureDelegate();
      return d.put<T>(url, body, requestOptions);
    },
    async delete<T>(url: string, requestOptions?: Record<string, unknown>): Promise<T> {
      const d = await ensureDelegate();
      return d.delete<T>(url, requestOptions);
    },
  };
}

function createLazyServerSentEventDelegate(options: ServerSentEventDelegateOptions): ServerSentEventDelegate {
  let delegatePromise: Promise<ServerSentEventDelegate> | null = null;

  const ensureDelegate = () => {
    if (!delegatePromise) {
      delegatePromise = createServerSentEventDelegate(options);
    }
    return delegatePromise;
  };

  return {
    close(): void {
      if (delegatePromise) {
        delegatePromise.then((d) => d.close()).catch(console.error);
      }
    },
    onOpen(callback: (event: Event) => void): () => void {
      let unsubscribe: (() => void) | null = null;
      ensureDelegate()
        .then((d) => {
          unsubscribe = d.onOpen(callback);
        })
        .catch((error) => console.error('[SSE] Failed to attach onOpen handler:', error));
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    },
    onError(callback: (event: Event) => void): () => void {
      let unsubscribe: (() => void) | null = null;
      ensureDelegate()
        .then((d) => {
          unsubscribe = d.onError(callback);
        })
        .catch((error) => console.error('[SSE] Failed to attach onError handler:', error));
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    },
    onMessage(callback: (data: unknown) => void): () => void {
      let unsubscribe: (() => void) | null = null;
      ensureDelegate()
        .then((d) => {
          unsubscribe = d.onMessage(callback);
        })
        .catch((error) => console.error('[SSE] Failed to attach onMessage handler:', error));
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    },
    subscribe(event: string, callback: (data: unknown) => void): () => void {
      let unsubscribe: (() => void) | null = null;
      ensureDelegate()
        .then((d) => {
          unsubscribe = d.subscribe(event, callback);
        })
        .catch((error) => console.error(`[SSE] Failed to subscribe to event "${event}":`, error));
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    },
  };
}
