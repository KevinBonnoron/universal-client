import type { Delegate, HttpDelegate, ServerSentEventDelegate, WebSocketDelegate } from '../types';
import { type HttpDelegateOptions, type ServerSentEventDelegateOptions, type WebSocketDelegateOptions, createHttpDelegate, createServerSentEventDelegate, createWebSocketDelegate } from './delegate';

export function isHttpDelegate(delegate: unknown): delegate is HttpDelegate {
  return typeof delegate === 'object' && delegate !== null && 'get' in delegate && 'post' in delegate && 'patch' in delegate && 'put' in delegate && 'delete' in delegate;
}

export function isWebSocketDelegate(delegate: unknown): delegate is WebSocketDelegate {
  return typeof delegate === 'object' && delegate !== null && 'connect' in delegate && 'send' in delegate && 'close' in delegate;
}

export function isServerSentEventDelegate(delegate: unknown): delegate is ServerSentEventDelegate {
  return typeof delegate === 'object' && delegate !== null && 'onMessage' in delegate && 'onError' in delegate && 'onOpen' in delegate && 'onClose' in delegate;
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
  let delegate: HttpDelegate | null = null;
  let loading = false;
  let error: Error | null = null;

  const ensureDelegate = async () => {
    if (delegate) {
      return delegate;
    }
    if (error) {
      throw error;
    }
    if (loading) {
      // Attendre que le chargement soit terminé
      while (loading) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      if (error) {
        throw error;
      }
      return delegate as unknown as HttpDelegate;
    }

    loading = true;
    try {
      delegate = await createHttpDelegate(options);
    } catch (err) {
      error = err as Error;
      throw error;
    } finally {
      loading = false;
    }
    return delegate;
  };

  return {
    async get<T>(url: string): Promise<T> {
      const d = await ensureDelegate();
      return d.get<T>(url);
    },
    async post<T>(url: string, body: unknown): Promise<T> {
      const d = await ensureDelegate();
      return d.post<T>(url, body);
    },
    async patch<T>(url: string, body: unknown): Promise<T> {
      const d = await ensureDelegate();
      return d.patch<T>(url, body);
    },
    async put<T>(url: string, body: unknown): Promise<T> {
      const d = await ensureDelegate();
      return d.put<T>(url, body);
    },
    async delete<T>(url: string): Promise<T> {
      const d = await ensureDelegate();
      return d.delete<T>(url);
    },
  };
}

function createLazyServerSentEventDelegate(options: ServerSentEventDelegateOptions): ServerSentEventDelegate {
  let delegate: ServerSentEventDelegate | null = null;
  let loading = false;
  let error: Error | null = null;

  const ensureDelegate = async () => {
    if (delegate) {
      return delegate;
    }
    if (error) {
      throw error;
    }
    if (loading) {
      // Attendre que le chargement soit terminé
      while (loading) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      if (error) {
        throw error;
      }
      return delegate as unknown as ServerSentEventDelegate;
    }

    loading = true;
    try {
      delegate = await createServerSentEventDelegate(options);
    } catch (err) {
      error = err as Error;
      throw error;
    } finally {
      loading = false;
    }
    return delegate;
  };

  return {
    close(): void {
      if (delegate) {
        delegate.close();
      }
    },
    onOpen(callback: (event: Event) => void): void {
      ensureDelegate()
        .then((d) => d.onOpen(callback))
        .catch(console.error);
    },
    onError(callback: (event: Event) => void): void {
      ensureDelegate()
        .then((d) => d.onError(callback))
        .catch(console.error);
    },
    onMessage(callback: (data: unknown) => void): void {
      ensureDelegate()
        .then((d) => d.onMessage(callback))
        .catch(console.error);
    },
    subscribe(event: string, callback: (data: unknown) => void): void {
      ensureDelegate()
        .then((d) => d.subscribe(event, callback))
        .catch(console.error);
    },
  };
}
