---
title: Getting Started
outline: deep
---

# Getting Started

Universal Client is a flexible and extensible client library for web applications supporting multiple transport protocols (HTTP, WebSocket, Server-Sent Events) inspired by @ngrx/signals syntax.

## Installation

::: code-group

```bash [npm]
npm install universal-client
```

```bash [yarn]
yarn add universal-client
```

```bash [pnpm]
pnpm add universal-client
```

```bash [bun]
bun add universal-client
```

```bash [deno]
deno add @kevinbonnoron/universal-client
```

:::

> **Note**: On JSR, the package is published as `@kevinbonnoron/universal-client` (scoped), but on npm it's `universal-client` (unscoped).

## Quick Start

```ts
import { universalClient, withFetchDelegate, withMethods } from 'universal-client';

const client = universalClient(
  withFetchDelegate({ baseURL: 'https://jsonplaceholder.typicode.com' }),
  // withBetterFetchDelegate({ baseURL: 'https://jsonplaceholder.typicode.com' }),
  // withAxiosDelegate({ baseURL: 'https://jsonplaceholder.typicode.com' }),
  withMethods(({ delegate }) => ({
    getUser: (id: string) => delegate.get(`/users/${id}`),
  })),
);

const user = await client.getUser('1');
console.log(user);
```

## Features

- **Multi-Protocol** - HTTP, WebSocket, and SSE support
- **Feature Composition** - Build clients by composing features
- **Tree-Shakeable** - Only bundle what you use
- **Fully Typed** - Complete TypeScript support
- **Delegate Pattern** - Choose between fetch (default), axios, or better-fetch
- **Lazy Loading** - HTTP and SSE delegates are loaded lazily

## Next Steps

- [Basic Usage](/guide/basic-usage) - HTTP requests, CRUD operations, error handling
- [Interceptors](/guide/interceptors) - Transform requests/responses, add auth
- [WebSocket](/guide/websocket) - Real-time communication
- [Server-Sent Events](/guide/sse) - Receiving real-time updates
- [Advanced Features](/guide/advanced) - Telemetry, environments, hooks, offline support
