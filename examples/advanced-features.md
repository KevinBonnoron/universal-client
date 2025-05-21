# Advanced Features Example

This example demonstrates advanced usage patterns of Universal Client including telemetry, environments, hooks, and offline support using TypeScript.

## Overview

Learn how to:
- Monitor requests with telemetry
- Manage multiple environments
- Use hooks for lifecycle events
- Handle offline scenarios
- Implement custom features

## Type Definitions

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}
```

## Telemetry Feature

Track and monitor all HTTP requests:

```typescript
import { universalClient, withDelegate, withTelemetry, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withTelemetry({
    enableMetrics: true,
    enableTracing: true,
    enableLogging: true,
    onEvent: (event) => {
      console.log('Telemetry event:', event);
    },
    onMetrics: (metrics) => {
      console.log('Metrics updated:', metrics);
    }
  }),
  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get<User>(`https://jsonplaceholder.typicode.com/users/${id}`),
    getAllUsers: () => delegate.get<User[]>('https://jsonplaceholder.typicode.com/users'),
  })),
);

// Make requests - they will be automatically tracked
const user = await client.getUser(1);

// Access telemetry data
const metrics = client.telemetry.getMetrics();
console.log('Total requests:', metrics.requests.total);
console.log('Success rate:', metrics.requests.success);
console.log('Average latency:', metrics.latency.avg);
```

## Environment Management

Manage different environments (dev, staging, production):

```typescript
import { universalClient, withDelegate, withEnvironments, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withEnvironments({
    name: 'delegate',
    environments: {
      development: 'http://localhost:3000',
      staging: 'https://staging-api.example.com',
      production: 'https://api.example.com'
    },
    default: 'development',
    fallback: 'development'
  }),
  withMethods(({ delegate }) => ({
    getUsers: () => delegate.get<User[]>('/users'),
    getUser: (id: number) => delegate.get<User>(`/users/${id}`),
  })),
);

// Check current environment
console.log('Current environment:', client.environments.getCurrentEnvironment());

// Switch to production
client.environments.setEnvironment('production');

// This will use production URL
const users = await client.getUsers();

// Switch to staging
client.environments.setEnvironment('staging');
```

## Hooks System

Execute logic before/after requests and on errors:

```typescript
import { universalClient, withDelegate, withHooks, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withHooks({
    onInit: () => {
      console.log('Client initialized');
    },
    onBeforeRequest: (method, url) => {
      console.log(`Making ${method} request to ${url}`);
    },
    onAfterRequest: (method, url, result) => {
      console.log(`Request to ${url} completed successfully`);
    },
    onError: (method, url, error) => {
      console.error(`Request to ${url} failed:`, error);
    }
  }),
  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get<User>(`https://jsonplaceholder.typicode.com/users/${id}`),
  })),
);

// Hooks will be triggered automatically
const user = await client.getUser(1);
```

## Offline Support

Handle offline scenarios gracefully:

```typescript
import { universalClient, withDelegate, withOffline, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withOffline({
    name: 'delegate',
    enableQueue: true,
    maxQueueSize: 100,
    onOnline: () => {
      console.log('App is online, processing queued requests');
    },
    onOffline: () => {
      console.log('App is offline, queueing requests');
    },
    onQueueProcessed: (count) => {
      console.log(`Processed ${count} queued requests`);
    }
  }),
  withMethods(({ delegate }) => ({
    createPost: (data: Post) => delegate.post<Post>('https://jsonplaceholder.typicode.com/posts', data),
  })),
);

// This will be queued if offline
const post = await client.createPost({
  id: 1,
  userId: 1,
  title: 'Test',
  body: 'Content'
});

// Check queue status
const queueSize = client.offline.getQueueSize();
console.log('Queued requests:', queueSize);

// Manually process queue
await client.offline.processQueue();
```

## Combining Multiple Features

You can compose multiple features together:

```typescript
import {
  universalClient,
  withDelegate,
  withEnvironments,
  withTelemetry,
  withHooks,
  withOffline,
  withMethods
} from 'universal-client';

const client = universalClient(
  // 1. Set up delegate
  withDelegate({ type: 'http', impl: 'fetch' }),

  // 2. Add environment management
  withEnvironments({
    name: 'delegate',
    environments: {
      development: 'http://localhost:3000',
      production: 'https://api.example.com'
    },
    default: 'development'
  }),

  // 3. Add telemetry
  withTelemetry({
    enableMetrics: true,
    enableLogging: true,
    onEvent: (event) => {
      // Send to analytics
      console.log('Analytics:', event);
    }
  }),

  // 4. Add hooks
  withHooks({
    onBeforeRequest: (method, url) => {
      console.log(`[${method}] ${url}`);
    },
    onError: (method, url, error) => {
      // Send to error tracking service
      console.error('Error:', error);
    }
  }),

  // 5. Add offline support
  withOffline({
    name: 'delegate',
    enableQueue: true
  }),

  // 6. Define methods
  withMethods(({ delegate }) => ({
    getUsers: () => delegate.get<User[]>('/users'),
    getUser: (id: number) => delegate.get<User>(`/users/${id}`),
    createUser: (data: Omit<User, 'id'>) => delegate.post<User>('/users', data),
  })),
);

// All features work together
client.environments.setEnvironment('production');
const users = await client.getUsers();
const metrics = client.telemetry.getMetrics();
```

## WebSocket with Features

Features also work with WebSocket:

```typescript
import { universalClient, withDelegate, withTelemetry, withMethods } from 'universal-client';

