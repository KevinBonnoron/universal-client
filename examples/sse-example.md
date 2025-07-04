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
interface SSEEvent {
  data: string;
  lastEventId?: string;
  origin?: string;
  type?: string;
}

interface NotificationEvent extends SSEEvent {
  type: 'notification';
  data: string; // JSON string containing notification data
}

interface UpdateEvent extends SSEEvent {
  type: 'update';
  data: string; // JSON string containing update data
}

interface HeartbeatEvent extends SSEEvent {
  type: 'heartbeat';
  data: string; // Timestamp
}

// Parsed event data types
interface NotificationData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  userId?: string;
}

interface UpdateData {
  id: string;
  entity: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}
```

## Client Setup

Create a Universal Client with SSE delegate:

```typescript
import { universalClient, withDelegate, withMethods } from '@kevinbonnoron/universal-client';

const client = universalClient(
  withDelegate({ 
    type: 'sse',
    url: 'https://your-sse-server.com/events', // Replace with your SSE endpoint
    // For Node.js environments, you might need:
    // EventSource: require('eventsource')
  }),
  withMethods(({ delegate }) => ({
    // Connection management
    connect: (): Promise<void> => delegate.connect(),
    disconnect: (): void => delegate.close(),
    
    // Event listeners for standard events
    onMessage: (callback: (event: MessageEvent) => void): void => {
      delegate.addEventListener('message', callback);
    },
    
    onOpen: (callback: (event: Event) => void): void => {
      delegate.addEventListener('open', callback);
    },
    
    onError: (callback: (event: Event) => void): void => {
      delegate.addEventListener('error', callback);
    },
    
    // Event listeners for custom event types
    onNotification: (callback: (event: NotificationEvent) => void): void => {
      delegate.addEventListener('notification', callback);
    },
    
    onUpdate: (callback: (event: UpdateEvent) => void): void => {
      delegate.addEventListener('update', callback);
    },
    
    onHeartbeat: (callback: (event: HeartbeatEvent) => void): void => {
      delegate.addEventListener('heartbeat', callback);
    },
    
    // Generic custom event listener
    onCustomEvent: (eventType: string, callback: (event: SSEEvent) => void): void => {
      delegate.addEventListener(eventType, callback);
    },
    
    // Connection state
    getReadyState: (): number => delegate.readyState
  }))
);
```

## Usage Examples

### 1. Basic SSE Connection

```typescript
async function basicSSEExample(): Promise<void> {
  console.log('📡 Connecting to SSE server...');
  
  // Set up event listeners
  client.onOpen(() => {
    console.log('✅ SSE connection established!');
    console.log('📡 Listening for server events...');
  });
  
  client.onMessage((event) => {
    console.log('📨 Received message event:');
    console.log('  Data:', event.data);
    console.log('  Last Event ID:', event.lastEventId);
    console.log('  Origin:', event.origin);
  });
  
  client.onError((error) => {
    console.error('❌ SSE error:', error);
  });
  
  // Connect to SSE server
  await client.connect();
  
  console.log('🎯 Waiting for server events...');
}
```

### 2. Typed Event Handler

```typescript
class SSEEventHandler {
  private client: typeof client;
  private isConnected = false;
  
  constructor(sseClient: typeof client) {
    this.client = sseClient;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.client.onOpen(() => {
      console.log('✅ Connected to SSE server');
      this.isConnected = true;
      this.onConnected();
    });
    
    this.client.onMessage((event) => {
      this.handleGenericMessage(event);
    });
    
    this.client.onNotification((event) => {
      this.handleNotification(event);
    });
    
    this.client.onUpdate((event) => {
      this.handleUpdate(event);
    });
    
    this.client.onHeartbeat((event) => {
      this.handleHeartbeat(event);
    });
    
    this.client.onError((error) => {
      console.error('❌ SSE connection error:', error);
      this.isConnected = false;
    });
  }
  
