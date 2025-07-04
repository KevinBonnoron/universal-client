import type { DelegateFeature, Feature, HttpDelegate, ServerSentEventDelegate, WebSocketDelegate } from '../../types';
import { type DelegateOptions, createDelegate } from '../../utils';

type DelegateFromOptions<O extends DelegateOptions> = O['type'] extends 'http' ? HttpDelegate : O['type'] extends 'websocket' ? WebSocketDelegate : O['type'] extends 'server-sent-event' ? ServerSentEventDelegate : never;

/**
 * Add a delegate to the client.
 *
 * @param options - The options for the delegate.
 * @param features - The features to apply to the delegate.
 * @returns A feature that returns the delegate.
 */
export function withDelegate<const Options extends DelegateOptions & { name: string }>(options: Options, ...features: DelegateFeature<unknown>[]): Feature<{ [key in Options['name']]: DelegateFromOptions<Options> }>;
export function withDelegate<const Options extends DelegateOptions>(options: Options, ...features: DelegateFeature<unknown>[]): Feature<{ delegate: DelegateFromOptions<Options> }>;
export function withDelegate(options: DelegateOptions & { name?: string }, ...features: DelegateFeature<unknown>[]): unknown {
  return () => {
    const { delegate, ...rest } = features.reduce(
      (acc, feature) => {
        const result = feature(acc);
        return Object.assign({}, acc, result);
      },
      { delegate: createDelegate(options) },
    );

    return {
      [options.name ?? 'delegate']: delegate,
      ...rest,
    };
  };
}
