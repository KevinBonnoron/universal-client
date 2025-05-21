# WebSocket Example

This example demonstrates how to use Universal Client with WebSocket transport for real-time communication using TypeScript.

## Overview

Learn how to:
- Create a client with WebSocket delegate
- Establish WebSocket connections
- Send and receive messages with proper typing
- Handle connection events
- Manage connection lifecycle

## Type Definitions

Define types for WebSocket messages:

```typescript
interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: number;
}

interface ChatMessage extends WebSocketMessage {
  type: 'chat';
  data: {
    user: string;
    message: string;
  };
}

interface SystemMessage extends WebSocketMessage {
  type: 'system';
  data: {
    event: string;
    details?: unknown;
  };
}

type Message = ChatMessage | SystemMessage;
```

## Client Setup

Create a Universal Client with WebSocket delegate:

```typescript
import { universalClient, withDelegate, withMethods } from 'universal-client';

const wsClient = universalClient(
  withDelegate({
    type: 'websocket',
    url: 'wss://echo.websocket.org'  // Public echo server for testing
  }),
  withMethods(({ delegate }) => ({
    // Connection management
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),

    // Message sending
    sendMessage: (message: string) => {
      delegate.send(JSON.stringify({
        type: 'chat',
        data: { message },
        timestamp: Date.now()
      }));
    },

    sendTypedMessage: (message: Message) => {
      delegate.send(JSON.stringify(message));
    },

    // Event listeners
    onMessage: (callback: (data: unknown) => void) => {
      return delegate.onMessage(callback);
    },

    onError: (callback: (event: Event) => void) => {
      return delegate.onError(callback);
    }
  })),
);
```

## Usage Examples

### 1. Basic Connection and Messaging

```typescript
async function basicWebSocketExample(): Promise<void> {
  console.log('🔌 Connecting to WebSocket server...');

  // Set up message listener (returns unsubscribe function)
  const unsubscribe = wsClient.onMessage((data) => {
    try {
      const message: Message = JSON.parse(data as string);
      console.log('📨 Received:', message);
    } catch (error) {
      console.log('📨 Raw message:', data);
    }
  });

  // Connect to server
  wsClient.connect();

  // Wait a bit for connection
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Send messages
  wsClient.sendMessage('Hello, WebSocket!');
  wsClient.sendTypedMessage({
    type: 'system',
    data: {
      event: 'user_joined',
      details: { userId: 123 }
    }
  });

  // Later: cleanup
  // unsubscribe();
  // wsClient.disconnect();
}
```

### 2. Real-time Chat Implementation

```typescript
import { universalClient, withDelegate, withMethods } from 'universal-client';

interface ChatUser {
  id: string;
  name: string;
}

const chatClient = universalClient(
  withDelegate({
    type: 'websocket',
    url: 'wss://your-chat-server.com'
  }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),

    sendChatMessage: (user: ChatUser, message: string) => {
      delegate.send(JSON.stringify({
        type: 'chat',
        data: {
          userId: user.id,
          userName: user.name,
          message,
          timestamp: Date.now()
        }
      }));
    },

    joinRoom: (roomId: string, user: ChatUser) => {
      delegate.send(JSON.stringify({
        type: 'join',
        data: { roomId, user }
      }));
    },

    leaveRoom: (roomId: string) => {
      delegate.send(JSON.stringify({
        type: 'leave',
        data: { roomId }
      }));
    },

    onMessage: (callback: (data: unknown) => void) => {
      return delegate.onMessage(callback);
    },

    onError: (callback: (event: Event) => void) => {
      return delegate.onError(callback);
    }
  })),
);

// Usage
const user: ChatUser = { id: '123', name: 'John' };

chatClient.connect();

const unsubMessage = chatClient.onMessage((data) => {
  const message = JSON.parse(data as string);
  console.log(`${message.data.userName}: ${message.data.message}`);
});

chatClient.joinRoom('general', user);
chatClient.sendChatMessage(user, 'Hello everyone!');

// Cleanup
// unsubMessage();
// chatClient.disconnect();
```

### 3. With Telemetry

Track WebSocket activity:

```typescript
import { universalClient, withDelegate, withTelemetry, withMethods } from 'universal-client';

const monitoredWsClient = universalClient(
  withDelegate({
    type: 'websocket',
    url: 'wss://echo.websocket.org'
  }),
  withTelemetry({
    enableLogging: true,
    enableMetrics: true,
    onEvent: (event) => {
      console.log('Telemetry:', event);
    }
  }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),
    send: (message: string) => delegate.send(message),
    onMessage: (callback: (data: unknown) => void) => delegate.onMessage(callback)
  })),
);

// All WebSocket operations will be tracked
monitoredWsClient.connect();
monitoredWsClient.send('test');

// Check telemetry
const metrics = monitoredWsClient.telemetry.getMetrics();
console.log('Metrics:', metrics);
```

### 4. Connection Monitoring

```typescript
class WebSocketManager {
  private client: typeof wsClient;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(client: typeof wsClient) {
    this.client = client;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.onError((event) => {
      console.error('❌ WebSocket error:', event);
      this.attemptReconnect();
    });

    this.client.onMessage((data) => {
      this.reconnectAttempts = 0; // Reset on successful message
      this.handleMessage(data);
    });
  }

  private handleMessage(data: unknown): void {
    try {
      const message = JSON.parse(data as string);
      console.log('Message:', message);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * (2 ** this.reconnectAttempts), 30000);

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.client.connect();
    }, delay);
  }

  public connect(): void {
    this.client.connect();
  }

  public disconnect(): void {
    this.client.disconnect();
  }

  public send(message: string): void {
    this.client.sendMessage(message);
  }
}

// Usage
const manager = new WebSocketManager(wsClient);
manager.connect();
manager.send('Hello');
```

## Complete Production Example

```typescript
import {
  universalClient,
  withDelegate,
  withTelemetry,
  withHooks,
  withMethods
} from 'universal-client';

const productionWsClient = universalClient(
  withDelegate({
    type: 'websocket',
    url: process.env.WS_URL || 'wss://api.example.com/ws'
  }),

  withTelemetry({
    enableMetrics: true,
    enableLogging: process.env.NODE_ENV !== 'production',
    onEvent: (event) => {
      if (event.type === 'error') {
        // Send to error tracking
        console.error('WebSocket error:', event.error);
      }
    }
  }),

  withHooks({
    onInit: () => {
      console.log('WebSocket client initialized');
    }
  }),

  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),

    sendMessage: (type: string, payload: unknown) => {
      delegate.send(JSON.stringify({
        type,
        payload,
        timestamp: Date.now()
      }));
    },

    onMessage: (callback: (data: unknown) => void) => {
      return delegate.onMessage(callback);
    },

    onError: (callback: (event: Event) => void) => {
      return delegate.onError(callback);
    }
  })),
);

// Usage
productionWsClient.connect();

const unsubscribe = productionWsClient.onMessage((data) => {
  console.log('Received:', data);
});

productionWsClient.sendMessage('ping', { timestamp: Date.now() });

// Cleanup on app shutdown
process.on('SIGINT', () => {
  unsubscribe();
  productionWsClient.disconnect();
  process.exit(0);
});
```

## Key Benefits

- **Type Safety**: Strongly typed WebSocket messages and events
- **Real-time Communication**: Bi-directional communication with the server
- **Event Handling**: Clean event listener system with unsubscribe support
- **Connection Management**: Easy reconnection handling
- **Flexible Messaging**: Support for different message types and formats
- **Observable**: Track WebSocket activity with telemetry
