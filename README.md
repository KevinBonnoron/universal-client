# Universal Client

[![CI](https://github.com/KevinBonnoron/universal-client/actions/workflows/pr.yml/badge.svg)](https://github.com/KevinBonnoron/universal-client/actions/workflows/pr.yml)
[![Documentation](https://github.com/KevinBonnoron/universal-client/actions/workflows/docs.yml/badge.svg)](https://kevinbonnoron.github.io/universal-client/)
[![npm version](https://img.shields.io/npm/v/universal-client)](https://www.npmjs.com/package/universal-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A flexible and extensible universal client for web applications supporting multiple transport protocols (HTTP, WebSocket, Server-Sent Events) inspired by @ngrx/signals syntax.

## Features

- 🔌 Multiple transport protocols support (HTTP, WebSocket, SSE)
- 🎣 Hooks system
- 🛠️ Extensible through features
- 🔧 Configurable through delegates
- 📦 Tree-shakeable
- 🦾 Fully typed

## Installation

```bash
npm install universal-client
```

> Also available via `yarn`, `pnpm`, `bun`, and [JSR](https://jsr.io/@kevinbonnoron/universal-client) (`deno add @kevinbonnoron/universal-client`).

## Quick Start

```ts
import { universalClient, withDelegate, withMethods } from 'universal-client';

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

## Documentation

Full documentation is available at **[kevinbonnoron.github.io/universal-client](https://kevinbonnoron.github.io/universal-client/)**.

- [Getting Started](https://kevinbonnoron.github.io/universal-client/getting-started)
- [Basic Usage](https://kevinbonnoron.github.io/universal-client/guide/basic-usage) - HTTP requests, CRUD operations, error handling
- [Interceptors](https://kevinbonnoron.github.io/universal-client/guide/interceptors) - Transform requests/responses, add auth
- [WebSocket](https://kevinbonnoron.github.io/universal-client/guide/websocket) - Real-time communication
- [Server-Sent Events](https://kevinbonnoron.github.io/universal-client/guide/sse) - Real-time updates
- [Advanced Features](https://kevinbonnoron.github.io/universal-client/guide/advanced) - Telemetry, environments, hooks, offline support
