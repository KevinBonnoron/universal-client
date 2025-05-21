import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { HttpDelegate } from '../../../types';
import { withTelemetry } from './with-telemetry.feature';

const mockConsole = {
  log: mock(() => {}),
  error: mock(() => {}),
  info: mock(() => {}),
  warn: mock(() => {}),
};

Object.defineProperty(global, 'console', {
  value: mockConsole,
  writable: true,
});

describe('withTelemetry', () => {
  let mockHttpDelegate: {
    get: ReturnType<typeof mock>;
    post: ReturnType<typeof mock>;
    patch: ReturnType<typeof mock>;
    put: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };
  let mockWebSocketDelegate: {
    connect: ReturnType<typeof mock>;
    send: ReturnType<typeof mock>;
    onOpen: ReturnType<typeof mock>;
    onClose: ReturnType<typeof mock>;
    onError: ReturnType<typeof mock>;
    onMessage: ReturnType<typeof mock>;
    close: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockHttpDelegate = {
      get: mock(async (url: string) => ({ url, data: 'test' })),
      post: mock(async (url: string, body: unknown) => ({ url, body, data: 'created' })),
      patch: mock(async (url: string, body: unknown) => ({ url, body, data: 'updated' })),
      put: mock(async (url: string, body: unknown) => ({ url, body, data: 'replaced' })),
      delete: mock(async (url: string) => ({ url, data: 'deleted' })),
    };

    mockWebSocketDelegate = {
      connect: mock(() => {}),
      send: mock(async (_message: string) => {}),
      onOpen: mock((_callback: (event: Event) => void) => () => {}),
      onClose: mock((_callback: (event: CloseEvent) => void) => () => {}),
      onError: mock((_callback: (event: Event) => void) => () => {}),
      onMessage: mock((_callback: (message: string) => void) => () => {}),
      close: mock(async () => {}),
    };
  });

  it('should create telemetry feature with default options', () => {
    const feature = withTelemetry();
    const result = feature({ delegate: mockHttpDelegate });

    expect(result.telemetry).toBeDefined();
    expect(result.telemetry.generateTraceId()).toBeUndefined();
    expect(result.telemetry.getMetrics()).toEqual({
      requests: { total: 0, success: 0, errors: 0 },
      latency: { avg: 0, min: 0, max: 0 },
    });
  });

  it('should create telemetry feature with custom options', () => {
    const options = {
      enableMetrics: true,
      enableTracing: true,
      enableLogging: true,
      onEvent: mock(() => {}),
      onMetrics: mock(() => {}),
    };
    const feature = withTelemetry(options);
    const result = feature({ delegate: mockHttpDelegate });

    expect(result.telemetry).toBeDefined();
    expect(result.telemetry.generateTraceId()).toBeDefined();
  });

  it('should record HTTP request events', async () => {
    const onEvent = mock(() => {});
    const feature = withTelemetry({
      enableTracing: true,
      onEvent,
    });
    const result = feature({ delegate: mockHttpDelegate });

    await (result as { delegate: HttpDelegate }).delegate.get('/api/test');

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'request',
        operation: 'GET /api/test',
        traceId: expect.any(String),
      }),
    );

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'response',
        operation: 'GET /api/test',
        duration: expect.any(Number),
        status: 200,
        traceId: expect.any(String),
      }),
    );
  });

  it('should record HTTP error events', async () => {
    const errorDelegate = {
      ...mockHttpDelegate,
      get: mock(async () => {
        throw new Error('Network error');
      }),
    };

    const onEvent = mock(() => {});
    const feature = withTelemetry({
      enableTracing: true,
      onEvent,
    });
    const result = feature({ delegate: errorDelegate });

    await expect((result as { delegate: HttpDelegate }).delegate.get('/api/test')).rejects.toThrow('Network error');

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'request',
        operation: 'GET /api/test',
        traceId: expect.any(String),
      }),
    );

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        operation: 'GET /api/test',
        duration: expect.any(Number),
        error: expect.any(Error),
        traceId: expect.any(String),
      }),
    );
  });

  it('should track metrics when enabled', async () => {
    const onMetrics = mock(() => {});
    const feature = withTelemetry({
      enableMetrics: true,
      onMetrics,
    });
    const result = feature({ delegate: mockHttpDelegate });

    await (result as { delegate: HttpDelegate }).delegate.get('/api/test');
    await (result as { delegate: HttpDelegate }).delegate.post('/api/test', { data: 'test' });

    expect(onMetrics).toHaveBeenCalled();

    const metrics = result.telemetry.getMetrics();
    expect(metrics.requests.total).toBe(2);
    expect(metrics.requests.success).toBe(2);
    expect(metrics.requests.errors).toBe(0);
    expect(metrics.latency.avg).toBeGreaterThanOrEqual(0);
  });

  it('should track error metrics', async () => {
    const errorDelegate = {
      ...mockHttpDelegate,
      get: mock(async () => {
        throw new Error('Network error');
      }),
    };

    const feature = withTelemetry({ enableMetrics: true });
    const result = feature({ delegate: errorDelegate });

    await expect((result as { delegate: HttpDelegate }).delegate.get('/api/test')).rejects.toThrow('Network error');

    const metrics = result.telemetry.getMetrics();
    expect(metrics.requests.total).toBe(1);
    expect(metrics.requests.success).toBe(0);
    expect(metrics.requests.errors).toBe(1);
  });

  it('should work with WebSocket delegate', () => {
    const onEvent = mock(() => {});
    const feature = withTelemetry({
      enableTracing: true,
      onEvent,
    });
    const result = feature({ delegate: mockWebSocketDelegate });

    (result as { delegate: { connect: () => void } }).delegate.connect();

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'request',
        operation: 'connect',
        traceId: expect.any(String),
      }),
    );

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'response',
        operation: 'connect',
        duration: expect.any(Number),
        status: 200,
        traceId: expect.any(String),
      }),
    );
  });

  it('should handle WebSocket send operations', async () => {
    const onEvent = mock(() => {});
    const feature = withTelemetry({
      enableTracing: true,
      onEvent,
    });
    const result = feature({ delegate: mockWebSocketDelegate });

    (result as { delegate: { send: (message: string) => void } }).delegate.send('test message');

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'request',
        operation: 'send',
        traceId: expect.any(String),
      }),
    );

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'response',
        operation: 'send',
        duration: expect.any(Number),
        status: 200,
        traceId: expect.any(String),
      }),
    );
  });

  it('should handle WebSocket onMessage operations', () => {
    const onEvent = mock(() => {});
    const feature = withTelemetry({
      enableTracing: true,
      onEvent,
    });
    const result = feature({ delegate: mockWebSocketDelegate });

    const unsubscribe = (result as { delegate: { onMessage: (callback: (message: string) => void) => () => void } }).delegate.onMessage(() => {});

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'request',
        operation: 'onMessage',
        traceId: expect.any(String),
      }),
    );

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'response',
        operation: 'onMessage',
        duration: expect.any(Number),
        status: 200,
        traceId: expect.any(String),
      }),
    );

    expect(typeof unsubscribe).toBe('function');
  });

  it('should handle WebSocket close operations', async () => {
    const onEvent = mock(() => {});
    const feature = withTelemetry({
      enableTracing: true,
      onEvent,
    });
    const result = feature({ delegate: mockWebSocketDelegate });

    (result as { delegate: { close: () => void } }).delegate.close();

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'request',
        operation: 'close',
        traceId: expect.any(String),
      }),
    );

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'response',
        operation: 'close',
        duration: expect.any(Number),
        status: 200,
        traceId: expect.any(String),
      }),
    );
  });

  it('should handle WebSocket errors', async () => {
    const errorWebSocketDelegate = {
      ...mockWebSocketDelegate,
      connect: mock(() => {
        throw new Error('Connection failed');
      }),
    };

    const onEvent = mock(() => {});
    const feature = withTelemetry({
      enableTracing: true,
      onEvent,
    });
    const result = feature({ delegate: errorWebSocketDelegate });

    expect(() => (result as { delegate: { connect: () => void } }).delegate.connect()).toThrow('Connection failed');

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'request',
        operation: 'connect',
        traceId: expect.any(String),
      }),
    );

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        operation: 'connect',
        duration: expect.any(Number),
        error: expect.any(Error),
        traceId: expect.any(String),
      }),
    );
  });

  it('should not generate trace IDs when tracing is disabled', () => {
    const feature = withTelemetry({ enableTracing: false });
    const result = feature({ delegate: mockHttpDelegate });

    expect(result.telemetry.generateTraceId()).toBeUndefined();
  });

  it('should not track metrics when metrics are disabled', async () => {
    const feature = withTelemetry({ enableMetrics: false });
    const result = feature({ delegate: mockHttpDelegate });

    await (result as { delegate: HttpDelegate }).delegate.get('/api/test');

    const metrics = result.telemetry.getMetrics();
    expect(metrics.requests.total).toBe(0);
    expect(metrics.requests.success).toBe(0);
    expect(metrics.requests.errors).toBe(0);
  });

  it('should work with all HTTP methods', async () => {
    const onEvent = mock(() => {});
    const feature = withTelemetry({
      enableTracing: true,
      onEvent,
    });
    const result = feature({ delegate: mockHttpDelegate });

    await (result as { delegate: HttpDelegate }).delegate.get('/api/test');
    await (result as { delegate: HttpDelegate }).delegate.post('/api/test', { data: 'test' });
    await (result as { delegate: HttpDelegate }).delegate.patch('/api/test', { data: 'test' });
    await (result as { delegate: HttpDelegate }).delegate.put('/api/test', { data: 'test' });
    await (result as { delegate: HttpDelegate }).delegate.delete('/api/test');

    expect(onEvent).toHaveBeenCalledTimes(10);
  });
});