  private handleGenericMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 Generic message received:', data);
    } catch (error) {
      console.log('📨 Raw message received:', event.data);
    }
  }
  
  private handleNotification(event: NotificationEvent): void {
    try {
      const notification: NotificationData = JSON.parse(event.data);
      this.displayNotification(notification);
    } catch (error) {
      console.error('Error parsing notification:', error);
    }
  }
  
  private handleUpdate(event: UpdateEvent): void {
    try {
      const update: UpdateData = JSON.parse(event.data);
      this.processUpdate(update);
    } catch (error) {
      console.error('Error parsing update:', error);
    }
  }
  
  private handleHeartbeat(event: HeartbeatEvent): void {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`💓 Heartbeat received at ${timestamp}`);
  }
  
  private displayNotification(notification: NotificationData): void {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    }[notification.type] || '📢';
    
    console.log(`${emoji} Notification: ${notification.title}`);
    console.log(`   Message: ${notification.message}`);
    console.log(`   Time: ${new Date(notification.timestamp).toLocaleString()}`);
  }
  
  private processUpdate(update: UpdateData): void {
    const emoji = {
      create: '➕',
      update: '📝',
      delete: '🗑️'
    }[update.action] || '🔄';
    
    console.log(`${emoji} ${update.entity} ${update.action}:`);
    console.log(`   ID: ${update.id}`);
    console.log(`   Data:`, update.data);
  }
  
  private onConnected(): void {
    console.log('🔗 SSE connection established, ready to receive events');
  }
  
  public async connect(): Promise<void> {
    await this.client.connect();
  }
  
  public disconnect(): void {
    this.client.disconnect();
    this.isConnected = false;
  }
  
  public isConnectionActive(): boolean {
    return this.isConnected;
  }
}
```

### 3. Real-time Dashboard

```typescript
interface DashboardMetrics {
  activeUsers: number;
  totalSales: number;
  serverLoad: number;
  errorRate: number;
  timestamp: number;
}

interface UserActivity {
  userId: string;
  action: string;
  timestamp: number;
  details: any;
}

class RealTimeDashboard {
  private client: typeof client;
  private metrics: DashboardMetrics = {
    activeUsers: 0,
    totalSales: 0,
    serverLoad: 0,
    errorRate: 0,
    timestamp: Date.now()
  };
  private activities: UserActivity[] = [];
  
  constructor() {
    this.client = client;
    this.setupSSEListeners();
  }
  
  private setupSSEListeners(): void {
    this.client.onOpen(() => {
      console.log('📊 Dashboard connected to real-time updates');
    });
    
    // Listen for metrics updates
    this.client.onCustomEvent('metrics', (event) => {
      this.handleMetricsUpdate(event);
    });
    
    // Listen for user activity
    this.client.onCustomEvent('user-activity', (event) => {
      this.handleUserActivity(event);
    });
    
    // Listen for system alerts
    this.client.onCustomEvent('alert', (event) => {
      this.handleSystemAlert(event);
    });
    
    this.client.onError((error) => {
      console.error('📊 Dashboard connection error:', error);
    });
  }
  
  private handleMetricsUpdate(event: SSEEvent): void {
    try {
      const newMetrics: DashboardMetrics = JSON.parse(event.data);
      const previousMetrics = { ...this.metrics };
      this.metrics = newMetrics;
      
      this.displayMetricsUpdate(previousMetrics, newMetrics);
    } catch (error) {
      console.error('Error parsing metrics update:', error);
    }
  }
  
  private handleUserActivity(event: SSEEvent): void {
    try {
      const activity: UserActivity = JSON.parse(event.data);
      this.activities.unshift(activity);
      
      // Keep only last 50 activities
      if (this.activities.length > 50) {
        this.activities = this.activities.slice(0, 50);
      }
      
      this.displayUserActivity(activity);
    } catch (error) {
      console.error('Error parsing user activity:', error);
    }
  }
  
  private handleSystemAlert(event: SSEEvent): void {
    try {
      const alert = JSON.parse(event.data);
      this.displaySystemAlert(alert);
    } catch (error) {
      console.error('Error parsing system alert:', error);
    }
  }
  
  private displayMetricsUpdate(previous: DashboardMetrics, current: DashboardMetrics): void {
    console.log('📊 Metrics Updated:');
    
    this.logMetricChange('Active Users', previous.activeUsers, current.activeUsers);
    this.logMetricChange('Total Sales', previous.totalSales, current.totalSales, '$');
    this.logMetricChange('Server Load', previous.serverLoad, current.serverLoad, '%');
    this.logMetricChange('Error Rate', previous.errorRate, current.errorRate, '%');
  }
  
  private logMetricChange(name: string, oldValue: number, newValue: number, unit = ''): void {
    const change = newValue - oldValue;
    const changeStr = change > 0 ? `+${change}` : change.toString();
    const emoji = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
    
    console.log(`   ${emoji} ${name}: ${newValue}${unit} (${changeStr})`);
  }
  
  private displayUserActivity(activity: UserActivity): void {
    const time = new Date(activity.timestamp).toLocaleTimeString();
    console.log(`👤 [${time}] User ${activity.userId}: ${activity.action}`);
  }
  
  private displaySystemAlert(alert: any): void {
    const severity = alert.severity || 'info';
    const emoji = {
      critical: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    }[severity] || '📢';
    
    console.log(`${emoji} SYSTEM ALERT: ${alert.message}`);
    if (alert.details) {
      console.log(`   Details: ${JSON.stringify(alert.details)}`);
    }
  }
  
  public async startDashboard(): Promise<void> {
    await this.client.connect();
  }
  
  public stopDashboard(): void {
    this.client.disconnect();
  }
  
