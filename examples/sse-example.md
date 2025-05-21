# Server-Sent Events Example

This example demonstrates how to use Universal Client with Server-Sent Events (SSE) for receiving real-time updates from the server using TypeScript.

## Overview

Learn how to:
- Create a client with SSE delegate
- Connect to SSE endpoints
- Handle different event types with proper typing
- Manage connection lifecycle
- Process real-time server updates

## Type Definitions

Define types for SSE events:

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

Create a Universal Client with SSE delegate:

```typescript
import { universalClient, withDelegate, withMethods } from 'universal-client';

const sseClient = universalClient(
  withDelegate({
    type: 'sse',
    url: 'https://your-sse-server.com/events'
  }),
  withMethods(({ delegate }) => ({
    // Connection management
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),

    // Generic message listener
    onMessage: (callback: (data: unknown) => void) => {
      return delegate.onMessage(callback);
    },

    // Event-specific listeners
    onNotification: (callback: (data: unknown) => void) => {
      return delegate.subscribe('notification', callback);
    },

    onMetrics: (callback: (data: unknown) => void) => {
      return delegate.subscribe('metrics', callback);
    },

    onUpdate: (callback: (data: unknown) => void) => {
      return delegate.subscribe('update', callback);
    },

    // Connection events
    onOpen: (callback: (event: Event) => void) => {
      return delegate.onOpen(callback);
    },

    onError: (callback: (event: Event) => void) => {
      return delegate.onError(callback);
    }
  })),
);
```

## Usage Examples

### 1. Basic SSE Connection

```typescript
async function basicSSEExample(): Promise<void> {
  console.log('📡 Connecting to SSE server...');

  // Listen for connection open
  const unsubOpen = sseClient.onOpen(() => {
    console.log('✅ SSE connection established!');
  });

  // Listen for all messages
  const unsubMessage = sseClient.onMessage((data) => {
    console.log('📨 Received message:', data);
  });

  // Listen for errors
  const unsubError = sseClient.onError((error) => {
    console.error('❌ SSE error:', error);
  });

  // Connect to SSE server
  sseClient.connect();

  // Later: cleanup
  // unsubOpen();
  // unsubMessage();
  // unsubError();
  // sseClient.disconnect();
}
```

### 2. Typed Event Handlers

```typescript
class SSEEventHandler {
  private client: typeof sseClient;
  private unsubscribers: Array<() => void> = [];

  constructor(client: typeof sseClient) {
    this.client = client;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Connection events
    this.unsubscribers.push(
      this.client.onOpen(() => {
        console.log('✅ Connected to SSE server');
      })
    );

    this.unsubscribers.push(
      this.client.onError((error) => {
        console.error('❌ Connection error:', error);
      })
    );

    // Data events
    this.unsubscribers.push(
      this.client.onNotification((data) => {
        this.handleNotification(data as NotificationData);
      })
    );

    this.unsubscribers.push(
      this.client.onMetrics((data) => {
        this.handleMetrics(data as MetricsData);
      })
    );

    this.unsubscribers.push(
      this.client.onUpdate((data) => {
        this.handleUpdate(data as UpdateData);
      })
    );
  }

  private handleNotification(notification: NotificationData): void {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    }[notification.type];

    console.log(`${emoji} ${notification.title}: ${notification.message}`);
  }

  private handleMetrics(metrics: MetricsData): void {
    console.log('📊 Metrics:', {
      activeUsers: metrics.activeUsers,
      rps: metrics.requestsPerSecond,
      load: `${metrics.serverLoad}%`
    });
  }

  private handleUpdate(update: UpdateData): void {
    console.log(`🔄 ${update.entity} ${update.action}:`, update.data);
  }

  public connect(): void {
    this.client.connect();
  }

  public disconnect(): void {
    // Cleanup all subscriptions
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.client.disconnect();
  }
}

// Usage
const handler = new SSEEventHandler(sseClient);
handler.connect();

// Later
// handler.disconnect();
```

