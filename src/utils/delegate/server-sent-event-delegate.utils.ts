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
export async function createServerSentEventDelegate({ baseURL }: CreateServerSentEventDelegateOptions): Promise<ServerSentEventDelegate> {
  // Use native browser EventSource
  if (typeof EventSource === 'undefined') {
    throw new Error('EventSource is not available. This delegate only works in browser environments.');
  }

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
      return () => openListeners.delete(callback);
    },
    onError(callback: (event: Event) => void) {
      errorListeners.add(callback);
      return () => errorListeners.delete(callback);
    },
    onMessage(callback: (data: unknown) => void) {
      messageListeners.add(callback);
      return () => messageListeners.delete(callback);
    },
    subscribe(event: string, callback: (data: unknown) => void) {
      const handler = (event: MessageEvent) => callback(event.data);
      eventSource.addEventListener(event, handler);
      return () => eventSource.removeEventListener(event, handler);
    },
  };
}