  public getCurrentMetrics(): DashboardMetrics {
    return { ...this.metrics };
  }
  
  public getRecentActivities(): UserActivity[] {
    return [...this.activities];
  }
}
```

### 4. Connection Monitoring and Reconnection

```typescript
class SSEConnectionManager {
  private client: typeof client;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private connectionMonitor: NodeJS.Timeout | null = null;
  
  constructor(sseClient: typeof client) {
    this.client = sseClient;
    this.setupConnectionMonitoring();
  }
  
  private setupConnectionMonitoring(): void {
    this.client.onOpen(() => {
      console.log('✅ SSE connected');
      this.reconnectAttempts = 0;
      this.startConnectionMonitor();
    });
    
    this.client.onError((error) => {
      console.error('❌ SSE connection error:', error);
      this.stopConnectionMonitor();
      this.attemptReconnect();
    });
    
    // Monitor connection state
    this.startConnectionMonitor();
  }
  
  private startConnectionMonitor(): void {
    this.connectionMonitor = setInterval(() => {
      const state = this.getConnectionState();
      console.log(`🔗 SSE Connection State: ${state}`);
      
      if (state === 'CLOSED' && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    }, 10000); // Check every 10 seconds
  }
  
  private stopConnectionMonitor(): void {
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
      this.connectionMonitor = null;
    }
  }
  
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * (2 ** (this.reconnectAttempts - 1));
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
    
    setTimeout(async () => {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, delay);
  }
  
  public getConnectionState(): string {
    const state = this.client.getReadyState();
    const states = {
      0: 'CONNECTING',
      1: 'OPEN',
      2: 'CLOSED'
    };
    return states[state as keyof typeof states] || 'UNKNOWN';
  }
  
  public async connect(): Promise<void> {
    await this.client.connect();
  }
  
  public disconnect(): void {
    this.stopConnectionMonitor();
    this.client.disconnect();
  }
  
  public resetReconnectionAttempts(): void {
    this.reconnectAttempts = 0;
  }
}
```

### 5. Complete Example

```typescript
async function runSSEExample(): Promise<void> {
  console.log('📡 Universal Client - Server-Sent Events Example\n');
  
  try {
    // Create event handler
    const eventHandler = new SSEEventHandler(client);
    
    // Create connection manager
    const connectionManager = new SSEConnectionManager(client);
    
    // Create dashboard (if using dashboard features)
    const dashboard = new RealTimeDashboard();
    
    // Connect to SSE server
    await eventHandler.connect();
    
    console.log('ℹ️  Note: This example connects to your SSE server.');
    console.log('ℹ️  In a real application, your server would send various events.');
    console.log('ℹ️  The connection will remain open to receive real-time updates.\n');
    
    // Simulate receiving events for demonstration
    // (In real usage, these would come from your server)
    setTimeout(() => {
      console.log('💡 Example Event Handling Patterns:\n');
      console.log('   • User notifications → Update notification badge');
      console.log('   • Data updates → Refresh specific UI components');
      console.log('   • System alerts → Show toast messages');
      console.log('   • Real-time metrics → Update dashboards');
      console.log('   • Live feeds → Add new content to streams\n');
    }, 5000);
    
    // Keep the example running
    console.log('🎯 Waiting for server events...');
    console.log('   The connection will remain open to receive real-time updates.');
    console.log('   In a real application, you would handle these events in your UI.\n');
    
    // Set up graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down...');
      eventHandler.disconnect();
      connectionManager.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error in SSE example:', error);
  }
}

// Run the example
runSSEExample();
```

## Server-Side SSE Implementation Example

For reference, here's how your server might send events:

```typescript
// Example Express.js SSE endpoint
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Send different types of events
  
  // Standard message
  res.write(`data: ${JSON.stringify({ message: 'Hello from server!' })}\n\n`);
  
  // Custom event type
  res.write(`event: notification\n`);
  res.write(`data: ${JSON.stringify({
    id: '1',
    type: 'info',
    title: 'New Message',
    message: 'You have a new message!',
    timestamp: Date.now()
  })}\n\n`);
  
  // Update event
  res.write(`event: update\n`);
  res.write(`data: ${JSON.stringify({
    id: '123',
    entity: 'user',
    action: 'update',
    data: { name: 'John Doe', status: 'online' },
    timestamp: Date.now()
  })}\n\n`);
  
  // Heartbeat
  setInterval(() => {
    res.write(`event: heartbeat\n`);
    res.write(`data: ${Date.now()}\n\n`);
  }, 30000);
});
```

## Key Benefits

- **Real-time Updates**: Receive server-sent data in real-time
- **Type Safety**: Strongly typed event handling and data structures
- **Event Types**: Support for custom event types beyond standard messages
- **Connection Management**: Automatic reconnection and monitoring
- **Low Latency**: Efficient one-way communication from server to client 