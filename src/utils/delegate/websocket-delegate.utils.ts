import type { WebSocketDelegate } from '../../types';

export interface CreateWebSocketDelegateOptions {
  baseURL: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export type WebSocketDelegateOptions = {
  type: 'websocket';
} & CreateWebSocketDelegateOptions;

/**
 * Creates a delegate to handle WebSocket requests.
 *
 * @param options - The options to be used in the delegate.
 * @returns A delegate to handle WebSocket requests.
 */
export function createWebSocketDelegate({ baseURL, protocols, reconnectInterval = 5000, maxReconnectAttempts = 10 }: CreateWebSocketDelegateOptions): WebSocketDelegate {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let reconnectAttempts = 0;
  const openListeners: Set<(event: Event) => void> = new Set();
  const messageListeners: Set<(data: unknown) => void> = new Set();
  const closeListeners: Set<(event: CloseEvent) => void> = new Set();
  const errorListeners: Set<(event: Event) => void> = new Set();

  function reconnect() {
    if (reconnectTimer !== null || reconnectAttempts >= maxReconnectAttempts) {
      return;
    }

    reconnectAttempts++;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      delegate.connect();
    }, reconnectInterval);
  }

  const delegate: WebSocketDelegate = {
    connect: () => {
      if (socket) {
        socket.close();
      }

      socket = new WebSocket(baseURL, protocols);
      socket.onopen = (event) => {
        reconnectAttempts = 0;
        for (const listener of openListeners) {
          listener(event);
        }
      };

      socket.onclose = (event) => {
        for (const listener of closeListeners) {
          listener(event);
        }
        reconnect();
      };

      socket.onerror = (event) => {
        for (const listener of errorListeners) {
          listener(event);
        }
      };

      socket.onmessage = (event) => {
        let message: unknown;
        try {
          message = JSON.parse(event.data);
        } catch (_error) {
          message = event.data;
        }

        for (const listener of messageListeners) {
          listener(message);
        }
      };
    },
    close(): void {
      if (socket) {
        socket.close();
        socket = null;
      }

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    },
    send(message: unknown): void {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        console.warn('WebSocket is not connected. Message not sent.');
      }
    },
    onOpen(callback: (event: Event) => void): () => void {
      openListeners.add(callback);
      return () => openListeners.delete(callback);
    },
    onClose(callback: (event: CloseEvent) => void): () => void {
      closeListeners.add(callback);
      return () => closeListeners.delete(callback);
    },
    onError(callback: (event: Event) => void): () => void {
      errorListeners.add(callback);
      return () => errorListeners.delete(callback);
    },
    onMessage(callback: (data: unknown) => void): () => void {
      messageListeners.add(callback);
      return () => messageListeners.delete(callback);
    },
  };

  delegate.connect();
  return delegate;
}
