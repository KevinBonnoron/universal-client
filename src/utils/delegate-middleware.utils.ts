import type { HttpDelegate, HttpInterceptor, RequestInterceptorContext, ServerSentEventDelegate, ServerSentEventInterceptor, SseOpenOptions, WebSocketDelegate, WebSocketInterceptor } from '../types';

/**
 * Wraps an HTTP delegate with interceptors for all methods
 */
export function wrapHttpDelegate(delegate: HttpDelegate, interceptor: HttpInterceptor): HttpDelegate {
  const wrapMethod = (methodName: 'get' | 'post' | 'patch' | 'put' | 'delete') => {
    const originalMethod = delegate[methodName];

    return async <T>(url: string, bodyOrOptions?: unknown, optionsArg?: unknown): Promise<T> => {
      // Handle overloaded signatures: (url) or (url, body) or (url, options) or (url, body, options)
      const isGetOrDelete = methodName === 'get' || methodName === 'delete';
      const body = isGetOrDelete ? undefined : bodyOrOptions;
      const options = isGetOrDelete ? (bodyOrOptions as { headers?: Record<string, string> }) : (optionsArg as { headers?: Record<string, string> });

      let context: RequestInterceptorContext = { method: methodName, url, headers: options?.headers ?? {}, body };
      try {
        if (interceptor.onBeforeRequest) {
          const beforeResult = await interceptor.onBeforeRequest(context);
          if (beforeResult && typeof beforeResult === 'object') {
            context = { ...context, ...beforeResult };
          }
        }

        const finalOptions = { ...options, headers: context.headers };
        let response = isGetOrDelete
          ? await (originalMethod as (url: string, options?: { headers?: Record<string, string> }) => Promise<T>)(context.url, finalOptions)
          : await (originalMethod as (url: string, body: unknown, options?: { headers?: Record<string, string> }) => Promise<T>)(context.url, context.body, finalOptions);

        // After interceptor
        if (interceptor.onAfterResponse) {
          const afterResult = await interceptor.onAfterResponse<T>({ method: methodName, url: context.url, response });
          if (afterResult && typeof afterResult === 'object') {
            response = { ...response, ...afterResult };
          }
        }

        return response;
      } catch (error) {
        if (interceptor.onError) {
          await interceptor.onError(methodName, context.url, error as Error, context.body);
        }

        throw error;
      }
    };
  };

  return {
    get: wrapMethod('get') as <T>(url: string, options?: { headers?: Record<string, string> }) => Promise<T>,
    post: wrapMethod('post') as <T>(url: string, body: unknown, options?: { headers?: Record<string, string> }) => Promise<T>,
    patch: wrapMethod('patch') as <T>(url: string, body: unknown, options?: { headers?: Record<string, string> }) => Promise<T>,
    put: wrapMethod('put') as <T>(url: string, body: unknown, options?: { headers?: Record<string, string> }) => Promise<T>,
    delete: wrapMethod('delete') as <T>(url: string, options?: { headers?: Record<string, string> }) => Promise<T>,
  };
}

/**
 * Wraps a WebSocket delegate with interceptors for connect, send, and close
 */
export function wrapWebSocketDelegate(delegate: WebSocketDelegate, interceptor: WebSocketInterceptor): WebSocketDelegate {
  return {
    ...delegate,
    connect: () => {
      if (interceptor.beforeConnect) {
        Promise.resolve(interceptor.beforeConnect()).catch(console.error);
      }

      delegate.connect();

      if (interceptor.afterConnect) {
        Promise.resolve(interceptor.afterConnect()).catch(console.error);
      }
    },

    send: (message: unknown) => {
      if (interceptor.beforeSend) {
        Promise.resolve(interceptor.beforeSend(message)).catch(console.error);
      }

      delegate.send(message);

      if (interceptor.afterSend) {
        Promise.resolve(interceptor.afterSend(message)).catch(console.error);
      }
    },

    close: () => {
      if (interceptor.beforeClose) {
        Promise.resolve(interceptor.beforeClose()).catch(console.error);
      }

      delegate.close();

      if (interceptor.afterClose) {
        Promise.resolve(interceptor.afterClose()).catch(console.error);
      }
    },
  };
}

/**
 * Wraps a Server-Sent Event delegate with interceptors for open, close, onError, and onMessage
 */
export function wrapServerSentEventDelegate(delegate: ServerSentEventDelegate, interceptor: ServerSentEventInterceptor): ServerSentEventDelegate {
  return {
    ...delegate,
    open: (options?: SseOpenOptions) => {
      if (interceptor.beforeOpen) {
        Promise.resolve(interceptor.beforeOpen(options)).catch(console.error);
      }

      delegate.open(options);

      if (interceptor.afterOpen) {
        Promise.resolve(interceptor.afterOpen(options)).catch(console.error);
      }
    },

    close: () => {
      if (interceptor.beforeClose) {
        Promise.resolve(interceptor.beforeClose()).catch(console.error);
      }

      delegate.close();

      if (interceptor.afterClose) {
        Promise.resolve(interceptor.afterClose()).catch(console.error);
      }
    },

    onError: (callback: (event: Event) => void) => {
      return delegate.onError((event: Event) => {
        if (interceptor.onError) {
          Promise.resolve(interceptor.onError(new Error(event.type))).catch(console.error);
        }
        callback(event);
      });
    },

    onMessage: (callback: (data: unknown) => void) => {
      return delegate.onMessage((data: unknown) => {
        if (interceptor.onMessage) {
          Promise.resolve(interceptor.onMessage(data)).catch(console.error);
        }
        callback(data);
      });
    },
  };
}
