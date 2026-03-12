import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { createServerSentEventDelegate } from './server-sent-event-delegate.utils';

function createMockEventSource() {
  const listeners: Record<string, Array<(event: unknown) => void>> = {};
  return {
    close: mock(() => {}),
    addEventListener: mock((event: string, handler: (event: unknown) => void) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(handler);
    }),
    removeEventListener: mock((event: string, handler: (event: unknown) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),
    _emit(event: string, data?: unknown) {
      for (const handler of listeners[event] ?? []) {
        handler(data ?? new Event(event));
      }
    },
    _listeners: listeners,
  };
}

function createMockSseResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function mockFetch(responseFn: () => Response | Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchFn = mock((url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: url as string, init: init ?? {} });
    return Promise.resolve(responseFn());
  });
  // @ts-expect-error - mock fetch
  globalThis.fetch = fetchFn;
  return { fetchFn, calls };
}

function mockFetchReject(error: Error) {
  const fetchFn = mock(() => Promise.reject(error));
  // @ts-expect-error - mock fetch
  globalThis.fetch = fetchFn;
  return fetchFn;
}

describe('createServerSentEventDelegate', () => {
  let originalEventSource: typeof globalThis.EventSource;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalEventSource = globalThis.EventSource;
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    globalThis.fetch = originalFetch;
  });

  it('should not connect on creation', async () => {
    const mockESConstructor = mock(() => createMockEventSource());
    // @ts-expect-error - EventSource mock
    globalThis.EventSource = mockESConstructor;

    await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });

    expect(mockESConstructor).not.toHaveBeenCalled();
  });

  describe('open() with GET', () => {
    it('should create EventSource connection to baseURL', async () => {
      const mockESConstructor = mock(() => createMockEventSource());
      // @ts-expect-error - EventSource mock
      globalThis.EventSource = mockESConstructor;

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      delegate.open();

      expect(mockESConstructor).toHaveBeenCalledWith('http://localhost/events');
    });

    it('should create EventSource connection to baseURL + custom URL', async () => {
      const mockESConstructor = mock(() => createMockEventSource());
      // @ts-expect-error - EventSource mock
      globalThis.EventSource = mockESConstructor;

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost' });
      delegate.open({ url: '/stream' });

      expect(mockESConstructor).toHaveBeenCalledWith('http://localhost/stream');
    });

    it('should throw if EventSource is not available', async () => {
      // @ts-expect-error - removing EventSource
      globalThis.EventSource = undefined;

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      expect(() => delegate.open()).toThrow('EventSource is not available');
    });

    it('should deliver messages to onMessage listeners', async () => {
      // @ts-expect-error - EventSource mock
      globalThis.EventSource = mock(() => createMockEventSource());

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      const messages: unknown[] = [];
      delegate.onMessage((data) => messages.push(data));
      delegate.open();

      // Get the created mock EventSource instance
      // @ts-expect-error - accessing mock
      const mockES = globalThis.EventSource.mock.results[0].value;
      mockES._emit('message', { data: 'hello' });

      expect(messages).toEqual(['hello']);
    });

    it('should deliver open events to onOpen listeners', async () => {
      // @ts-expect-error - EventSource mock
      globalThis.EventSource = mock(() => createMockEventSource());

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      let opened = false;
      delegate.onOpen(() => {
        opened = true;
      });
      delegate.open();

      // @ts-expect-error - accessing mock
      const mockES = globalThis.EventSource.mock.results[0].value;
      mockES._emit('open');

      expect(opened).toBe(true);
    });

    it('should deliver error events to onError listeners', async () => {
      // @ts-expect-error - EventSource mock
      globalThis.EventSource = mock(() => createMockEventSource());

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      let errored = false;
      delegate.onError(() => {
        errored = true;
      });
      delegate.open();

      // @ts-expect-error - accessing mock
      const mockES = globalThis.EventSource.mock.results[0].value;
      mockES._emit('error');

      expect(errored).toBe(true);
    });

    it('should support named event subscriptions', async () => {
      // @ts-expect-error - EventSource mock
      globalThis.EventSource = mock(() => createMockEventSource());

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      const notifications: unknown[] = [];
      delegate.subscribe('notification', (data) => notifications.push(data));
      delegate.open();

      // @ts-expect-error - accessing mock
      const mockES = globalThis.EventSource.mock.results[0].value;
      mockES._emit('notification', { data: 'new-item' });

      expect(notifications).toEqual(['new-item']);
    });

    it('should unsubscribe listeners', async () => {
      // @ts-expect-error - EventSource mock
      globalThis.EventSource = mock(() => createMockEventSource());

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      const messages: unknown[] = [];
      const unsub = delegate.onMessage((data) => messages.push(data));
      delegate.open();

      // @ts-expect-error - accessing mock
      const mockES = globalThis.EventSource.mock.results[0].value;
      mockES._emit('message', { data: 'first' });
      unsub();
      mockES._emit('message', { data: 'second' });

      expect(messages).toEqual(['first']);
    });

    it('should support multiple listeners per event type', async () => {
      // @ts-expect-error - EventSource mock
      globalThis.EventSource = mock(() => createMockEventSource());

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      const messages1: unknown[] = [];
      const messages2: unknown[] = [];
      delegate.onMessage((data) => messages1.push(data));
      delegate.onMessage((data) => messages2.push(data));
      delegate.open();

      // @ts-expect-error - accessing mock
      const mockES = globalThis.EventSource.mock.results[0].value;
      mockES._emit('message', { data: 'hello' });

      expect(messages1).toEqual(['hello']);
      expect(messages2).toEqual(['hello']);
    });
  });

  describe('open() with POST (fetch mode)', () => {
    it('should send POST request with JSON body', async () => {
      const { calls } = mockFetch(() => createMockSseResponse(['data: hello\n\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api/chat' });
      delegate.open({ method: 'POST', body: { messages: ['hi'], avatarId: 1 } });

      await Bun.sleep(10);

      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe('http://localhost/api/chat');
      expect(calls[0].init.method).toBe('POST');
      expect(calls[0].init.body).toBe(JSON.stringify({ messages: ['hi'], avatarId: 1 }));
      expect((calls[0].init.headers as Record<string, string>).Accept).toBe('text/event-stream');
      expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('should include custom headers', async () => {
      const { calls } = mockFetch(() => createMockSseResponse(['data: ok\n\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api/chat' });
      delegate.open({ method: 'POST', body: {}, headers: { Authorization: 'Bearer token123' } });

      await Bun.sleep(10);

      expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer token123');
    });

    it('should deliver parsed SSE data to onMessage listeners', async () => {
      mockFetch(() => createMockSseResponse(['data: hello world\n\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api/chat' });
      const messages: unknown[] = [];
      delegate.onMessage((data) => messages.push(data));
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(messages).toEqual(['hello world']);
    });

    it('should fire onOpen when response is received', async () => {
      mockFetch(() => createMockSseResponse(['data: hi\n\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api/chat' });
      let opened = false;
      delegate.onOpen(() => {
        opened = true;
      });
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(opened).toBe(true);
    });

    it('should fire onError for non-ok response', async () => {
      mockFetch(() => new Response(null, { status: 500 }));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api/chat' });
      let errored = false;
      delegate.onError(() => {
        errored = true;
      });
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(errored).toBe(true);
    });

    it('should fire onError for network errors', async () => {
      mockFetchReject(new TypeError('Network error'));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api/chat' });
      let errored = false;
      delegate.onError(() => {
        errored = true;
      });
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(errored).toBe(true);
    });

    it('should handle named events via subscribe()', async () => {
      mockFetch(() => createMockSseResponse(['event: status\ndata: {"type":"done"}\n\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api/chat' });
      const statuses: unknown[] = [];
      delegate.subscribe('status', (data) => statuses.push(data));
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(statuses).toEqual(['{"type":"done"}']);
    });

    it('should use baseURL + custom URL when provided', async () => {
      const { calls } = mockFetch(() => createMockSseResponse(['data: ok\n\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost' });
      delegate.open({ method: 'POST', body: {}, url: '/custom' });

      await Bun.sleep(10);

      expect(calls[0].url).toBe('http://localhost/custom');
    });
  });

  describe('SSE protocol parsing', () => {
    it('should parse multiple events', async () => {
      mockFetch(() => createMockSseResponse(['data: first\n\ndata: second\n\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api' });
      const messages: unknown[] = [];
      delegate.onMessage((data) => messages.push(data));
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(messages).toEqual(['first', 'second']);
    });

    it('should handle multi-line data fields', async () => {
      mockFetch(() => createMockSseResponse(['data: line1\ndata: line2\ndata: line3\n\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api' });
      const messages: unknown[] = [];
      delegate.onMessage((data) => messages.push(data));
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(messages).toEqual(['line1\nline2\nline3']);
    });

    it('should ignore comment lines', async () => {
      mockFetch(() => createMockSseResponse([': this is a comment\ndata: actual data\n\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api' });
      const messages: unknown[] = [];
      delegate.onMessage((data) => messages.push(data));
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(messages).toEqual(['actual data']);
    });

    it('should handle space after colon as optional', async () => {
      mockFetch(() => createMockSseResponse(['data:no-space\n\ndata: with-space\n\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api' });
      const messages: unknown[] = [];
      delegate.onMessage((data) => messages.push(data));
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(messages).toEqual(['no-space', 'with-space']);
    });

    it('should handle CRLF line endings', async () => {
      mockFetch(() => createMockSseResponse(['data: hello\r\n\r\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api' });
      const messages: unknown[] = [];
      delegate.onMessage((data) => messages.push(data));
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(messages).toEqual(['hello']);
    });

    it('should dispatch buffered event when stream ends', async () => {
      mockFetch(() => createMockSseResponse(['data: final\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api' });
      const messages: unknown[] = [];
      delegate.onMessage((data) => messages.push(data));
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(messages).toEqual(['final']);
    });

    it('should handle chunks split across reads', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: hel'));
          controller.enqueue(encoder.encode('lo\n\n'));
          controller.close();
        },
      });
      const response = new Response(stream, { status: 200 });
      // @ts-expect-error - mock fetch
      globalThis.fetch = mock(() => Promise.resolve(response));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api' });
      const messages: unknown[] = [];
      delegate.onMessage((data) => messages.push(data));
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(messages).toEqual(['hello']);
    });

    it('should dispatch named events to subscribe and not to onMessage', async () => {
      mockFetch(() => createMockSseResponse(['event: custom\ndata: payload\n\n']));

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api' });
      const messages: unknown[] = [];
      const customs: unknown[] = [];
      delegate.onMessage((data) => messages.push(data));
      delegate.subscribe('custom', (data) => customs.push(data));
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(50);

      expect(messages).toEqual([]);
      expect(customs).toEqual(['payload']);
    });
  });

  describe('close()', () => {
    it('should close EventSource connection', async () => {
      const mockES = createMockEventSource();
      // @ts-expect-error - EventSource mock
      globalThis.EventSource = mock(() => mockES);

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      delegate.open();
      delegate.close();

      expect(mockES.close).toHaveBeenCalledTimes(1);
    });

    it('should abort in-flight fetch request', async () => {
      let abortSignal: AbortSignal | undefined;
      // @ts-expect-error - mock fetch
      globalThis.fetch = mock((_url: string, init: RequestInit) => {
        abortSignal = init.signal as AbortSignal;
        const stream = new ReadableStream({ start() {} });
        return Promise.resolve(new Response(stream, { status: 200 }));
      });

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/api/chat' });
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(10);

      delegate.close();

      expect(abortSignal?.aborted).toBe(true);
    });

    it('should not throw when no connection exists', async () => {
      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      expect(() => delegate.close()).not.toThrow();
    });
  });

  describe('multiple open() calls', () => {
    it('should close previous EventSource before opening new one', async () => {
      const mockES1 = createMockEventSource();
      const mockES2 = createMockEventSource();
      let callCount = 0;
      // @ts-expect-error - EventSource mock
      globalThis.EventSource = mock(() => {
        callCount++;
        return callCount === 1 ? mockES1 : mockES2;
      });

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      delegate.open();
      delegate.open();

      expect(mockES1.close).toHaveBeenCalledTimes(1);
    });

    it('should preserve registered listeners across reopens', async () => {
      const mockES1 = createMockEventSource();
      const mockES2 = createMockEventSource();
      let callCount = 0;
      // @ts-expect-error - EventSource mock
      globalThis.EventSource = mock(() => {
        callCount++;
        return callCount === 1 ? mockES1 : mockES2;
      });

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      const messages: unknown[] = [];
      delegate.onMessage((data) => messages.push(data));

      delegate.open();
      mockES1._emit('message', { data: 'from-first' });

      delegate.open();
      mockES2._emit('message', { data: 'from-second' });

      expect(messages).toEqual(['from-first', 'from-second']);
    });

    it('should close fetch connection before opening EventSource', async () => {
      let abortSignal: AbortSignal | undefined;
      // @ts-expect-error - mock fetch
      globalThis.fetch = mock((_url: string, init: RequestInit) => {
        abortSignal = init.signal as AbortSignal;
        const stream = new ReadableStream({ start() {} });
        return Promise.resolve(new Response(stream, { status: 200 }));
      });

      const mockES = createMockEventSource();
      // @ts-expect-error - EventSource mock
      globalThis.EventSource = mock(() => mockES);

      const delegate = await createServerSentEventDelegate({ baseURL: 'http://localhost/events' });
      delegate.open({ method: 'POST', body: {} });

      await Bun.sleep(10);

      delegate.open(); // Switch to GET

      expect(abortSignal?.aborted).toBe(true);
    });
  });
});
