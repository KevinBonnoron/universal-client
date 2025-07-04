import type { Delegate, DelegateFeature, HttpDelegate, WebSocketDelegate } from '../../types';
import { isHttpDelegate, isWebSocketDelegate } from '../../utils';

interface TelemetryEvent {
  timestamp: number;
  type: 'request' | 'response' | 'error';
  operation: string;
  duration?: number;
  status?: number;
  error?: Error;
  traceId?: string;
}

interface TelemetryMetrics {
  requests: { total: number; success: number; errors: number };
  latency: { avg: number; min: number; max: number };
}

interface TelemetryCollector {
  recordEvent: (event: TelemetryEvent) => void;
  generateTraceId: () => string | undefined;
  getMetrics: () => TelemetryMetrics;
}

interface TelemetryOptions {
  enableMetrics?: boolean;
  enableTracing?: boolean;
  enableLogging?: boolean;
  onEvent?: (event: TelemetryEvent) => void;
  onMetrics?: (metrics: TelemetryMetrics) => void;
}

function createTelemetryCollector({ enableMetrics = false, enableTracing = false, enableLogging = false, onEvent = () => { }, onMetrics = () => { } }: TelemetryOptions): TelemetryCollector {
  const events: TelemetryEvent[] = [];
  const metrics: TelemetryMetrics = {
    requests: { total: 0, success: 0, errors: 0 },
    latency: { avg: 0, min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER },
  };

  function recordEvent(event: TelemetryEvent): void {
    events.push(event);
    updateMetrics(event);

    if (enableLogging) {
      logEvent(event);
    }

    onEvent(event);
  }

  function generateTraceId(): string | undefined {
    return enableTracing ? Math.random().toString(36).substring(2, 15) : undefined;
  }

  function getMetrics(): TelemetryMetrics {
    return {
      requests: enableMetrics ? metrics.requests : { total: 0, success: 0, errors: 0 },
      latency: enableMetrics ? metrics.latency : { avg: 0, min: 0, max: 0 },
    };
  }

  function updateMetrics(event: TelemetryEvent): void {
    if (!enableMetrics) {
      return;
    }

    switch (event.type) {
      case 'request':
        metrics.requests.total++;
        break;

      case 'response':
        metrics.requests.success++;
        if (event.duration) {
          updateLatency(event.duration);
        }
        break;

      case 'error':
        metrics.requests.errors++;
        if (event.duration) {
          updateLatency(event.duration);
        }
        break;
    }

    onMetrics(metrics);
  }

  function updateLatency(duration: number): void {
    const latencies = events
      .filter((event): event is TelemetryEvent & { duration: number } => event.duration !== undefined)
      .map((event) => event.duration)
      .filter((d) => d > 0);

    if (latencies.length > 0) {
      metrics.latency.avg = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      metrics.latency.min = Math.min(metrics.latency.min, duration);
      metrics.latency.max = Math.max(metrics.latency.max, duration);
    }
  }

  function logEvent(event: TelemetryEvent): void {
    const logLevel = event.type === 'error' ? 'error' : 'info';
    const message = `[TELEMETRY] ${event.operation} ${event.duration ? `(${event.duration}ms)` : ''}`;

    if (event.type === 'error' && event.error) {
      console[logLevel](message, event.error);
    } else {
      console[logLevel](message);
    }
  }

  return {
    recordEvent,
    generateTraceId,
    getMetrics,
  };
}

