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
  data: any;
  timestamp?: number;
}

interface PingMessage extends WebSocketMessage {
  type: 'ping';
  timestamp: number;
}

interface UserMessage extends WebSocketMessage {
  type: 'user';
  data: {
    id: number;
    name: string;
    email: string;
    action: string;
  };
}

interface ChatMessage extends WebSocketMessage {
  type: 'message';
  data: string;
}

type MessageType = PingMessage | UserMessage | ChatMessage;
```

## Client Setup

Create a Universal Client with WebSocket delegate:

```typescript
import { universalClient, withDelegate, withMethods } from '@kevinbonnoron/universal-client';

const client = universalClient(
  withDelegate({ 
    type: 'websocket',
    url: 'wss://echo.websocket.org'  // Public echo server for testing
  }),
  withMethods(({ delegate }) => ({
    // Connection management
    connect: (): Promise<void> => delegate.connect(),
    disconnect: (): void => delegate.close(),
    
    // Message sending methods
    sendMessage: (message: string): void => {
      const payload: ChatMessage = {
        type: 'message',
        data: message,
        timestamp: Date.now()
      };
      delegate.send(JSON.stringify(payload));
    },
    
    sendPing: (): void => {
      const payload: PingMessage = {
        type: 'ping',
        timestamp: Date.now()
      };
      delegate.send(JSON.stringify(payload));
    },
    
    sendUserData: (userData: UserMessage['data']): void => {
      const payload: UserMessage = {
        type: 'user',
        data: userData
      };
      delegate.send(JSON.stringify(payload));
    },
    
    sendTypedMessage: (message: MessageType): void => {
      delegate.send(JSON.stringify(message));
    },
    
    // Event listeners
    onMessage: (callback: (event: MessageEvent) => void): void => {
      delegate.addEventListener('message', callback);
    },
    
    onOpen: (callback: (event: Event) => void): void => {
      delegate.addEventListener('open', callback);
    },
    
    onError: (callback: (event: Event) => void): void => {
      delegate.addEventListener('error', callback);
    },
    
    onClose: (callback: (event: CloseEvent) => void): void => {
      delegate.addEventListener('close', callback);
    },
    
    // Connection state
    getReadyState: (): number => delegate.readyState
  }))
);
```

## Usage Examples

### 1. Basic Connection and Messaging

```typescript
async function basicWebSocketExample(): Promise<void> {
  console.log('🔌 Connecting to WebSocket server...');
  
  // Set up event listeners
  client.onOpen((event) => {
    console.log('✅ WebSocket connection established!');
  });
  
  client.onMessage((event) => {
    try {
      const message: MessageType = JSON.parse(event.data);
      console.log('📨 Received message:', message);
    } catch (error) {
      console.log('📨 Received raw message:', event.data);
    }
  });
  
  client.onError((error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  client.onClose((event) => {
    console.log(`🔌 Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
  });
  
  // Connect and send messages
  await client.connect();
  
  // Wait for connection to establish
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Send various types of messages
  client.sendMessage('Hello, WebSocket!');
  client.sendPing();
  client.sendUserData({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    action: 'login'
  });
}
```

### 2. Typed Message Handler

```typescript
class WebSocketMessageHandler {
  private client: typeof client;
  
  constructor(wsClient: typeof client) {
    this.client = wsClient;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.client.onMessage((event) => {
      this.handleMessage(event);
    });
    
    this.client.onOpen(() => {
      console.log('✅ Connected to WebSocket server');
      this.onConnected();
    });
    
    this.client.onClose((event) => {
      console.log(`🔌 Disconnected: ${event.reason}`);
      this.onDisconnected(event);
    });
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const message: MessageType = JSON.parse(event.data);
      
      switch (message.type) {
        case 'ping':
          this.handlePing(message);
          break;
        case 'user':
          this.handleUserMessage(message);
          break;
        case 'message':
          this.handleChatMessage(message);
          break;
        default:
          console.log('Unknown message type:', message);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }
  
  private handlePing(message: PingMessage): void {
    const latency = Date.now() - message.timestamp;
    console.log(`🏓 Ping received, latency: ${latency}ms`);
  }
  
  private handleUserMessage(message: UserMessage): void {
    console.log(`👤 User ${message.data.name} performed action: ${message.data.action}`);
  }
  
  private handleChatMessage(message: ChatMessage): void {
    console.log(`💬 Chat message: ${message.data}`);
  }
  
  private onConnected(): void {
    // Send initial ping
    this.client.sendPing();
  }
  
  private onDisconnected(event: CloseEvent): void {
    // Handle reconnection logic if needed
    if (event.code !== 1000) { // Not a normal closure
      console.log('🔄 Attempting to reconnect...');
      setTimeout(() => this.client.connect(), 5000);
    }
  }
  
  public async connect(): Promise<void> {
    await this.client.connect();
  }
  
  public disconnect(): void {
    this.client.disconnect();
  }
  
  public sendChatMessage(message: string): void {
    this.client.sendMessage(message);
  }
}
```

### 3. Real-time Chat Implementation

```typescript
interface ChatUser {
  id: string;
  name: string;
  isOnline: boolean;
}

interface ChatRoom {
  id: string;
  name: string;
  users: ChatUser[];
  messages: ChatMessage[];
}

class RealTimeChatClient {
  private client: typeof client;
  private currentRoom: ChatRoom | null = null;
  private currentUser: ChatUser | null = null;
  
  constructor() {
    this.client = client;
    this.setupWebSocket();
  }
  
  private setupWebSocket(): void {
    this.client.onMessage((event) => {
      const message = JSON.parse(event.data);
      this.handleIncomingMessage(message);
    });
    
    this.client.onOpen(() => {
      console.log('🔗 Connected to chat server');
      if (this.currentUser) {
        this.announceUserOnline();
      }
    });
  }
  
  public async joinRoom(roomId: string, user: ChatUser): Promise<void> {
    this.currentUser = user;
    
    await this.client.connect();
    
    // Send join room message
    this.client.sendTypedMessage({
      type: 'user',
      data: {
        id: parseInt(user.id),
        name: user.name,
        email: `${user.name}@example.com`,
        action: 'join_room',
        roomId
      }
    });
  }
  
  public sendChatMessage(message: string): void {
    if (!this.currentUser) {
      console.error('User not logged in');
      return;
    }
    
    const chatMessage: ChatMessage = {
      type: 'message',
      data: message,
      timestamp: Date.now()
    };
    
    this.client.sendTypedMessage(chatMessage);
  }
  
  private handleIncomingMessage(message: any): void {
    switch (message.type) {
      case 'message':
        this.displayChatMessage(message);
        break;
      case 'user':
        this.handleUserAction(message);
        break;
      case 'ping':
        // Respond to server ping
        this.client.sendPing();
        break;
    }
  }
  
  private displayChatMessage(message: ChatMessage): void {
    console.log(`💬 ${new Date().toLocaleTimeString()}: ${message.data}`);
  }
  
  private handleUserAction(message: UserMessage): void {
    const { action, name } = message.data;
    
    switch (action) {
      case 'join_room':
        console.log(`👋 ${name} joined the room`);
        break;
      case 'leave_room':
        console.log(`👋 ${name} left the room`);
        break;
    }
  }
  
  private announceUserOnline(): void {
    if (!this.currentUser) return;
    
    this.client.sendUserData({
      id: parseInt(this.currentUser.id),
      name: this.currentUser.name,
      email: `${this.currentUser.name}@example.com`,
      action: 'online'
    });
  }
  
  public disconnect(): void {
    if (this.currentUser) {
      this.client.sendUserData({
        id: parseInt(this.currentUser.id),
        name: this.currentUser.name,
        email: `${this.currentUser.name}@example.com`,
        action: 'offline'
      });
    }
    
    this.client.disconnect();
  }
}
```

### 4. Connection Monitoring

```typescript
class WebSocketMonitor {
  private client: typeof client;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  constructor(wsClient: typeof client) {
    this.client = wsClient;
    this.setupMonitoring();
  }
  
  private setupMonitoring(): void {
    this.client.onOpen(() => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    });
    
    this.client.onClose((event) => {
      console.log(`🔌 WebSocket disconnected: ${event.reason}`);
      this.stopHeartbeat();
      
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    });
    
    this.client.onError((error) => {
      console.error('❌ WebSocket error:', error);
    });
  }
  
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.client.getReadyState() === WebSocket.OPEN) {
        this.client.sendPing();
      }
    }, 30000); // Send ping every 30 seconds
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  private async attemptReconnect(): Promise<void> {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
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
      [WebSocket.CONNECTING]: 'CONNECTING',
      [WebSocket.OPEN]: 'OPEN',
      [WebSocket.CLOSING]: 'CLOSING',
      [WebSocket.CLOSED]: 'CLOSED'
    };
    return states[state] || 'UNKNOWN';
  }
}
```

### 5. Complete Example

```typescript
async function runWebSocketExample(): Promise<void> {
  console.log('🔌 Universal Client - WebSocket Example\n');
  
  try {
    // Create message handler
    const messageHandler = new WebSocketMessageHandler(client);
    
    // Create monitor
    const monitor = new WebSocketMonitor(client);
    
    // Connect
    await messageHandler.connect();
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send some messages
    messageHandler.sendChatMessage('Hello from Universal Client!');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    messageHandler.sendChatMessage('This is a WebSocket example');
    
    // Monitor connection for a while
    const statusInterval = setInterval(() => {
      console.log(`📡 Connection status: ${monitor.getConnectionState()}`);
    }, 5000);
    
    // Clean up after 30 seconds
    setTimeout(() => {
      clearInterval(statusInterval);
      messageHandler.disconnect();
      console.log('✅ WebSocket example completed!');
    }, 30000);
    
  } catch (error) {
    console.error('❌ Error in WebSocket example:', error);
  }
}

// Run the example
runWebSocketExample();
```

## Key Benefits

- **Type Safety**: Strongly typed WebSocket messages and events
- **Real-time Communication**: Bi-directional communication with the server
- **Event Handling**: Comprehensive event listener system
- **Connection Management**: Automatic reconnection and monitoring
- **Flexible Messaging**: Support for different message types and formats 