### 3. Real-time Dashboard

```typescript
import { universalClient, withDelegate, withMethods } from 'universal-client';

interface DashboardData {
  metrics: MetricsData;
  notifications: NotificationData[];
  updates: UpdateData[];
}

const dashboardClient = universalClient(
  withDelegate({
    type: 'sse',
    url: 'https://api.example.com/dashboard/events'
  }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),
    onMetrics: (callback: (data: unknown) => void) => delegate.subscribe('metrics', callback),
    onNotification: (callback: (data: unknown) => void) => delegate.subscribe('notification', callback),
    onUpdate: (callback: (data: unknown) => void) => delegate.subscribe('update', callback)
  })),
);

class RealTimeDashboard {
  private client: typeof dashboardClient;
  private data: DashboardData = {
    metrics: { activeUsers: 0, requestsPerSecond: 0, serverLoad: 0, timestamp: Date.now() },
    notifications: [],
    updates: []
  };

  constructor() {
    this.client = dashboardClient;
  }

  public start(): void {
    this.client.connect();

    this.client.onMetrics((data) => {
      this.data.metrics = data as MetricsData;
      this.render();
    });

    this.client.onNotification((data) => {
      const notification = data as NotificationData;
      this.data.notifications.unshift(notification);
      this.data.notifications = this.data.notifications.slice(0, 10); // Keep last 10
      this.render();
    });

    this.client.onUpdate((data) => {
      const update = data as UpdateData;
      this.data.updates.unshift(update);
      this.data.updates = this.data.updates.slice(0, 20); // Keep last 20
      this.render();
    });
  }

  private render(): void {
    console.clear();
    console.log('=== Real-Time Dashboard ===\n');
    console.log('📊 Metrics:');
    console.log(`  Active Users: ${this.data.metrics.activeUsers}`);
    console.log(`  Requests/sec: ${this.data.metrics.requestsPerSecond}`);
    console.log(`  Server Load: ${this.data.metrics.serverLoad}%\n`);

    console.log('🔔 Recent Notifications:');
    this.data.notifications.slice(0, 3).forEach(n => {
      console.log(`  - ${n.title}: ${n.message}`);
    });

    console.log('\n🔄 Recent Updates:');
    this.data.updates.slice(0, 3).forEach(u => {
      console.log(`  - ${u.entity} ${u.action}`);
    });
  }

  public stop(): void {
    this.client.disconnect();
  }
}

// Usage
const dashboard = new RealTimeDashboard();
dashboard.start();

// Stop after 1 minute
setTimeout(() => dashboard.stop(), 60000);
```

### 4. With Telemetry and Hooks

```typescript
import {
  universalClient,
  withDelegate,
  withTelemetry,
  withHooks,
  withMethods
} from 'universal-client';

const monitoredSSEClient = universalClient(
  withDelegate({
    type: 'sse',
    url: 'https://api.example.com/events'
  }),

  withTelemetry({
    enableMetrics: true,
    enableLogging: true,
    onEvent: (event) => {
      console.log('Telemetry:', event);
    }
  }),

  withHooks({
    onInit: () => {
      console.log('SSE client initialized');
    }
  }),

  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),
    onMessage: (callback: (data: unknown) => void) => delegate.onMessage(callback),
    onEvent: (event: string, callback: (data: unknown) => void) => delegate.subscribe(event, callback)
  })),
);

// All SSE activity will be tracked
monitoredSSEClient.connect();

const unsub = monitoredSSEClient.onMessage((data) => {
  console.log('Message:', data);
});

// Check telemetry
const metrics = monitoredSSEClient.telemetry.getMetrics();
console.log('Connection metrics:', metrics);
```

### 5. Connection Manager with Reconnection

