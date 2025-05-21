# Universal Client

A flexible and extensible universal client for web applications supporting multiple transport protocols (HTTP, WebSocket, Server-Sent Events).

## Features

- 🔌 Multiple transport protocols support (HTTP, WebSocket, SSE)
- 🎣 Hooks system
- 🛠️ Extensible through features
- 🔧 Configurable through delegates
- 📦 Tree-shakeable
- 🦾 Fully typed

## Installation

```bash
npm install @kevinbonnoron/universal-client
```

## Example

```ts
import { universalClient, withDelegate, withMethods } from '@kevinbonnoron/universal-client';

const client = universalClient(
  withDelegate(createFetchDelegate({ baseURL: 'https://jsonplaceholder.typicode.com' })),
  withMethods(({ delegate }) => ({
    getUser: (id: string) => delegate.get(`/users/${id}`),
  })),
);

const user = await client.getUser('1');
console.log(user);
```
