# Universal Client

A flexible and extensible universal client for web applications supporting multiple transport protocols (HTTP, WebSocket, Server-Sent Events) inspired by @ngrx/signals syntax.

## Features

- 🔌 Multiple transport protocols support (HTTP, WebSocket, SSE)
- 🎣 Hooks system
- 🛠️ Extensible through features
- 🔧 Configurable through delegates
- 📦 Tree-shakeable
- 🦾 Fully typed

## Installation

**📦 npm**
```bash
npm install @kevinbonnoron/universal-client
```

**🧶 yarn**
```bash
yarn add @kevinbonnoron/universal-client
```

**📌 pnpm**
```bash
pnpm add @kevinbonnoron/universal-client
```

**🍞 bun**
```bash
bun add @kevinbonnoron/universal-client
```

**🦕 deno**
```bash
deno add @kevinbonnoron/universal-client
```

## Quick Start

```ts
import { universalClient, withDelegate, withMethods } from '@kevinbonnoron/universal-client';

const client = universalClient(
  // Can use axios, fetch or better-fetch as implementation
  withDelegate({ type: 'http', impl: 'axios', baseURL: 'https://jsonplaceholder.typicode.com' }),
  withMethods(({ delegate }) => ({
    getUser: (id: string) => delegate.get(`/users/${id}`),
  })),
);

const user = await client.getUser('1');
console.log(user);
```

## Examples

Check out the [`examples/`](./examples) directory for comprehensive TypeScript examples:

- **[Basic Usage](./examples/basic-usage.md)** - HTTP requests, CRUD operations, error handling with complete type safety
- **[WebSocket](./examples/websocket-example.md)** - Real-time communication with typed message handling
- **[Server-Sent Events](./examples/sse-example.md)** - Receiving real-time updates with custom event types
- **[Advanced Features](./examples/advanced-features.md)** - Production-ready patterns: hooks, caching, authentication, retry logic

Each example includes complete TypeScript code with detailed explanations, type definitions, and real-world usage patterns.
