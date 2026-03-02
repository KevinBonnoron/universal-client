---
title: Interceptors
outline: deep
---

# Interceptors

Learn how to use the `withInterceptor` feature to modify requests and responses with custom logic.

## Basic Usage

### Modifying Request URLs

```typescript
import { universalClient, withDelegate, withInterceptor, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withInterceptor({
    name: 'apiPrefix',
    before: (context) => {
      // Add API version prefix to all requests
      return { url: `/api/v1${context.url}` };
    }
  }),
  withMethods(({ delegate }) => ({
    getUsers: () => delegate.get('/users'),
    getUser: (id: number) => delegate.get(`/users/${id}`)
  }))
);

// Request will go to /api/v1/users
const users = await client.getUsers();
```

### Adding Authentication

```typescript
import { universalClient, withDelegate, withInterceptor, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withInterceptor({
    name: 'auth',
    before: (context) => {
      const token = localStorage.getItem('authToken');
      return {
        headers: {
          ...context.headers,
          Authorization: `Bearer ${token}`
        }
      };
    }
  }),
  withMethods(({ delegate }) => ({
    getProfile: () => delegate.get('https://api.example.com/profile'),
    updateProfile: (data: any) => delegate.patch('https://api.example.com/profile', data)
  }))
);

// All requests will include the Authorization header
const profile = await client.getProfile();
```

### Converting ISO Dates to Date Objects

```typescript
import { universalClient, withDelegate, withInterceptor, withMethods } from 'universal-client';

interface User {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withInterceptor({
    name: 'dateConverter',
    after: <T>(context) => {
      const result = context.result as any;

      const convertDates = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;

        if (Array.isArray(obj)) {
          return obj.map(convertDates);
        }

        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            converted[key] = new Date(value);
          } else if (typeof value === 'object') {
            converted[key] = convertDates(value);
          } else {
            converted[key] = value;
          }
        }
        return converted;
      };

      return convertDates(result) as T;
    }
  }),
  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get<User>(`https://api.example.com/users/${id}`)
  }))
);

const user = await client.getUser(1);
console.log(user.createdAt instanceof Date); // true
console.log(user.updatedAt instanceof Date); // true
```

### Adding Request Timestamps

```typescript
import { universalClient, withDelegate, withInterceptor, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withInterceptor({
    name: 'requestEnricher',
    before: (context) => {
      if (context.method !== 'get' && context.method !== 'delete') {
        return {
          body: {
            ...(context.body as object),
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        };
      }
    }
  }),
  withMethods(({ delegate }) => ({
    createPost: (data: { title: string; content: string }) =>
      delegate.post('https://api.example.com/posts', data),
    updatePost: (id: number, data: { title: string; content: string }) =>
      delegate.put(`https://api.example.com/posts/${id}`, data)
  }))
);

// Request body will include timestamp and requestId
await client.createPost({ title: 'Hello', content: 'World' });
```

### Global Error Logging

```typescript
import { universalClient, withDelegate, withInterceptor, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withInterceptor({
    name: 'errorLogger',
    error: (method, url, error) => {
      console.error(`[${method.toUpperCase()}] ${url} failed:`, error);
    }
  }),
  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get(`https://api.example.com/users/${id}`)
  }))
);

try {
  await client.getUser(999);
} catch (error) {
  // Error was already logged by interceptor
  console.log('Handle error in UI');
}
```

### Request/Response Logging

```typescript
import { universalClient, withDelegate, withInterceptor, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withInterceptor({
    name: 'logger',
    before: (context) => {
      console.log(`-> [${context.method.toUpperCase()}] ${context.url}`, context.body);
    },
    after: (context) => {
      console.log(`<- [${context.method.toUpperCase()}] ${context.url}`, context.result);
      return context.result;
    }
  }),
  withMethods(({ delegate }) => ({
    getUsers: () => delegate.get('https://api.example.com/users')
  }))
);

await client.getUsers();
```

## Combining Multiple Interceptors

You can stack multiple `withInterceptor` features to separate concerns:

```typescript
import { universalClient, withDelegate, withInterceptor, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),

  // Authentication interceptor
  withInterceptor({
    name: 'auth',
    before: (context) => ({
      headers: {
        ...context.headers,
        Authorization: `Bearer ${getToken()}`
      }
    })
  }),

  // Date conversion interceptor
  withInterceptor({
    name: 'dateConverter',
    after: (context) => convertDatesToObjects(context.result)
  }),

  // Error logging interceptor
  withInterceptor({
    name: 'log',
    error: (method, url, error) => {
      logError(method, url, error);
    }
  }),

  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get(`https://api.example.com/users/${id}`)
  }))
);

function getToken() {
  return localStorage.getItem('token') || '';
}

function convertDatesToObjects(data: any) {
  // Implementation...
  return data;
}

function logError(method: string, url: string, error: Error) {
  console.error(`[${method}] ${url}:`, error);
}
```

## Real-World Example: API Client with All Features

```typescript
import {
  universalClient,
  withDelegate,
  withEnvironments,
  withInterceptor,
  withTelemetry,
  withMethods,
  type RequestInterceptorContext,
  type ResponseInterceptorContext
} from 'universal-client';

// Date conversion utility
function convertISODatesToObjects<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(convertISODatesToObjects) as T;
  }

  const converted: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      converted[key] = new Date(value);
    } else if (typeof value === 'object' && value !== null) {
      converted[key] = convertISODatesToObjects(value);
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

const apiClient = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),

  withEnvironments({
    name: 'delegate',
    environments: {
      development: 'http://localhost:3000',
      staging: 'https://staging-api.example.com',
      production: 'https://api.example.com'
    },
    default: 'development'
  }),

  // Authentication interceptor
  withInterceptor({
    name: 'auth',
    before: (context: RequestInterceptorContext) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        return {
          headers: {
            ...context.headers,
            Authorization: `Bearer ${token}`,
            'X-Request-ID': crypto.randomUUID()
          }
        };
      }
    },
  }),

  // Response transformation interceptor
  withInterceptor({
    name: 'dateConverter',
    after: <T>(context: ResponseInterceptorContext<T>) => {
      return convertISODatesToObjects(context.result);
    }
  }),

  // Error handling interceptor
  withInterceptor({
    name: 'errorHandler',
    error: (method, url, error) => {
      if (error.message.includes('401')) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      console.error(`API Error [${method.toUpperCase()}] ${url}:`, error);
    }
  }),

  withTelemetry({
    enableMetrics: true,
    enableLogging: process.env.NODE_ENV !== 'production'
  }),

  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get(`/users/${id}`),
    updateUser: (id: number, data: any) => delegate.patch(`/users/${id}`, data),
    getPosts: () => delegate.get('/posts'),
    createPost: (data: any) => delegate.post('/posts', data)
  }))
);

// Usage
apiClient.environments.setEnvironment('production');

const user = await apiClient.getUser(1);
console.log(user.createdAt instanceof Date); // true

const metrics = apiClient.telemetry.getMetrics();
console.log('API Metrics:', metrics);
```

## TypeScript Types

The interceptor uses these types:

```typescript
interface RequestInterceptorContext {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface ResponseInterceptorContext<T = unknown> {
  method: string;
  url: string;
  result: T;
  body?: unknown;
}

interface HttpInterceptor {
  before?: (context: RequestInterceptorContext) =>
    void | Partial<RequestInterceptorContext> | Promise<void | Partial<RequestInterceptorContext>>;
  after?: <T>(context: ResponseInterceptorContext<T>) => T | Promise<T>;
  error?: (method: string, url: string, error: Error, body?: unknown) => void | Promise<void>;
}
```
