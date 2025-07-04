import type { Delegate, HttpDelegate, ServerSentEventDelegate, WebSocketDelegate } from '../types';
import type { HttpDelegateOptions } from './delegate/http/http-delegate.utils';
import { createHttpDelegate } from './delegate/http/http-delegate.utils';
import type { ServerSentEventDelegateOptions } from './delegate/server-sent-event-delegate.utils';
import { createServerSentEventDelegate } from './delegate/server-sent-event-delegate.utils';
import { type WebSocketDelegateOptions, createWebSocketDelegate } from './delegate/websocket-delegate.utils';

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

export type DelegateOptions<Name extends string = 'delegate'> = (HttpDelegateOptions | WebSocketDelegateOptions | ServerSentEventDelegateOptions) & { name: Name };

const isDelegateOptions = (value: unknown): value is DelegateOptions => {
  return typeof value === 'object' && value !== null && 'type' in value;
};

export function createDelegate(delegateOrOptions: Delegate | DelegateOptions): Delegate {
  if (isDelegateOptions(delegateOrOptions)) {
    if (delegateOrOptions.type === 'http') {
      return createHttpDelegate(delegateOrOptions);
    }

    if (delegateOrOptions.type === 'websocket') {
      return createWebSocketDelegate(delegateOrOptions);
    }

    if (delegateOrOptions.type === 'server-sent-event') {
      return createServerSentEventDelegate(delegateOrOptions);
    }

    throw new Error('Unsupported delegate type');
  }

  return delegateOrOptions;
}
