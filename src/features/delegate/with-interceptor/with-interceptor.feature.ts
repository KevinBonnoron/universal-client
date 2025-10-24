import type { DelegateFeature } from '../../../types';
import { isHttpDelegate, wrapHttpDelegate } from '../../../utils';
import type { HttpInterceptor } from '../../../utils/delegate-middleware.utils';

export interface InterceptorConfig extends HttpInterceptor {
  name?: string;
}

/**
 * Add HTTP interceptor to the delegate.
 *
 * @param config - The interceptor configuration.
 * @returns A delegate feature that wraps the HTTP delegate with the interceptor.
 */
export function withInterceptor(config: InterceptorConfig): DelegateFeature {
  return ({ delegate, ...rest }) => {
    const { name: _name, ...interceptor } = config;

    if (isHttpDelegate(delegate)) {
      return {
        ...rest,
        delegate: wrapHttpDelegate(delegate, interceptor),
      };
    }

    return { ...rest, delegate };
  };
}
