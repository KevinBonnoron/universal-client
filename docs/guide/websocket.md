---
title: WebSocket
outline: deep
---

# WebSocket

Learn how to use Universal Client with WebSocket transport for real-time communication.

## Type Definitions

```typescript
interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: number;
}

interface ChatMessage extends WebSocketMessage {
  type: 'chat';
  data: { user: string; message: string };
}

interface SystemMessage extends WebSocketMessage {
  type: 'system';
  data: { event: string; details?: unknown };
}

type Message = ChatMessage | SystemMessage;
```

## Client Setup

```typescript
import { universalClient, withDelegate, withMethods } from 'universal-client';

const wsClient = universalClient(
  withDelegate({
    type: 'websocket',
    url: 'wss://echo.websocket.org'
  }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),
    sendMessage: (message: string) => {
      delegate.send(JSON.stringify({ type: 'chat', data: { message }, timestamp: Date.now() }));
    },
    sendTypedMessage: (message: Message) => {
      delegate.send(JSON.stringify(message));
    },
    onMessage: (callback: (data: unknown) => void) => delegate.onMessage(callback),
    onError: (callback: (event: Event) => void) => delegate.onError(callback),
  })),
);
```

## Usage Examples

### Basic Connection and Messaging

```typescript
async function basicWebSocketExample(): Promise<void> {
  const unsubscribe = wsClient.onMessage((data) => {
    try {
      const message: Message = JSON.parse(data as string);
      console.log('Received:', message);
    } catch (error) {
      console.log('Raw message:', data);
    }
  });

  wsClient.connect();
  await new Promise(resolve => setTimeout(resolve, 1000));

  wsClient.sendMessage('Hello, WebSocket!');
  wsClient.sendTypedMessage({
    type: 'system',
    data: { event: 'user_joined', details: { userId: 123 } }
  });
}
```

### Real-time Chat

```typescript
interface ChatUser { id: string; name: string; }

const chatClient = universalClient(
  withDelegate({ type: 'websocket', url: 'wss://your-chat-server.com' }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),
    sendChatMessage: (user: ChatUser, message: string) => {
      delegate.send(JSON.stringify({
        type: 'chat',
        data: { userId: user.id, userName: user.name, message, timestamp: Date.now() }
      }));
    },
    joinRoom: (roomId: string, user: ChatUser) => {
      delegate.send(JSON.stringify({ type: 'join', data: { roomId, user } }));
    },
    leaveRoom: (roomId: string) => {
      delegate.send(JSON.stringify({ type: 'leave', data: { roomId } }));
    },
    onMessage: (callback: (data: unknown) => void) => delegate.onMessage(callback),
    onError: (callback: (event: Event) => void) => delegate.onError(callback),
  })),
);

const user: ChatUser = { id: '123', name: 'John' };
chatClient.connect();

const unsubMessage = chatClient.onMessage((data) => {
  const message = JSON.parse(data as string);
  console.log(`${message.data.userName}: ${message.data.message}`);
});

chatClient.joinRoom('general', user);
chatClient.sendChatMessage(user, 'Hello everyone!');
```

### With Telemetry

```typescript
import { universalClient, withDelegate, withTelemetry, withMethods } from 'universal-client';

const monitoredWsClient = universalClient(
  withDelegate({ type: 'websocket', url: 'wss://echo.websocket.org' }),
  withTelemetry({
    enableLogging: true,
    enableMetrics: true,
    onEvent: (event) => console.log('Telemetry:', event)
  }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),
    send: (message: string) => delegate.send(message),
    onMessage: (callback: (data: unknown) => void) => delegate.onMessage(callback),
  })),
);

monitoredWsClient.connect();
monitoredWsClient.send('test');
const metrics = monitoredWsClient.telemetry.getMetrics();
```

### Connection Monitoring with Reconnection

```typescript
class WebSocketManager {
  private client: typeof wsClient;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(client: typeof wsClient) {
    this.client = client;
    this.client.onError(() => this.attemptReconnect());
    this.client.onMessage((data) => {
      this.reconnectAttempts = 0;
      console.log('Message:', JSON.parse(data as string));
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * (2 ** this.reconnectAttempts), 30000);
    setTimeout(() => this.client.connect(), delay);
  }

  connect() { this.client.connect(); }
  disconnect() { this.client.disconnect(); }
  send(message: string) { this.client.sendMessage(message); }
}

const manager = new WebSocketManager(wsClient);
manager.connect();
```

## Production Example

```typescript
import { universalClient, withDelegate, withTelemetry, withHooks, withMethods } from 'universal-client';

const productionWsClient = universalClient(
  withDelegate({ type: 'websocket', url: process.env.WS_URL || 'wss://api.example.com/ws' }),
  withTelemetry({
    enableMetrics: true,
    enableLogging: process.env.NODE_ENV !== 'production',
  }),
  withHooks({ onInit: () => console.log('WebSocket client initialized') }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),
    sendMessage: (type: string, payload: unknown) => {
      delegate.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    },
    onMessage: (callback: (data: unknown) => void) => delegate.onMessage(callback),
    onError: (callback: (event: Event) => void) => delegate.onError(callback),
  })),
);

productionWsClient.connect();
const unsubscribe = productionWsClient.onMessage((data) => console.log('Received:', data));
productionWsClient.sendMessage('ping', { timestamp: Date.now() });

process.on('SIGINT', () => {
  unsubscribe();
  productionWsClient.disconnect();
  process.exit(0);
});
```