```typescript
class SSEConnectionManager {
  private client: typeof sseClient;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(client: typeof sseClient) {
    this.client = client;
    this.setupConnectionHandling();
  }

  private setupConnectionHandling(): void {
    this.client.onOpen(() => {
      console.log('✅ SSE connected');
      this.reconnectAttempts = 0;
    });

    this.client.onError((error) => {
      console.error('❌ SSE connection error:', error);
      this.attemptReconnect();
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * (2 ** (this.reconnectAttempts - 1));

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
}

// Usage
const connectionManager = new SSEConnectionManager(sseClient);
connectionManager.connect();
```

## Production Example

```typescript
import {
  universalClient,
  withDelegate,
  withTelemetry,
  withHooks,
  withMethods
} from 'universal-client';

const productionSSEClient = universalClient(
  withDelegate({
    type: 'sse',
    url: process.env.SSE_URL || 'https://api.example.com/events'
  }),

  withTelemetry({
    enableMetrics: true,
    enableLogging: process.env.NODE_ENV !== 'production',
    onEvent: (event) => {
      if (event.type === 'error') {
        // Send to error tracking service
        console.error('SSE error:', event.error);
      }
    }
  }),

  withHooks({
    onInit: () => {
      console.log('SSE client initialized');
    }
  }),

  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),

    onMessage: (callback: (data: unknown) => void) => {
      return delegate.onMessage(callback);
    },

    onNotification: (callback: (data: unknown) => void) => {
      return delegate.subscribe('notification', callback);
    },

    onMetrics: (callback: (data: unknown) => void) => {
      return delegate.subscribe('metrics', callback);
    },

    onAlert: (callback: (data: unknown) => void) => {
      return delegate.subscribe('alert', callback);
    },

    onOpen: (callback: (event: Event) => void) => {
      return delegate.onOpen(callback);
    },

    onError: (callback: (event: Event) => void) => {
      return delegate.onError(callback);
    }
  })),
);

// Usage
const unsubscribers: Array<() => void> = [];

productionSSEClient.connect();

unsubscribers.push(
  productionSSEClient.onNotification((data) => {
    const notification = data as NotificationData;
    console.log(`🔔 ${notification.title}: ${notification.message}`);
  })
);

unsubscribers.push(
  productionSSEClient.onMetrics((data) => {
    const metrics = data as MetricsData;
    // Update UI or send to monitoring service
    console.log('📊 Metrics update:', metrics);
  })
);

// Cleanup on shutdown
process.on('SIGINT', () => {
  unsubscribers.forEach(unsub => unsub());
  productionSSEClient.disconnect();
  process.exit(0);
});
```

## Server-Side Example (Express.js)

For reference, here's how your server might send SSE events:

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

  // Send notification event
  res.write(`event: notification\n`);
  res.write(`data: ${JSON.stringify({
    id: '1',
    type: 'info',
    title: 'Welcome',
    message: 'Connected to SSE server',
    timestamp: Date.now()
  })}\n\n`);

  // Send metrics every 5 seconds
  const metricsInterval = setInterval(() => {
    res.write(`event: metrics\n`);
    res.write(`data: ${JSON.stringify({
      activeUsers: Math.floor(Math.random() * 1000),
      requestsPerSecond: Math.floor(Math.random() * 100),
      serverLoad: Math.floor(Math.random() * 100),
      timestamp: Date.now()
    })}\n\n`);
  }, 5000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(metricsInterval);
  });
});

app.listen(3000, () => {
  console.log('SSE server running on http://localhost:3000');
});
```

## Key Benefits

- **Real-time Updates**: Receive server-sent data in real-time
- **Type Safety**: Strongly typed event handling and data structures
- **Event Types**: Support for custom event types beyond standard messages
- **Connection Management**: Automatic reconnection support
- **Low Latency**: Efficient one-way communication from server to client
- **Observable**: Track SSE activity with telemetry
- **Clean Unsubscription**: All event listeners return unsubscribe functions
