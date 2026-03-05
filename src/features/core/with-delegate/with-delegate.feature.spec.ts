import { describe, expect, it, mock } from 'bun:test';
import type { Delegate } from '../../../types';
import { withDelegate, withFetchDelegate, withHttpDelegate, withSseDelegate, withWebSocketDelegate } from './with-delegate.feature';

describe('withDelegate', () => {
  it('should create delegate feature with default name', () => {
    const options = {
      type: 'http' as const,
      baseURL: 'https://api.example.com',
    };

    const feature = withDelegate(options);
    const result = feature({});

    expect(result.delegate).toBeDefined();
    expect(typeof result.delegate.get).toBe('function');
    expect(typeof result.delegate.post).toBe('function');
    expect(typeof result.delegate.patch).toBe('function');
    expect(typeof result.delegate.put).toBe('function');
    expect(typeof result.delegate.delete).toBe('function');
  });

  it('should create delegate feature with custom name', () => {
    const options = {
      type: 'http' as const,
      baseURL: 'https://api.example.com',
      name: 'apiClient',
    };

    const feature = withDelegate(options);
    const result = feature({});

    expect(result.apiClient).toBeDefined();
    expect(typeof result.apiClient.get).toBe('function');
    expect(typeof result.apiClient.post).toBe('function');
    expect(typeof result.apiClient.patch).toBe('function');
    expect(typeof result.apiClient.put).toBe('function');
    expect(typeof result.apiClient.delete).toBe('function');
  });

  it('should create WebSocket delegate', () => {
    const options = {
      type: 'websocket' as const,
      baseURL: 'ws://localhost:8080',
    };

    // @ts-expect-error - WebSocket mock for testing
    global.WebSocket = mock(() => ({}));

    const feature = withDelegate(options);
    const result = feature({});

    expect(result.delegate).toBeDefined();
    expect(typeof result.delegate.connect).toBe('function');
    expect(typeof result.delegate.send).toBe('function');
    expect(typeof result.delegate.close).toBe('function');
  });

  it('should create ServerSentEvent delegate', () => {
    const options = {
      type: 'server-sent-event' as const,
      baseURL: 'http://localhost:8080/events',
    };

    // @ts-expect-error - EventSource mock for testing
    global.EventSource = mock(() => ({}));

    const feature = withDelegate(options);
    const result = feature({});

    expect(result.delegate).toBeDefined();
    expect(typeof result.delegate.open).toBe('function');
    expect(typeof result.delegate.onMessage).toBe('function');
    expect(typeof result.delegate.onError).toBe('function');
    expect(typeof result.delegate.onOpen).toBe('function');
    expect(typeof result.delegate.subscribe).toBe('function');
  });

  it('should apply delegate features', () => {
    const mockFeature = mock((input: { delegate: Delegate }) => ({
      ...input,
      customProp: 'customValue',
    }));

    const options = {
      name: 'delegate' as const,
      type: 'http' as const,
      baseURL: 'https://api.example.com',
    };

    const feature = withDelegate(options, mockFeature);
    const result = feature({});

    expect(mockFeature).toHaveBeenCalledWith({
      delegate: expect.any(Object),
    });

    expect(result.delegate).toBeDefined();
    // @ts-expect-error - customProp is added by the mock feature
    expect(result.customProp).toBe('customValue');
  });

  it('should apply multiple delegate features', () => {
    const mockFeature1 = mock((input: { delegate: unknown }) => ({
      ...input,
      prop1: 'value1',
    }));

    const mockFeature2 = mock((input: { delegate: unknown; prop1?: string }) => ({
      ...input,
      prop2: 'value2',
    }));

    const options = {
      type: 'http' as const,
      baseURL: 'https://api.example.com',
      impl: 'fetch',
    } as const;

    // @ts-expect-error - mock features don't match exact DelegateFeature type
    const feature = withDelegate(options, mockFeature1, mockFeature2);
    const result = feature({}) as Record<string, unknown>;

    expect(mockFeature1).toHaveBeenCalledWith({
      delegate: expect.any(Object),
    });

    expect(mockFeature2).toHaveBeenCalledWith({
      delegate: expect.any(Object),
      prop1: 'value1',
    });

    expect(result.delegate).toBeDefined();
    expect(result.prop1).toBe('value1');
    expect(result.prop2).toBe('value2');
  });

  it('should handle features that override delegate', () => {
    const mockDelegate = {
      get: mock(async <T>() => ({ original: true }) as T),
      post: mock(async <T>() => ({ original: true }) as T),
      patch: mock(async <T>() => ({ original: true }) as T),
      put: mock(async <T>() => ({ original: true }) as T),
      delete: mock(async <T>() => ({ original: true }) as T),
    } as Delegate;

    const mockFeature = mock((input: { delegate: unknown }) => ({
      ...input,
      delegate: mockDelegate,
    }));

    const options = {
      name: 'delegate' as const,
      type: 'http' as const,
      impl: 'fetch' as const,
      baseURL: 'https://api.example.com',
    };

    const feature = withDelegate(options, mockFeature);
    const result = feature({}) as Record<string, unknown>;

    expect(result.delegate).toBe(mockDelegate);
  });

  it('should preserve other properties from features', () => {
    const mockFeature = mock(
      (input: { delegate: Delegate }) =>
        ({
          ...input,
          customMethod: () => 'custom result',
          customProperty: 'custom value',
        }) as const,
    );

    const options = {
      type: 'http' as const,
      baseURL: 'https://api.example.com',
    };

    const feature = withDelegate(options, mockFeature);
    const result = feature({});

    expect(result.delegate).toBeDefined();
    // @ts-expect-error - customMethod is added by the mock feature
    expect(result.customMethod).toBeDefined();
    // @ts-expect-error - customProperty is added by the mock feature
    expect(result.customProperty).toBe('custom value');
    // @ts-expect-error - customMethod is added by the mock feature
    expect(typeof result.customMethod).toBe('function');
  });

  it('should work with complex feature chains', () => {
    const feature1 = mock((_input: unknown) => ({
      middleware1: true,
    }));

    const feature2 = mock((_input: unknown) => ({
      middleware2: true,
      delegate: {
        get: async () => ({}),
        post: async () => ({}),
        patch: async () => ({}),
        put: async () => ({}),
        delete: async () => ({}),
        customMethod: () => 'enhanced',
      },
    }));

    const feature3 = mock((_input: unknown) => ({
      middleware3: true,
    }));

    const options = {
      type: 'http' as const,
      baseURL: 'https://api.example.com',
      impl: 'fetch' as const,
    };

    // @ts-expect-error - mock features don't match exact DelegateFeature type
    const feature = withDelegate(options, feature1, feature2, feature3);
    const result = feature({});

    expect(result.delegate).toBeDefined();
    // @ts-expect-error - customMethod is added by the mock feature
    expect(result.delegate.customMethod).toBeDefined();
    // @ts-expect-error - middleware1 is added by the mock feature
    expect(result.middleware1).toBe(true);
    // @ts-expect-error - middleware2 is added by the mock feature
    expect(result.middleware2).toBe(true);
    // @ts-expect-error - middleware3 is added by the mock feature
    expect(result.middleware3).toBe(true);
  });
});