function wrapHttpDelegateWithTelemetry(delegate: HttpDelegate, collector: TelemetryCollector): HttpDelegate {
  const wrapMethod = (methodName: keyof HttpDelegate) => {
    const method = delegate[methodName];
    return async <T>(url: string, body?: unknown) => {
      const traceId = collector.generateTraceId();
      const operation = `${String(methodName).toUpperCase()} ${url}`;
      const startTime = Date.now();

      collector.recordEvent({
        timestamp: startTime,
        type: 'request',
        operation,
        traceId,
      });

      try {
        const result: T = await method(url, body);
        const duration = Date.now() - startTime;

        collector.recordEvent({
          timestamp: Date.now(),
          type: 'response',
          operation,
          duration,
          status: 200, // TODO: Get status from response
          traceId,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        collector.recordEvent({
          timestamp: Date.now(),
          type: 'error',
          operation,
          duration,
          error: error as Error,
          traceId,
        });

        throw error;
      }
    };
  };

  return {
    get: wrapMethod('get'),
    post: wrapMethod('post'),
    patch: wrapMethod('patch'),
    put: wrapMethod('put'),
    delete: wrapMethod('delete'),
  };
}

function wrapWebSocketDelegateWithTelemetry(delegate: WebSocketDelegate, collector: TelemetryCollector): WebSocketDelegate {
  return {
    ...delegate,
    connect: () => {
      const traceId = collector.generateTraceId();
      const startTime = Date.now();

      collector.recordEvent({
        timestamp: startTime,
        type: 'request',
        operation: 'connect',
        traceId,
      });

      try {
        delegate.connect();
        const duration = Date.now() - startTime;

        collector.recordEvent({
          timestamp: Date.now(),
          type: 'response',
          operation: 'connect',
          duration,
          status: 200,
          traceId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        collector.recordEvent({
          timestamp: Date.now(),
          type: 'error',
          operation: 'connect',
          duration,
          error: error as Error,
          traceId,
        });

        throw error;
      }
    },

    send: async (message: string) => {
      const traceId = collector.generateTraceId();
      const startTime = Date.now();

      collector.recordEvent({
        timestamp: startTime,
        type: 'request',
        operation: 'send',
        traceId,
      });

      try {
        await delegate.send(message);
        const duration = Date.now() - startTime;

        collector.recordEvent({
          timestamp: Date.now(),
          type: 'response',
          operation: 'send',
          duration,
          status: 200,
          traceId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        collector.recordEvent({
          timestamp: Date.now(),
          type: 'error',
          operation: 'send',
          duration,
          error: error as Error,
          traceId,
        });

        throw error;
      }
    },

    onMessage(callback) {
      const traceId = collector.generateTraceId();
      const startTime = Date.now();

      collector.recordEvent({
        timestamp: startTime,
        type: 'request',
        operation: 'onMessage',
        traceId,
      });

      try {
        console.log('onMessage');
        const unsubscribe = delegate.onMessage(callback);
        const duration = Date.now() - startTime;

        collector.recordEvent({
          timestamp: Date.now(),
          type: 'response',
          operation: 'onMessage',
          duration,
          status: 200,
          traceId,
        });
        return unsubscribe;
      } catch (error) {
        const duration = Date.now() - startTime;

        collector.recordEvent({
          timestamp: Date.now(),
          type: 'error',
          operation: 'onMessage',
          duration,
          error: error as Error,
          traceId,
        });

        throw error;
      }
    },

    close: async () => {
      const traceId = collector.generateTraceId();
      const startTime = Date.now();

      collector.recordEvent({
        timestamp: startTime,
        type: 'request',
        operation: 'close',
        traceId,
      });

      try {
        await delegate.close();
        const duration = Date.now() - startTime;

        collector.recordEvent({
          timestamp: Date.now(),
          type: 'response',
          operation: 'close',
          duration,
          status: 200,
          traceId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        collector.recordEvent({
          timestamp: Date.now(),
          type: 'error',
          operation: 'close',
          duration,
          error: error as Error,
          traceId,
        });

        throw error;
      }
    },
  };
}

function wrapDelegateWithTelemetry(delegate: Delegate, collector: TelemetryCollector): unknown {
  if (isHttpDelegate(delegate)) {
    return wrapHttpDelegateWithTelemetry(delegate, collector);
  }

  if (isWebSocketDelegate(delegate)) {
    return wrapWebSocketDelegateWithTelemetry(delegate, collector);
  }

  return delegate;
}

export function withTelemetry(options: TelemetryOptions = {}): DelegateFeature<{ telemetry: TelemetryCollector }> {
  return ({ delegate, ...rest }) => {
    const telemetryCollector = createTelemetryCollector(options);

    return {
      ...rest,
      delegate: wrapDelegateWithTelemetry(delegate, telemetryCollector),
      telemetry: telemetryCollector,
    };
  };
}
