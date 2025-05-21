import type { DelegateFeature, Feature, HttpDelegate, ServerSentEventDelegate, WebSocketDelegate } from '../../../types';
import { createDelegate, type DelegateOptions } from '../../../utils';

type DelegateFromOptions<O extends DelegateOptions> = O['type'] extends 'http' ? HttpDelegate : O['type'] extends 'websocket' ? WebSocketDelegate : O['type'] extends 'server-sent-event' ? ServerSentEventDelegate : never;

/**
 * Add a delegate to the client.
 *
 * @param options - The options for the delegate.
 * @param features - The features to apply to the delegate.
 * @returns A feature that returns the delegate.
 */
export function withDelegate<const Options extends DelegateOptions & { name: string }>(options: Options, ...features: DelegateFeature[]): Feature<unknown, { [key in Options['name']]: DelegateFromOptions<Options> }>;
export function withDelegate<const Options extends DelegateOptions>(options: Options, ...features: DelegateFeature[]): Feature<unknown, { delegate: DelegateFromOptions<Options> }>;
export function withDelegate(options: DelegateOptions & { name?: string }, ...features: DelegateFeature[]): unknown {
  return (input: Record<string, unknown>) => {
    const { delegate, ...rest } = features.reduce(
      (acc, feature) => {
        const result = feature(acc);
        return Object.assign({}, acc, result);
      },
      { ...input, delegate: createDelegate(options) },
    );

    const delegateName = options.name ?? 'delegate';

    return {
      [delegateName]: delegate,
      ...rest,
    };
  };
}
