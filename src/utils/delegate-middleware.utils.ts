import type { HttpDelegate, WebSocketDelegate } from '../types';

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
  before?: (context: RequestInterceptorContext) => undefined | Partial<RequestInterceptorContext> | Promise<Partial<RequestInterceptorContext> | undefined>;
  after?: <T>(context: ResponseInterceptorContext<T>) => undefined | Partial<T> | Promise<Partial<T> | undefined>;
  error?: (method: string, url: string, error: Error, body?: unknown) => void | Promise<void>;
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
        if (interceptor.before) {
          const beforeResult = await interceptor.before(context);
          if (beforeResult && typeof beforeResult === 'object') {
            context = { ...context, ...beforeResult };
          }
        }

        const finalOptions = context.headers ? { headers: context.headers } : undefined;
        let response = isGetOrDelete
          ? await (originalMethod as (url: string, options?: { headers?: Record<string, string> }) => Promise<T>)(context.url, finalOptions)
          : await (originalMethod as (url: string, body: unknown, options?: { headers?: Record<string, string> }) => Promise<T>)(context.url, context.body, finalOptions);

        // After interceptor
        if (interceptor.after) {
          const afterResult = await interceptor.after<T>({ method: methodName, url: context.url, response });
          if (afterResult && typeof afterResult === 'object') {
            response = { ...response, ...afterResult };
          }
        }

        return response;
      } catch (error) {
        if (interceptor.error) {
          await interceptor.error(methodName, context.url, error as Error, context.body);
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
