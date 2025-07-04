import { EventSource } from 'eventsource';
import type { ServerSentEventDelegate } from '../../types';

export interface CreateServerSentEventDelegateOptions {
  baseURL: string;
}

export type ServerSentEventDelegateOptions = {
  type: 'server-sent-event';
} & CreateServerSentEventDelegateOptions;

/**
 * Creates a delegate to handle Server Sent Events.
 *
 * @param options - The options to be used in the delegate.
 * @returns A delegate to handle Server Sent Events.
 */
export function createServerSentEventDelegate({ baseURL }: CreateServerSentEventDelegateOptions): ServerSentEventDelegate {
  const eventSource = new EventSource(baseURL);
  const openListeners: Set<(event: Event) => void> = new Set();
  const messageListeners: Set<(data: unknown) => void> = new Set();
  const errorListeners: Set<(event: Event) => void> = new Set();

  eventSource.onmessage = (event) => {
    for (const listener of messageListeners) {
      listener(event.data);
    }
  };

  eventSource.addEventListener('open', (event) => {
    for (const listener of openListeners) {
      listener(event);
    }
  });

  eventSource.addEventListener('message', (event) => {
    for (const listener of messageListeners) {
      listener(event.data);
    }
  });

  eventSource.addEventListener('error', (event) => {
    for (const listener of errorListeners) {
      listener(event);
    }
  });

  return {
    close() {
      eventSource.close();
    },
    onOpen(callback: (event: Event) => void) {
      openListeners.add(callback);
    },
    onError(callback: (event: Event) => void) {
      errorListeners.add(callback);
    },
    onMessage(callback: (data: unknown) => void) {
      messageListeners.add(callback);
    },
    subscribe(event: string, callback: (data: unknown) => void) {
      eventSource.addEventListener(event, (event) => callback(event.data));
    },
  };
}
