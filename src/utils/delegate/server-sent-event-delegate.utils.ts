import type { ServerSentEventDelegate, SseOpenOptions } from '../../types';

export interface CreateServerSentEventDelegateOptions {
  baseURL: string;
}

export type ServerSentEventDelegateOptions = {
  type: 'server-sent-event';
} & CreateServerSentEventDelegateOptions;

/**
 * Creates a delegate to handle Server Sent Events.
 * Supports both GET (via EventSource) and POST (via fetch + ReadableStream) connections.
 * The delegate does not connect automatically — call `open()` to start the connection.
 *
 * @param options - The options to be used in the delegate.
 * @returns A delegate to handle Server Sent Events.
 */
export async function createServerSentEventDelegate({ baseURL }: CreateServerSentEventDelegateOptions): Promise<ServerSentEventDelegate> {
  const openListeners: Set<(event: Event) => void> = new Set();
  const messageListeners: Set<(data: unknown) => void> = new Set();
  const errorListeners: Set<(event: Event) => void> = new Set();
  const eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();

  let eventSource: EventSource | null = null;
  let abortController: AbortController | null = null;

  function closeExisting(): void {
    if (eventSource) {
      eventSource.close();
      eventSource = null;

      openListeners.clear();
      messageListeners.clear();
      errorListeners.clear();
      eventListeners.clear();
    }

    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  function dispatchSseEvent(eventType: string, dataLines: string[]): void {
    const data = dataLines.join('\n');

    if (eventType === '' || eventType === 'message') {
      for (const listener of messageListeners) {
        listener(data);
      }
    }

    if (eventType !== '' && eventType !== 'message') {
      const callbacks = eventListeners.get(eventType);
      if (callbacks) {
        for (const callback of callbacks) {
          callback(data);
        }
      }
    }
  }

  async function readSseStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventType = '';
    let dataLines: string[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (dataLines.length > 0) {
            dispatchSseEvent(eventType, dataLines);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const cleanLine = line.endsWith('\r') ? line.slice(0, -1) : line;

          if (cleanLine === '') {
            if (dataLines.length > 0) {
              dispatchSseEvent(eventType, dataLines);
              eventType = '';
              dataLines = [];
            }
            continue;
          }

          if (cleanLine.startsWith(':')) {
            continue;
          }

          const colonIndex = cleanLine.indexOf(':');
          let field: string;
          let fieldValue: string;

          if (colonIndex === -1) {
            field = cleanLine;
            fieldValue = '';
          } else {
            field = cleanLine.slice(0, colonIndex);
            fieldValue = cleanLine[colonIndex + 1] === ' ' ? cleanLine.slice(colonIndex + 2) : cleanLine.slice(colonIndex + 1);
          }

          switch (field) {
            case 'data':
              dataLines.push(fieldValue);
              break;
            case 'event':
              eventType = fieldValue;
              break;
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      const errorEvent = new Event('error');
      for (const listener of errorListeners) {
        listener(errorEvent);
      }
    }
  }

  return {
    open(options?: SseOpenOptions): void {
      closeExisting();

      const url = options?.url ?? baseURL;
      const method = options?.method ?? 'GET';

      if (method === 'GET') {
        if (typeof EventSource === 'undefined') {
          throw new Error('EventSource is not available. This delegate only works in browser environments.');
        }

        eventSource = new EventSource(url);

        eventSource.addEventListener('open', (event) => {
          for (const listener of openListeners) {
            listener(event);
          }
        });

        eventSource.addEventListener('error', (event) => {
          for (const listener of errorListeners) {
            listener(event);
          }
        });

        eventSource.addEventListener('message', (event) => {
          for (const listener of messageListeners) {
            listener(event.data);
          }
        });

        for (const [eventName, callbacks] of eventListeners) {
          for (const callback of callbacks) {
            const handler = (e: MessageEvent) => callback(e.data);
            eventSource.addEventListener(eventName, handler as EventListener);
          }
        }
      } else {
        abortController = new AbortController();

        const requestInit: RequestInit = {
          method,
          headers: {
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          signal: abortController.signal,
        };

        if (options?.body !== undefined) {
          requestInit.body = JSON.stringify(options.body);
        }

        fetch(url, requestInit)
          .then((response) => {
            if (!response.ok) {
              const errorEvent = new Event('error');
              for (const listener of errorListeners) {
                listener(errorEvent);
              }
              return;
            }

            if (!response.body) {
              const errorEvent = new Event('error');
              for (const listener of errorListeners) {
                listener(errorEvent);
              }
              return;
            }

            const openEvent = new Event('open');
            for (const listener of openListeners) {
              listener(openEvent);
            }

            readSseStream(response.body);
          })
          .catch((error) => {
            if (error instanceof DOMException && error.name === 'AbortError') {
              return;
            }
            const errorEvent = new Event('error');
            for (const listener of errorListeners) {
              listener(errorEvent);
            }
          });
      }
    },

    close(): void {
      closeExisting();
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
      let callbacks = eventListeners.get(event);
      if (!callbacks) {
        callbacks = new Set();
        eventListeners.set(event, callbacks);
      }
      callbacks.add(callback);

      if (eventSource) {
        const handler = (e: MessageEvent) => callback(e.data);
        eventSource.addEventListener(event, handler as EventListener);
        return () => {
          callbacks.delete(callback);
          if (eventSource) {
            eventSource.removeEventListener(event, handler as EventListener);
          }
        };
      }

      return () => {
        callbacks.delete(callback);
      };
    },
  };
}
