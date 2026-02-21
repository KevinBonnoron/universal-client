import type { DelegateFeature, Feature, HttpDelegate, ServerSentEventDelegate, WebSocketDelegate } from '../../../types';
import { createDelegate, type DelegateOptions, type HttpDelegateOptions } from '../../../utils';
import type { CreateAxiosDelegateOptions, CreateBetterFetchDelegateOptions, CreateFetchDelegateOptions } from '../../../utils/delegate/http/types';
import type { CreateServerSentEventDelegateOptions } from '../../../utils/delegate/server-sent-event-delegate.utils';
import type { CreateWebSocketDelegateOptions } from '../../../utils/delegate/websocket-delegate.utils';

type DelegateFromOptions<O extends DelegateOptions> = O['type'] extends 'http' ? HttpDelegate : O['type'] extends 'websocket' ? WebSocketDelegate : O['type'] extends 'server-sent-event' ? ServerSentEventDelegate : never;

function createDelegateFeature(options: DelegateOptions & { name?: string }, ...features: DelegateFeature[]): unknown {
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
  return createDelegateFeature(options, ...features);
}

type WithNameOption = { name?: string };
type HttpDelegateShortcutOptions = Omit<HttpDelegateOptions, 'type'> & { impl: 'fetch' | 'axios' | 'better-fetch' } & WithNameOption;
type FetchDelegateShortcutOptions = Omit<CreateFetchDelegateOptions, 'type' | 'impl'> & WithNameOption;
type AxiosDelegateShortcutOptions = Omit<CreateAxiosDelegateOptions, 'type' | 'impl'> & WithNameOption;
type BetterFetchDelegateShortcutOptions = Omit<CreateBetterFetchDelegateOptions, 'type' | 'impl'> & WithNameOption;
type SseDelegateShortcutOptions = CreateServerSentEventDelegateOptions & WithNameOption;
type WebSocketDelegateShortcutOptions = CreateWebSocketDelegateOptions & WithNameOption;

export function withHttpDelegate<const Options extends HttpDelegateShortcutOptions & { name: string }>(options: Options, ...features: DelegateFeature[]): Feature<unknown, { [key in Options['name']]: HttpDelegate }>;
export function withHttpDelegate(options: HttpDelegateShortcutOptions, ...features: DelegateFeature[]): Feature<unknown, { delegate: HttpDelegate }>;
export function withHttpDelegate(options: HttpDelegateShortcutOptions, ...features: DelegateFeature[]): unknown {
  return createDelegateFeature({ ...options, type: 'http' } as HttpDelegateOptions & WithNameOption, ...features);
}

export function withFetchDelegate<const Options extends FetchDelegateShortcutOptions & { name: string }>(options: Options, ...features: DelegateFeature[]): Feature<unknown, { [key in Options['name']]: HttpDelegate }>;
export function withFetchDelegate(options: FetchDelegateShortcutOptions, ...features: DelegateFeature[]): Feature<unknown, { delegate: HttpDelegate }>;
export function withFetchDelegate(options: FetchDelegateShortcutOptions, ...features: DelegateFeature[]): unknown {
  return createDelegateFeature({ ...options, type: 'http' }, ...features);
}

export function withAxiosDelegate<const Options extends AxiosDelegateShortcutOptions & { name: string }>(options: Options, ...features: DelegateFeature[]): Feature<unknown, { [key in Options['name']]: HttpDelegate }>;
export function withAxiosDelegate(options: AxiosDelegateShortcutOptions, ...features: DelegateFeature[]): Feature<unknown, { delegate: HttpDelegate }>;
export function withAxiosDelegate(options: AxiosDelegateShortcutOptions, ...features: DelegateFeature[]): unknown {
  return createDelegateFeature({ ...options, type: 'http', impl: 'axios' } as CreateAxiosDelegateOptions & WithNameOption, ...features);
}

export function withBetterFetchDelegate<const Options extends BetterFetchDelegateShortcutOptions & { name: string }>(options: Options, ...features: DelegateFeature[]): Feature<unknown, { [key in Options['name']]: HttpDelegate }>;
export function withBetterFetchDelegate(options: BetterFetchDelegateShortcutOptions, ...features: DelegateFeature[]): Feature<unknown, { delegate: HttpDelegate }>;
export function withBetterFetchDelegate(options: BetterFetchDelegateShortcutOptions, ...features: DelegateFeature[]): unknown {
  return createDelegateFeature({ ...options, type: 'http', impl: 'better-fetch' } as CreateBetterFetchDelegateOptions & WithNameOption, ...features);
}

export function withSseDelegate<const Options extends SseDelegateShortcutOptions & { name: string }>(options: Options, ...features: DelegateFeature[]): Feature<unknown, { [key in Options['name']]: ServerSentEventDelegate }>;
export function withSseDelegate(options: SseDelegateShortcutOptions, ...features: DelegateFeature[]): Feature<unknown, { delegate: ServerSentEventDelegate }>;
export function withSseDelegate(options: SseDelegateShortcutOptions, ...features: DelegateFeature[]): unknown {
  return createDelegateFeature({ ...options, type: 'server-sent-event' }, ...features);
}

export function withWebSocketDelegate<const Options extends WebSocketDelegateShortcutOptions & { name: string }>(options: Options, ...features: DelegateFeature[]): Feature<unknown, { [key in Options['name']]: WebSocketDelegate }>;
export function withWebSocketDelegate(options: WebSocketDelegateShortcutOptions, ...features: DelegateFeature[]): Feature<unknown, { delegate: WebSocketDelegate }>;
export function withWebSocketDelegate(options: WebSocketDelegateShortcutOptions, ...features: DelegateFeature[]): unknown {
  return createDelegateFeature({ ...options, type: 'websocket' }, ...features);
}
