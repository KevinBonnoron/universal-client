# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Universal Client is a flexible, extensible universal client library for web applications. It supports multiple transport protocols (HTTP, WebSocket, Server-Sent Events) with a composable feature-based architecture inspired by @ngrx/signals.

Key characteristics:
- **Feature-based composition**: Client functionality is built by composing features using `universalClient(...features)`
- **Tree-shakeable**: Only bundles what you use
- **Delegate pattern**: HTTP implementation can use fetch (default, no deps), axios, or better-fetch
- **Lazy loading**: HTTP and SSE delegates are loaded lazily to minimize bundle size
- **Full TypeScript**: Complex type inference for composing up to 10 features

## Development Commands

### Testing
```bash
bun test                              # Run all tests
bun run test:watch                    # Run tests in watch mode
bun run test:coverage                 # Run tests with coverage report
bun test src/path/to/file.spec.ts    # Run single test file
```
Tests use Bun's built-in test runner. Test files use `.spec.ts` extension (not `.test.ts`).
Coverage reports are generated in `coverage/` directory (lcov and text formats).

### Linting & Formatting
```bash
bun run lint         # Check code with Biome
bun run lint:fix     # Fix linting issues
bun run format       # Format code
bun run type-check    # TypeScript type checking
```
Uses Biome for linting and formatting. Configuration in `biome.json`:
- Tabs for indentation (default), spaces for JS/JSON
- Single quotes for JavaScript
- Line width: 250 characters

### Building
```bash
bun run build              # Production build (minified + sourcemaps)
bun run build:watch        # Build in watch mode
bun run dev                # Alias for build:watch
bun run build:analyze      # Build + bundle size analysis
```
Uses tsup to build both CJS and ESM formats with:
- Minification enabled
- Source maps for debugging
- Type declarations (.d.ts)
- Banner with version/license info

### CI/CD
- **Pull Requests**: Automatically run tests (with coverage), lint, type-check, build, and post bundle sizes
- **Main branch**: Full test suite with coverage upload, then publishes to npm and JSR if all checks pass
- **Coverage**: Uploaded to Codecov (if CODECOV_TOKEN configured)

## Architecture

### Core Concept: Features

The entire library is built around the `Feature` type:
```typescript
type Feature<Input = unknown, Output = Input> = (input: Input) => Output
```

Features are functions that receive the current client state (`Input`) and return new properties/methods (`Output`). The `universalClient()` function composes features sequentially, merging their outputs.

**Two types of features:**

1. **Feature**: Generic features that don't require a delegate to exist (e.g., `withDelegate`, `withHooks`, `withMethods`)
2. **DelegateFeature**: Features that require an existing delegate (e.g., `withInterceptor`, `withOffline`, `withTelemetry`)

### Client Composition Flow

1. **Type-safe merging**: `universalClient()` has overloads supporting 1-10 features with progressive type merging using the `Merge<A, B>` helper
2. **Sequential execution**: Features execute in order, each receiving the accumulated state
3. **Hook collection**: `onInit` hooks are collected from all features and called after client construction
4. **Final cleanup**: `onInit` is removed from the final client object

See `src/universal-client.ts:74-102` for the implementation.

### Built-in Features

Features are organized into two categories:

**Core Features** (`src/features/core/`):
- **withDelegate**: Adds a delegate (HTTP/WebSocket/SSE) to the client. Supports custom naming via `{ name: 'customName' }` option. Can apply sub-features to the delegate itself.
- **withMethods**: Adds custom methods that can access the client state (typically to use the delegate)
- **withHooks**: Adds lifecycle hooks like `onInit`

**Delegate Features** (`src/features/delegate/`):
- **withInterceptor**: Adds HTTP interceptors (before/after/error hooks) to an HTTP delegate
- **withEnvironments**: Environment-based configuration with dynamic URL switching
- **withOffline**: Offline handling capabilities with caching strategies
- **withTelemetry**: Telemetry/monitoring integration for tracking requests

### Delegates

Delegates are the transport layer implementations. Located in `src/utils/delegate/`:

**HTTP Delegates** (`src/utils/delegate/http/`):
- `fetch-delegate.utils.ts`: Default implementation using native fetch (no dependencies)
- `axios-delegate.utils.ts`: Axios implementation (peer dependency)
- `better-fetch-delegate.utils.ts`: Better-fetch implementation (peer dependency)

**Important**: HTTP and SSE delegates use lazy loading wrappers (`createLazyHttpDelegate`, `createLazyServerSentEventDelegate` in `src/utils/delegate.utils.ts`) to defer importing optional dependencies until first use.

**WebSocket Delegate**: Direct implementation, not lazy-loaded

**Delegate Type Guards**: Use `isHttpDelegate()`, `isWebSocketDelegate()`, `isServerSentEventDelegate()` from `src/utils/delegate.utils.ts` to check delegate types.

### Type System

Core types in `src/types/`:
- `feature.type.ts`: Base `Feature<Output, Input>` type
- `delegate.type.ts`: `Delegate`, `HttpDelegate`, `WebSocketDelegate`, `ServerSentEventDelegate` interfaces
- `delegate-feature.type.ts`: `DelegateFeature<O, D>` for features that operate on delegates

## Bundle Size Optimization

- HTTP delegate defaults to fetch (zero dependencies)
- Axios and better-fetch are peer dependencies (optional)
- Delegates are lazy-loaded via dynamic imports
- Tree-shaking enabled in tsup config
- `axios` and `@better-fetch/fetch` marked as external in tsup

## Writing Features

### Core Features (Generic)

Pattern for creating features that don't require a delegate:

```typescript
export function withMyFeature<Input>(options: MyOptions): Feature<Input, Output & Input> {
  return (input: Input) => {
    // Feature logic here
    return {
      ...input,
      // New methods/properties
    };
  };
}
```

Place these in `src/features/core/`.

### Delegate Features

Pattern for creating features that modify/wrap an existing delegate:

```typescript
export function withMyDelegateFeature(options: MyOptions): DelegateFeature<HttpDelegate> {
  return ({ delegate, ...rest }) => {
    // Wrap or modify the delegate
    return {
      ...rest,
      delegate: wrapDelegate(delegate, options),
    };
  };
}
```

Place these in `src/features/delegate/`. The `DelegateFeature` type ensures the delegate is available in the input.

## Testing Patterns

- Use `bun:test` imports: `describe`, `expect`, `it`, `mock`
- Test files end with `.spec.ts`
- Mock external dependencies when testing delegates
- Test type inference for feature composition where applicable
