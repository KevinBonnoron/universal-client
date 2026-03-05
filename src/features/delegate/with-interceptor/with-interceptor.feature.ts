import type { DelegateFeature, HttpInterceptor, ServerSentEventInterceptor, WebSocketInterceptor } from '../../../types';
import { isHttpDelegate, isServerSentEventDelegate, isWebSocketDelegate, wrapHttpDelegate, wrapServerSentEventDelegate, wrapWebSocketDelegate } from '../../../utils';

export type InterceptorConfig = HttpInterceptor | ServerSentEventInterceptor | WebSocketInterceptor;

/**
 * Add interceptor to the delegate.
 *
 * @param config - The interceptor configuration.
 * @returns A delegate feature that wraps the delegate with the interceptor.
 */
export function withInterceptor(config: InterceptorConfig): DelegateFeature {
  return ({ delegate, ...rest }) => {
    if (isHttpDelegate(delegate)) {
      return {
        ...rest,
        delegate: wrapHttpDelegate(delegate, config as HttpInterceptor),
      };
    }

    if (isServerSentEventDelegate(delegate)) {
      return {
        ...rest,
        delegate: wrapServerSentEventDelegate(delegate, config as ServerSentEventInterceptor),
      };
    }

    if (isWebSocketDelegate(delegate)) {
      return {
        ...rest,
        delegate: wrapWebSocketDelegate(delegate, config as WebSocketInterceptor),
      };
    }

    return { ...rest, delegate };
  };
}
