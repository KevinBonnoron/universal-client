import type { DelegateFeature, Feature, HttpDelegate, ServerSentEventDelegate, WebSocketDelegate } from '../../../types';
import { createDelegate, type DelegateOptions, type HttpDelegateOptions } from '../../../utils';
import type { CreateAxiosDelegateOptions, CreateBetterFetchDelegateOptions } from '../../../utils/delegate/http/types';
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

type HttpDelegateShortcutOptions = Omit<HttpDelegateOptions, 'type' | 'baseURL'> & { impl: 'fetch' | 'axios' | 'better-fetch'; name?: string };
type AxiosDelegateShortcutOptions = Omit<CreateAxiosDelegateOptions, 'type' | 'impl' | 'baseURL'> & { name?: string };
type BetterFetchDelegateShortcutOptions = Omit<CreateBetterFetchDelegateOptions, 'type' | 'impl' | 'baseURL'> & { name?: string };
type WebSocketDelegateShortcutOptions = Omit<CreateWebSocketDelegateOptions, 'baseURL'> & { name?: string };

function resolveArgs<O extends { name?: string }>(nameOrOptionsOrFeature: string | O | DelegateFeature | undefined, features: DelegateFeature[]): { options: O; allFeatures: DelegateFeature[] } {
  if (typeof nameOrOptionsOrFeature === 'string') {
    return { options: { name: nameOrOptionsOrFeature } as O, allFeatures: features };
  }
  if (typeof nameOrOptionsOrFeature === 'function') {
    return { options: {} as O, allFeatures: [nameOrOptionsOrFeature as DelegateFeature, ...features] };
  }
  if (nameOrOptionsOrFeature !== undefined) {
    return { options: nameOrOptionsOrFeature as O, allFeatures: features };
  }
  return { options: {} as O, allFeatures: features };
}

export function withHttpDelegate<const Name extends string>(baseURL: string, options: HttpDelegateShortcutOptions & { name: Name }, ...features: DelegateFeature[]): Feature<unknown, { [key in Name]: HttpDelegate }>;
export function withHttpDelegate(baseURL: string, options: HttpDelegateShortcutOptions, ...features: DelegateFeature[]): Feature<unknown, { delegate: HttpDelegate }>;
export function withHttpDelegate(baseURL: string, options: HttpDelegateShortcutOptions, ...features: DelegateFeature[]): unknown {
  return createDelegateFeature({ ...options, baseURL, type: 'http' } as HttpDelegateOptions & { name?: string }, ...features);
}

export function withFetchDelegate<const Name extends string>(baseURL: string, name: Name, ...features: DelegateFeature[]): Feature<unknown, { [key in Name]: HttpDelegate }>;
export function withFetchDelegate(baseURL: string, ...features: DelegateFeature[]): Feature<unknown, { delegate: HttpDelegate }>;
export function withFetchDelegate(baseURL: string, nameOrFeature?: string | DelegateFeature, ...features: DelegateFeature[]): unknown {
  const { options, allFeatures } = resolveArgs(nameOrFeature, features);
  return createDelegateFeature({ ...options, baseURL, type: 'http' }, ...allFeatures);
}

export function withAxiosDelegate<const Name extends string>(baseURL: string, name: Name, ...features: DelegateFeature[]): Feature<unknown, { [key in Name]: HttpDelegate }>;
export function withAxiosDelegate<const Name extends string>(baseURL: string, options: AxiosDelegateShortcutOptions & { name: Name }, ...features: DelegateFeature[]): Feature<unknown, { [key in Name]: HttpDelegate }>;
export function withAxiosDelegate(baseURL: string, ...features: DelegateFeature[]): Feature<unknown, { delegate: HttpDelegate }>;
export function withAxiosDelegate(baseURL: string, nameOrOptionsOrFeature?: string | AxiosDelegateShortcutOptions | DelegateFeature, ...features: DelegateFeature[]): unknown {
  const { options, allFeatures } = resolveArgs(nameOrOptionsOrFeature, features);
  return createDelegateFeature({ ...options, baseURL, type: 'http', impl: 'axios' } as CreateAxiosDelegateOptions & { name?: string }, ...allFeatures);
}

export function withBetterFetchDelegate<const Name extends string>(baseURL: string, name: Name, ...features: DelegateFeature[]): Feature<unknown, { [key in Name]: HttpDelegate }>;
export function withBetterFetchDelegate<const Name extends string>(baseURL: string, options: BetterFetchDelegateShortcutOptions & { name: Name }, ...features: DelegateFeature[]): Feature<unknown, { [key in Name]: HttpDelegate }>;
export function withBetterFetchDelegate(baseURL: string, ...features: DelegateFeature[]): Feature<unknown, { delegate: HttpDelegate }>;
export function withBetterFetchDelegate(baseURL: string, nameOrOptionsOrFeature?: string | BetterFetchDelegateShortcutOptions | DelegateFeature, ...features: DelegateFeature[]): unknown {
  const { options, allFeatures } = resolveArgs(nameOrOptionsOrFeature, features);
  return createDelegateFeature({ ...options, baseURL, type: 'http', impl: 'better-fetch' } as CreateBetterFetchDelegateOptions & { name?: string }, ...allFeatures);
}

export function withSseDelegate<const Name extends string>(baseURL: string, name: Name, ...features: DelegateFeature[]): Feature<unknown, { [key in Name]: ServerSentEventDelegate }>;
export function withSseDelegate(baseURL: string, ...features: DelegateFeature[]): Feature<unknown, { delegate: ServerSentEventDelegate }>;
export function withSseDelegate(baseURL: string, nameOrFeature?: string | DelegateFeature, ...features: DelegateFeature[]): unknown {
  const { options, allFeatures } = resolveArgs(nameOrFeature, features);
  return createDelegateFeature({ ...options, baseURL, type: 'server-sent-event' }, ...allFeatures);
}

export function withWebSocketDelegate<const Name extends string>(baseURL: string, name: Name, ...features: DelegateFeature[]): Feature<unknown, { [key in Name]: WebSocketDelegate }>;
export function withWebSocketDelegate<const Name extends string>(baseURL: string, options: WebSocketDelegateShortcutOptions & { name: Name }, ...features: DelegateFeature[]): Feature<unknown, { [key in Name]: WebSocketDelegate }>;
export function withWebSocketDelegate(baseURL: string, ...features: DelegateFeature[]): Feature<unknown, { delegate: WebSocketDelegate }>;
export function withWebSocketDelegate(baseURL: string, nameOrOptionsOrFeature?: string | WebSocketDelegateShortcutOptions | DelegateFeature, ...features: DelegateFeature[]): unknown {
  const { options, allFeatures } = resolveArgs(nameOrOptionsOrFeature, features);
  return createDelegateFeature({ ...options, baseURL, type: 'websocket' }, ...allFeatures);
}
