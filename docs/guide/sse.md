---
title: Server-Sent Events
outline: deep
---

# Server-Sent Events

Learn how to use Universal Client with SSE for receiving real-time updates from the server.

## Type Definitions

```typescript
interface NotificationData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
}

interface MetricsData {
  activeUsers: number;
  requestsPerSecond: number;
  serverLoad: number;
  timestamp: number;
}

interface UpdateData {
  entity: string;
  action: 'create' | 'update' | 'delete';
  data: unknown;
}
```

## Client Setup

```typescript
import { universalClient, withDelegate, withMethods } from 'universal-client';

const sseClient = universalClient(
  withDelegate({ type: 'sse', url: 'https://your-sse-server.com/events' }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),
    onMessage: (callback: (data: unknown) => void) => delegate.onMessage(callback),
    onNotification: (callback: (data: unknown) => void) => delegate.subscribe('notification', callback),
    onMetrics: (callback: (data: unknown) => void) => delegate.subscribe('metrics', callback),
    onUpdate: (callback: (data: unknown) => void) => delegate.subscribe('update', callback),
    onOpen: (callback: (event: Event) => void) => delegate.onOpen(callback),
    onError: (callback: (event: Event) => void) => delegate.onError(callback),
  })),
);
```

## Usage Examples

### Basic SSE Connection

```typescript
const unsubOpen = sseClient.onOpen(() => console.log('SSE connection established!'));
const unsubMessage = sseClient.onMessage((data) => console.log('Received:', data));
const unsubError = sseClient.onError((error) => console.error('SSE error:', error));

sseClient.connect();
```

### Typed Event Handlers

```typescript
class SSEEventHandler {
  private unsubscribers: Array<() => void> = [];

  constructor(private client: typeof sseClient) {
    this.unsubscribers.push(
      client.onOpen(() => console.log('Connected')),
      client.onError((error) => console.error('Error:', error)),
      client.onNotification((data) => {
        const n = data as NotificationData;
        console.log(`[${n.type}] ${n.title}: ${n.message}`);
      }),
      client.onMetrics((data) => {
        const m = data as MetricsData;
        console.log(`Users: ${m.activeUsers}, RPS: ${m.requestsPerSecond}, Load: ${m.serverLoad}%`);
      }),
      client.onUpdate((data) => {
        const u = data as UpdateData;
        console.log(`${u.entity} ${u.action}:`, u.data);
      }),
    );
  }

  connect() { this.client.connect(); }
  disconnect() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.client.disconnect();
  }
}

const handler = new SSEEventHandler(sseClient);
handler.connect();
```

### Real-time Dashboard

```typescript
const dashboardClient = universalClient(
  withDelegate({ type: 'sse', url: 'https://api.example.com/dashboard/events' }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),
    onMetrics: (callback: (data: unknown) => void) => delegate.subscribe('metrics', callback),
    onNotification: (callback: (data: unknown) => void) => delegate.subscribe('notification', callback),
    onUpdate: (callback: (data: unknown) => void) => delegate.subscribe('update', callback),
  })),
);

dashboardClient.connect();

dashboardClient.onMetrics((data) => {
  const metrics = data as MetricsData;
  console.log(`Active Users: ${metrics.activeUsers}, Load: ${metrics.serverLoad}%`);
});

dashboardClient.onNotification((data) => {
  const notification = data as NotificationData;
  console.log(`${notification.title}: ${notification.message}`);
});
```

### With Interceptors

```typescript
import { universalClient, withDelegate, withInterceptor, withMethods } from 'universal-client';

const sseClient = universalClient(
  withDelegate({ type: 'sse', url: 'https://your-sse-server.com/events' }),
  withInterceptor({
    onBeforeOpen: () => console.log('Opening SSE connection...'),
    onAfterOpen: () => console.log('SSE connection established'),
    onBeforeClose: () => console.log('Closing SSE connection...'),
    onAfterClose: () => console.log('SSE connection closed'),
    onError: (error) => console.error('SSE error:', error),
    onMessage: (data) => console.log('Message intercepted:', data),
  }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.open(),
    disconnect: () => delegate.close(),
    onMessage: (callback: (data: unknown) => void) => delegate.onMessage(callback),
    onNotification: (callback: (data: unknown) => void) => delegate.subscribe('notification', callback),
  })),
);
```

### With Telemetry and Hooks

```typescript
import { universalClient, withDelegate, withTelemetry, withHooks, withMethods } from 'universal-client';

const monitoredSSEClient = universalClient(
  withDelegate({ type: 'sse', url: 'https://api.example.com/events' }),
  withTelemetry({ enableMetrics: true, enableLogging: true }),
  withHooks({ onInit: () => console.log('SSE client initialized') }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),
    onMessage: (callback: (data: unknown) => void) => delegate.onMessage(callback),
    onEvent: (event: string, callback: (data: unknown) => void) => delegate.subscribe(event, callback),
  })),
);

monitoredSSEClient.connect();
monitoredSSEClient.onMessage((data) => console.log('Message:', data));
```

### Connection Manager with Reconnection

```typescript
class SSEConnectionManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private client: typeof sseClient) {
    client.onOpen(() => { this.reconnectAttempts = 0; });
    client.onError(() => this.attemptReconnect());
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = 1000 * (2 ** (this.reconnectAttempts - 1));
    setTimeout(() => this.client.connect(), delay);
  }

  connect() { this.client.connect(); }
  disconnect() { this.client.disconnect(); }
}
```

## Server-Side Example (Express.js)

```typescript
import express from 'express';

const app = express();

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`event: notification\n`);
  res.write(`data: ${JSON.stringify({
    id: '1', type: 'info', title: 'Welcome',
    message: 'Connected to SSE server', timestamp: Date.now()
  })}\n\n`);

  const metricsInterval = setInterval(() => {
    res.write(`event: metrics\n`);
    res.write(`data: ${JSON.stringify({
      activeUsers: Math.floor(Math.random() * 1000),
      requestsPerSecond: Math.floor(Math.random() * 100),
      serverLoad: Math.floor(Math.random() * 100),
      timestamp: Date.now()
    })}\n\n`);
  }, 5000);

  req.on('close', () => clearInterval(metricsInterval));
});

app.listen(3000, () => console.log('SSE server running on http://localhost:3000'));
```
