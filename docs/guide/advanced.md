---
title: Advanced Features
outline: deep
---

# Advanced Features

Learn how to use telemetry, environments, hooks, offline support, and custom features.

## Telemetry

```typescript
import { universalClient, withDelegate, withTelemetry, withMethods } from 'universal-client';

interface User { id: number; name: string; email: string; }

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withTelemetry({
    enableMetrics: true,
    enableTracing: true,
    enableLogging: true,
    onEvent: (event) => console.log('Telemetry event:', event),
    onMetrics: (metrics) => console.log('Metrics updated:', metrics),
  }),
  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get<User>(`https://jsonplaceholder.typicode.com/users/${id}`),
    getAllUsers: () => delegate.get<User[]>('https://jsonplaceholder.typicode.com/users'),
  })),
);

const user = await client.getUser(1);
const metrics = client.telemetry.getMetrics();
console.log('Total requests:', metrics.requests.total);
console.log('Average latency:', metrics.latency.avg);
```

## Environment Management

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

console.log('Current:', client.environments.getCurrentEnvironment());
client.environments.setEnvironment('production');
const users = await client.getUsers();
```

## Hooks System

```typescript
import { universalClient, withDelegate, withHooks, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withHooks({
    onInit: () => console.log('Client initialized'),
    onBeforeRequest: (method, url) => console.log(`Making ${method} request to ${url}`),
    onAfterRequest: (method, url, result) => console.log(`Request to ${url} completed`),
    onError: (method, url, error) => console.error(`Request to ${url} failed:`, error),
  }),
  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get<User>(`https://jsonplaceholder.typicode.com/users/${id}`),
  })),
);
```

## Offline Support

```typescript
import { universalClient, withDelegate, withOffline, withMethods } from 'universal-client';

interface Post { id: number; userId: number; title: string; body: string; }

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withOffline({
    name: 'delegate',
    enableQueue: true,
    maxQueueSize: 100,
    onOnline: () => console.log('Online, processing queued requests'),
    onOffline: () => console.log('Offline, queueing requests'),
    onQueueProcessed: (count) => console.log(`Processed ${count} queued requests`),
  }),
  withMethods(({ delegate }) => ({
    createPost: (data: Post) => delegate.post<Post>('https://jsonplaceholder.typicode.com/posts', data),
  })),
);

const queueSize = client.offline.getQueueSize();
await client.offline.processQueue();
```

## Combining Multiple Features

```typescript
import {
  universalClient, withDelegate, withEnvironments,
  withTelemetry, withHooks, withOffline, withMethods
} from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withEnvironments({
    name: 'delegate',
    environments: { development: 'http://localhost:3000', production: 'https://api.example.com' },
    default: 'development'
  }),
  withTelemetry({ enableMetrics: true, enableLogging: true }),
  withHooks({
    onBeforeRequest: (method, url) => console.log(`[${method}] ${url}`),
    onError: (method, url, error) => console.error('Error:', error),
  }),
  withOffline({ name: 'delegate', enableQueue: true }),
  withMethods(({ delegate }) => ({
    getUsers: () => delegate.get<User[]>('/users'),
    getUser: (id: number) => delegate.get<User>(`/users/${id}`),
    createUser: (data: Omit<User, 'id'>) => delegate.post<User>('/users', data),
  })),
);

client.environments.setEnvironment('production');
const users = await client.getUsers();
const metrics = client.telemetry.getMetrics();
```

## Creating Custom Features

```typescript
import type { Feature } from 'universal-client';

interface CacheConfig { ttl: number; maxSize: number; }
interface CacheFeature { cache: { clear: () => void; size: () => number } }

function withCache<Input>(config: CacheConfig): Feature<Input & CacheFeature, Input> {
  return (input: Input) => {
    const cache = new Map();

    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (value.expiresAt < now) cache.delete(key);
      }
    }, config.ttl);

    return {
      ...input,
      cache: { clear: () => cache.clear(), size: () => cache.size }
    };
  };
}

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withCache({ ttl: 60000, maxSize: 100 }),
  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get<User>(`/users/${id}`),
  })),
);

console.log('Cache size:', client.cache.size());
client.cache.clear();
```

## Production-Ready Example

```typescript
import {
  universalClient, withDelegate, withEnvironments,
  withTelemetry, withHooks, withOffline, withMethods
} from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch', lazy: true }),
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
  }),
  withHooks({
    onInit: () => console.log('API client initialized'),
    onError: (method, url, error) => console.error(`[${method}] ${url} failed:`, error),
  }),
  withOffline({
    name: 'delegate',
    enableQueue: true,
    maxQueueSize: 50,
    onOffline: () => console.warn('Offline. Requests will be queued.'),
    onOnline: async () => console.info('Back online. Processing queue...'),
  }),
  withMethods(({ delegate }) => ({
    getUsers: () => delegate.get<User[]>('/users'),
    getUser: (id: number) => delegate.get<User>(`/users/${id}`),
    createUser: (data: Omit<User, 'id'>) => delegate.post<User>('/users', data),
    updateUser: (id: number, data: Partial<User>) => delegate.patch<User>(`/users/${id}`, data),
    deleteUser: (id: number) => delegate.delete<void>(`/users/${id}`),
  })),
);

async function main() {
  if (process.env.API_ENV === 'production') {
    client.environments.setEnvironment('production');
  }

  const users = await client.getUsers();
  const metrics = client.telemetry.getMetrics();
  console.log('Performance:', {
    total: metrics.requests.total,
    success: metrics.requests.success,
    avgLatency: metrics.latency.avg
  });
}

main();
```
