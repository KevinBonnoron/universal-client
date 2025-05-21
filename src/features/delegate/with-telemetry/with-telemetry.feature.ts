import type { Delegate, DelegateFeature, WebSocketDelegate } from '../../../types';
import { isHttpDelegate, isWebSocketDelegate, wrapHttpDelegate } from '../../../utils';

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

function createTelemetryCollector({ enableMetrics = false, enableTracing = false, enableLogging = false, onEvent = () => {}, onMetrics = () => {} }: TelemetryOptions): TelemetryCollector {
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

  function updateLatency(_duration: number): void {
    const latencies = events
      .filter((event): event is TelemetryEvent & { duration: number } => event.duration !== undefined)
      .map((event) => event.duration)
      .filter((d) => d > 0);

    if (latencies.length > 0) {
      metrics.latency.avg = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      metrics.latency.min = Math.min(...latencies);
      metrics.latency.max = Math.max(...latencies);
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

function createTelemetryHttpInterceptor(collector: TelemetryCollector) {
  const startTimes = new Map<string, { time: number; traceId: string | undefined }>();

  return {
    before: (context: { method: string; url: string }) => {
      const traceId = collector.generateTraceId();
      const operation = `${context.method.toUpperCase()} ${context.url}`;
      const startTime = Date.now();

      startTimes.set(operation, { time: startTime, traceId });

      collector.recordEvent({
        timestamp: startTime,
        type: 'request',
        operation,
        traceId,
      });

      return undefined;
    },
    after: <T>(context: { method: string; url: string; result: T }) => {
      const operation = `${context.method.toUpperCase()} ${context.url}`;
      const startData = startTimes.get(operation);

      if (startData) {
        const duration = Date.now() - startData.time;

        collector.recordEvent({
          timestamp: Date.now(),
          type: 'response',
          operation,
          duration,
          status: 200,
          traceId: startData.traceId,
        });

        startTimes.delete(operation);
      }

      return context.result;
    },
    error: (method: string, url: string, error: Error) => {
      const operation = `${method.toUpperCase()} ${url}`;
      const startData = startTimes.get(operation);

      if (startData) {
        const duration = Date.now() - startData.time;

        collector.recordEvent({
          timestamp: Date.now(),
          type: 'error',
          operation,
          duration,
          error,
          traceId: startData.traceId,
        });

        startTimes.delete(operation);
      }
    },
  };
}

function wrapWebSocketDelegateWithTelemetry(delegate: WebSocketDelegate, collector: TelemetryCollector): WebSocketDelegate {
  const createTimedOperation = (operation: string) => {
    const traceId = collector.generateTraceId();
    const startTime = Date.now();

    collector.recordEvent({
      timestamp: startTime,
      type: 'request',
      operation,
      traceId,
    });

    return {
      success: () => {
        const duration = Date.now() - startTime;
        collector.recordEvent({
          timestamp: Date.now(),
          type: 'response',
          operation,
          duration,
          status: 200,
          traceId,
        });
      },
      error: (error: Error) => {
        const duration = Date.now() - startTime;
        collector.recordEvent({
          timestamp: Date.now(),
          type: 'error',
          operation,
          duration,
          error,
          traceId,
        });
      },
    };
  };

  return {
    ...delegate,
    connect: () => {
      const op = createTimedOperation('connect');
      try {
        delegate.connect();
        op.success();
      } catch (error) {
        op.error(error as Error);
        throw error;
      }
    },
    send: (message: unknown) => {
      const op = createTimedOperation('send');
      try {
        delegate.send(message);
        op.success();
      } catch (error) {
        op.error(error as Error);
        throw error;
      }
    },
    close: () => {
      const op = createTimedOperation('close');
      try {
        delegate.close();
        op.success();
      } catch (error) {
        op.error(error as Error);
        throw error;
      }
    },
    onMessage: (callback: (data: unknown) => void) => {
      const op = createTimedOperation('onMessage');
      try {
        const result = delegate.onMessage(callback);
        op.success();
        return result;
      } catch (error) {
        op.error(error as Error);
        throw error;
      }
    },
    onError: (callback: (event: Event) => void) => {
      return delegate.onError((event: Event) => {
        const op = createTimedOperation('onError');
        op.error(new Error('WebSocket error'));
        callback(event);
      });
    },
  };
}

function wrapDelegateWithTelemetry(delegate: Delegate, collector: TelemetryCollector): Delegate {
  if (isHttpDelegate(delegate)) {
    return wrapHttpDelegate(delegate, createTelemetryHttpInterceptor(collector));
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