describe('withFetchDelegate', () => {
  it('should create fetch delegate with baseURL only', () => {
    const feature = withFetchDelegate('https://api.example.com');
    const result = feature({});

    expect(result.delegate).toBeDefined();
    expect(typeof result.delegate.get).toBe('function');
    expect(typeof result.delegate.post).toBe('function');
  });

  it('should create fetch delegate with custom name', () => {
    const feature = withFetchDelegate('https://api.example.com', 'api');
    const result = feature({});

    expect(result.api).toBeDefined();
    expect(typeof result.api.get).toBe('function');
  });

  it('should accept delegate features without options', () => {
    const mockFeature = mock((input: { delegate: Delegate }) => ({
      ...input,
      enhanced: true,
    }));

    const feature = withFetchDelegate('https://api.example.com', mockFeature);
    const result = feature({}) as Record<string, unknown>;

    expect(mockFeature).toHaveBeenCalled();
    expect(result.delegate).toBeDefined();
    expect(result.enhanced).toBe(true);
  });

  it('should accept name and delegate features', () => {
    const mockFeature = mock((input: { delegate: Delegate }) => ({
      ...input,
      enhanced: true,
    }));

    const feature = withFetchDelegate('https://api.example.com', 'api', mockFeature);
    const result = feature({}) as Record<string, unknown>;

    expect(mockFeature).toHaveBeenCalled();
    expect(result.api).toBeDefined();
    expect(result.enhanced).toBe(true);
  });
});

describe('withHttpDelegate', () => {
  it('should create http delegate with impl option', () => {
    const feature = withHttpDelegate('https://api.example.com', { impl: 'fetch' });
    const result = feature({});

    expect(result.delegate).toBeDefined();
    expect(typeof result.delegate.get).toBe('function');
  });

  it('should create http delegate with custom name', () => {
    const feature = withHttpDelegate('https://api.example.com', { impl: 'fetch', name: 'api' });
    const result = feature({});

    expect(result.api).toBeDefined();
    expect(typeof result.api.get).toBe('function');
  });
});

describe('withSseDelegate', () => {
  it('should create SSE delegate with baseURL only', () => {
    // @ts-expect-error - EventSource mock for testing
    global.EventSource = mock(() => ({}));

    const feature = withSseDelegate('http://localhost:8080/events');
    const result = feature({});

    expect(result.delegate).toBeDefined();
    expect(typeof result.delegate.open).toBe('function');
    expect(typeof result.delegate.onMessage).toBe('function');
  });

  it('should create SSE delegate with custom name', () => {
    // @ts-expect-error - EventSource mock for testing
    global.EventSource = mock(() => ({}));

    const feature = withSseDelegate('http://localhost:8080/events', 'events');
    const result = feature({});

    expect(result.events).toBeDefined();
    expect(typeof result.events.open).toBe('function');
  });
});

describe('withWebSocketDelegate', () => {
  it('should create WebSocket delegate with baseURL only', () => {
    // @ts-expect-error - WebSocket mock for testing
    global.WebSocket = mock(() => ({}));

    const feature = withWebSocketDelegate('ws://localhost:8080');
    const result = feature({});

    expect(result.delegate).toBeDefined();
    expect(typeof result.delegate.connect).toBe('function');
    expect(typeof result.delegate.send).toBe('function');
    expect(typeof result.delegate.close).toBe('function');
  });

  it('should create WebSocket delegate with string name', () => {
    // @ts-expect-error - WebSocket mock for testing
    global.WebSocket = mock(() => ({}));

    const feature = withWebSocketDelegate('ws://localhost:8080', 'ws');
    const result = feature({});

    expect(result.ws).toBeDefined();
    expect(typeof result.ws.connect).toBe('function');
  });

  it('should create WebSocket delegate with options object', () => {
    // @ts-expect-error - WebSocket mock for testing
    global.WebSocket = mock(() => ({}));

    const feature = withWebSocketDelegate('ws://localhost:8080', { name: 'ws', protocols: ['v1'] });
    const result = feature({});

    expect(result.ws).toBeDefined();
    expect(typeof result.ws.connect).toBe('function');
  });
});