const wsClient = universalClient(
  withDelegate({ type: 'websocket', url: 'wss://echo.websocket.org' }),
  withTelemetry({
    enableLogging: true,
    onEvent: (event) => {
      console.log('WebSocket event:', event);
    }
  }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),
    sendMessage: (message: string) => delegate.send(message),
    onMessage: (callback: (data: unknown) => void) => delegate.onMessage(callback),
  })),
);

// Telemetry will track WebSocket events
wsClient.connect();
wsClient.sendMessage('Hello');
```

## Server-Sent Events with Features

```typescript
import { universalClient, withDelegate, withHooks, withMethods } from 'universal-client';

const sseClient = universalClient(
  withDelegate({ type: 'sse', url: 'https://your-sse-server.com/events' }),
  withHooks({
    onInit: () => {
      console.log('SSE client initialized');
    }
  }),
  withMethods(({ delegate }) => ({
    connect: () => delegate.connect(),
    disconnect: () => delegate.close(),
    onMessage: (callback: (data: unknown) => void) => delegate.onMessage(callback),
    onEvent: (event: string, callback: (data: unknown) => void) => delegate.subscribe(event, callback),
  })),
);

// Connect and listen
sseClient.connect();
sseClient.onMessage((data) => {
  console.log('Message:', data);
});
```

## Creating Custom Features

You can create your own features:

```typescript
import type { Feature } from 'universal-client';

interface CacheConfig {
  ttl: number;
  maxSize: number;
}

interface CacheFeature {
  cache: {
    clear: () => void;
    size: () => number;
  };
}

function withCache<Input>(config: CacheConfig): Feature<Input & CacheFeature, Input> {
  return (input: Input) => {
    const cache = new Map();

    // Auto-cleanup expired entries
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (value.expiresAt < now) {
          cache.delete(key);
        }
      }
    }, config.ttl);

    return {
      ...input,
      cache: {
        clear: () => cache.clear(),
        size: () => cache.size,
      }
    };
  };
}

// Use custom feature
const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withCache({ ttl: 60000, maxSize: 100 }),
  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get<User>(`/users/${id}`),
  })),
);

// Access custom feature
console.log('Cache size:', client.cache.size());
client.cache.clear();
```

## Production-Ready Example

Complete example with all features for production use:

```typescript
import {
  universalClient,
  withDelegate,
  withEnvironments,
  withTelemetry,
  withHooks,
  withOffline,
  withMethods
} from 'universal-client';

const client = universalClient(
  withDelegate({
    type: 'http',
    impl: 'fetch',
    lazy: true  // Lazy load the delegate
  }),

  withEnvironments({
    name: 'delegate',
    environments: {
      development: 'http://localhost:3000',
      staging: 'https://staging-api.company.com',
      production: 'https://api.company.com'
    },
    default: process.env.NODE_ENV === 'production' ? 'production' : 'development'
  }),

  withTelemetry({
    enableMetrics: true,
    enableTracing: true,
    enableLogging: process.env.NODE_ENV !== 'production',
    onEvent: (event) => {
      // Send to analytics service
      if (event.type === 'error') {
        // Sentry.captureException(event.error);
      }
    },
    onMetrics: (metrics) => {
      // Report metrics to monitoring service
      // Datadog.gauge('api.requests.total', metrics.requests.total);
    }
  }),

  withHooks({
    onInit: () => {
      console.log('API client initialized');
    },
    onBeforeRequest: (method, url) => {
      // Add auth token, rate limiting, etc.
    },
    onError: (method, url, error) => {
      // Global error handling
      console.error(`[${method}] ${url} failed:`, error);
    }
  }),

  withOffline({
    name: 'delegate',
    enableQueue: true,
    maxQueueSize: 50,
    onOffline: () => {
      // Show offline banner
      console.warn('You are offline. Requests will be queued.');
    },
    onOnline: async () => {
      // Hide offline banner
      console.info('You are back online. Processing queued requests...');
    }
  }),

  withMethods(({ delegate }) => ({
    // User API
    getUsers: () => delegate.get<User[]>('/users'),
    getUser: (id: number) => delegate.get<User>(`/users/${id}`),
    createUser: (data: Omit<User, 'id'>) => delegate.post<User>('/users', data),
    updateUser: (id: number, data: Partial<User>) => delegate.patch<User>(`/users/${id}`, data),
    deleteUser: (id: number) => delegate.delete<void>(`/users/${id}`),

    // Post API
    getPosts: () => delegate.get<Post[]>('/posts'),
    getPost: (id: number) => delegate.get<Post>(`/posts/${id}`),
    createPost: (data: Omit<Post, 'id'>) => delegate.post<Post>('/posts', data),
  })),
);

// Usage
async function main() {
  try {
    // Switch to production if needed
    if (process.env.API_ENV === 'production') {
      client.environments.setEnvironment('production');
    }

    // Make requests
    const users = await client.getUsers();
    console.log('Users:', users);

    // Check metrics
    const metrics = client.telemetry.getMetrics();
    console.log('Performance:', {
      total: metrics.requests.total,
      success: metrics.requests.success,
      avgLatency: metrics.latency.avg
    });
  } catch (error) {
    console.error('Application error:', error);
  }
}

main();
```

## Key Benefits

- **Composable**: Stack features to build exactly what you need
- **Type Safe**: Full TypeScript support with proper type inference
- **Production Ready**: Built-in monitoring, error handling, and offline support
- **Flexible**: Create custom features for your specific needs
- **Observable**: Track every request with telemetry
- **Environment Aware**: Easy environment switching
- **Resilient**: Offline support with request queueing
