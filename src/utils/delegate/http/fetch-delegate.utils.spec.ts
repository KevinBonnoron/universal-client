import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { createFetchDelegate } from './fetch-delegate.utils';

const mockFetch = mock();
global.fetch = mockFetch as unknown as typeof fetch;

describe('createFetchDelegate', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  describe('GET', () => {
    const baseURL = 'https://api.example.com';
    const url = '/users/1';

    it('should send request with correct URL', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });
      await delegate.get(url);

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}${url}`, {
        headers: {},
        method: 'GET',
      });
    });

    it('should handle options', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });
      const params = { include: 'profile', date: new Date('2020-01-01T00:00:00Z'), tags: ['admin', 'user'], isActive: true, count: 10, limit: undefined };
      const headers = { 'Content-Type': 'application/json' };

      await delegate.get(url, { params, headers });

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      const options = mockFetch.mock.calls[0][1] as RequestInit;

      expect(fetchUrl).toBe(`${baseURL}${url}?include=profile&date=2020-01-01T00%3A00%3A00.000Z&tags%5B%5D=admin&tags%5B%5D=user&isActive=true&count=10`);
      expect(options.headers).toEqual(headers);
    });

    it('should throw error on failed request', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });

      await expect(delegate.get(url)).rejects.toThrow('Not found');
    });
  });

  describe('DELETE', () => {
    const baseURL = 'https://api.example.com';
    const url = '/users/1';

    it('should send request with correct URL', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });
      await delegate.delete(url);

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}${url}`, {
        method: 'DELETE',
        headers: {},
      });
    });

    it('should handle options', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });
      const params = { include: 'profile' };
      const headers = { 'Content-Type': 'application/json' };

      await delegate.delete(url, { params, headers });

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      const options = mockFetch.mock.calls[0][1] as RequestInit;

      expect(fetchUrl).toBe(`${baseURL}${url}?include=profile`);
      expect(options.headers).toEqual(headers);
    });

    it('should throw error on failed request', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });

      await expect(delegate.delete(url)).rejects.toThrow('Unauthorized');
    });
  });

  describe.each([
    { method: 'post' as const, httpMethod: 'POST', url: '/users' },
    { method: 'put' as const, httpMethod: 'PUT', url: '/users/1' },
    { method: 'patch' as const, httpMethod: 'PATCH', url: '/users/1' },
  ])('$httpMethod', ({ method, httpMethod, url }) => {
    const baseURL = 'https://api.example.com';

    it.each([
      { label: 'simple object', data: { name: 'John', age: 30 } },
      {
        label: 'complex nested object',
        data: {
          user: { name: 'John', age: 30 },
          metadata: { source: 'web', timestamp: '2024-01-01T00:00:00Z' },
          tags: ['admin', 'verified'],
        },
      },
    ])('should send $label in body', async ({ data }) => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });
      await delegate[method](url, data);

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}${url}`, {
        method: httpMethod,
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should handle options', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });
      const params = { include: 'profile', format: 'json' };
      const headers = { 'Content-Type': 'application/json' };
      const testData = { name: 'John' };

      await delegate[method](url, testData, { params, headers });

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      const options = mockFetch.mock.calls[0][1] as RequestInit;

      expect(fetchUrl).toBe(`${baseURL}${url}?include=profile&format=json`);
      expect(options.headers).toEqual(headers);
    });

    it('should throw error on failed request', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });
      const testData = { name: 'John' };

      await expect(delegate[method](url, testData)).rejects.toThrow('Forbidden');
    });

    it('should send FormData body without setting Content-Type', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });
      const formData = new FormData();
      formData.append('file', new Blob(['content']), 'test.txt');

      await delegate[method](url, formData);

      const options = mockFetch.mock.calls[0][1] as RequestInit;
      expect(options.body).toBe(formData);
      expect(options.headers).toEqual({});
    });

    it('should send Blob body without setting Content-Type', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });
      const blob = new Blob(['content'], { type: 'text/plain' });

      await delegate[method](url, blob);

      const options = mockFetch.mock.calls[0][1] as RequestInit;
      expect(options.body).toBe(blob);
      expect(options.headers).toEqual({});
    });

    it('should send string body without setting Content-Type', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });

      await delegate[method](url, 'raw string body');

      const options = mockFetch.mock.calls[0][1] as RequestInit;
      expect(options.body).toBe('raw string body');
      expect(options.headers).toEqual({});
    });

    it('should not override Content-Type when explicitly provided', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });
      const headers = { 'Content-Type': 'application/xml' };

      await delegate[method](url, { name: 'John' }, { headers });

      const options = mockFetch.mock.calls[0][1] as RequestInit;
      expect(options.headers).toEqual({ 'Content-Type': 'application/xml' });
    });
  });

  describe('Error handling (common)', () => {
    const baseURL = 'https://api.example.com';

    describe('error message extraction', () => {
      it.each([
        { field: 'error', value: 'Custom error message', expected: 'Custom error message' },
        { field: 'message', value: 'Validation failed', expected: 'Validation failed' },
      ])('should extract error from errorData.$field', async ({ field, value, expected }) => {
        const mockResponse = new Response(JSON.stringify({ [field]: value }), {
          status: 400,
          statusText: 'Bad Request',
        });
        mockFetch.mockResolvedValue(mockResponse);

        const delegate = createFetchDelegate({ baseURL });

        await expect(delegate.get('/users')).rejects.toThrow(expected);
      });

      it('should fallback to default message when no error/message field', async () => {
        const mockResponse = new Response(JSON.stringify({ some: 'data' }), {
          status: 400,
          statusText: 'Bad Request',
        });
        mockFetch.mockResolvedValue(mockResponse);

        const delegate = createFetchDelegate({ baseURL });

        await expect(delegate.get('/users')).rejects.toThrow('HTTP 400: Bad Request');
      });

      it('should prioritize error field over message field', async () => {
        const mockResponse = new Response(JSON.stringify({ error: 'Error field', message: 'Message field' }), {
          status: 400,
          statusText: 'Bad Request',
        });
        mockFetch.mockResolvedValue(mockResponse);

        const delegate = createFetchDelegate({ baseURL });

        await expect(delegate.get('/users')).rejects.toThrow('Error field');
      });
    });

    describe('HTTP status codes', () => {
      it.each([
        { status: 400, statusText: 'Bad Request' },
        { status: 401, statusText: 'Unauthorized' },
        { status: 403, statusText: 'Forbidden' },
        { status: 404, statusText: 'Not Found' },
        { status: 422, statusText: 'Unprocessable Entity' },
        { status: 500, statusText: 'Internal Server Error' },
        { status: 502, statusText: 'Bad Gateway' },
        { status: 503, statusText: 'Service Unavailable' },
      ])('should throw correct error for HTTP $status', async ({ status, statusText }) => {
        const mockResponse = new Response('Not JSON', { status, statusText });
        mockFetch.mockResolvedValue(mockResponse);

        const delegate = createFetchDelegate({ baseURL });

        await expect(delegate.get('/users')).rejects.toThrow(`HTTP ${status}: ${statusText}`);
      });
    });

    describe('non-JSON response bodies', () => {
      it('should handle plain text error response', async () => {
        const mockResponse = new Response('Plain text error', {
          status: 500,
          statusText: 'Internal Server Error',
        });
        mockFetch.mockResolvedValue(mockResponse);

        const delegate = createFetchDelegate({ baseURL });

        await expect(delegate.get('/users')).rejects.toThrow('HTTP 500: Internal Server Error');
      });

      it('should handle empty error response', async () => {
        const mockResponse = new Response('', { status: 500, statusText: 'Internal Server Error' });
        mockFetch.mockResolvedValue(mockResponse);

        const delegate = createFetchDelegate({ baseURL });

        await expect(delegate.get('/users')).rejects.toThrow('HTTP 500: Internal Server Error');
      });
    });

    describe('with different response formats', () => {
      it.each([{ format: 'json' as const }, { format: 'text' as const }, { format: 'blob' as const }, { format: 'raw' as const }, { format: undefined }])('should throw error with format=$format', async ({ format }) => {
        const mockResponse = new Response(JSON.stringify({ error: 'Server error' }), {
          status: 500,
          statusText: 'Internal Server Error',
        });
        mockFetch.mockResolvedValue(mockResponse);

        const delegate = createFetchDelegate({ baseURL });

        await expect(delegate.get('/users', { format })).rejects.toThrow('Server error');
      });
    });
  });

  describe('Response parsing', () => {
    const baseURL = 'https://api.example.com';

    describe('explicit format override', () => {
      it.each([
        { format: 'json' as const, contentType: 'text/plain', body: JSON.stringify({ id: 1 }), expected: { id: 1 } },
        { format: 'text' as const, contentType: 'application/json', body: 'Hello World', expected: 'Hello World' },
        { format: 'blob' as const, contentType: 'text/plain', body: 'binary', expected: Blob },
        { format: 'raw' as const, contentType: 'application/json', body: 'raw', expected: Response },
      ])('should use $format format regardless of Content-Type=$contentType', async ({ format, contentType, body, expected }) => {
        mockFetch.mockResolvedValue(new Response(body, { headers: { 'Content-Type': contentType } }));

        const delegate = createFetchDelegate({ baseURL });
        const result = await delegate.get('/test', { format });

        if (typeof expected === 'function') {
          expect(result).toBeInstanceOf(expected);
        } else {
          expect(result).toEqual(expected);
        }
      });
    });

    describe('auto-detection from Content-Type', () => {
      it.each([
        // text/*
        { contentType: 'text/plain', body: 'Hello', expected: 'Hello' },
        { contentType: 'text/html', body: '<h1>Hello</h1>', expected: '<h1>Hello</h1>' },
        { contentType: 'text/css', body: 'body {}', expected: 'body {}' },

        // application/json
        { contentType: 'application/json', body: JSON.stringify({ id: 1 }), expected: { id: 1 } },
        { contentType: 'application/json;charset=utf-8', body: JSON.stringify({ id: 1 }), expected: { id: 1 } },

        // application/* text-like
        { contentType: 'application/xml', body: '<root/>', expected: '<root/>' },
        { contentType: 'application/javascript', body: 'var a = 1', expected: 'var a = 1' },

        // application/* binary
        { contentType: 'application/octet-stream', body: 'binary', expected: Blob },
        { contentType: 'application/pdf', body: 'pdf', expected: Blob },
        { contentType: 'application/zip', body: 'zip', expected: Blob },
        { contentType: 'application/gzip', body: 'gzip', expected: Blob },
        { contentType: 'application/wasm', body: 'wasm', expected: Blob },
        { contentType: 'application/protobuf', body: 'proto', expected: Blob },

        // image/*
        { contentType: 'image/png', body: 'img', expected: Blob },
        { contentType: 'image/jpeg', body: 'img', expected: Blob },
        { contentType: 'image/svg+xml', body: 'img', expected: Blob },

        // audio/*
        { contentType: 'audio/mpeg', body: 'audio', expected: Blob },
        { contentType: 'audio/ogg', body: 'audio', expected: Blob },

        // video/*
        { contentType: 'video/mp4', body: 'video', expected: Blob },
        { contentType: 'video/webm', body: 'video', expected: Blob },
      ])('should auto-detect format from Content-Type=$contentType', async ({ contentType, body, expected }) => {
        mockFetch.mockResolvedValue(new Response(body, { headers: { 'Content-Type': contentType } }));

        const delegate = createFetchDelegate({ baseURL });
        const result = await delegate.get('/test');

        if (typeof expected === 'function') {
          expect(result).toBeInstanceOf(expected);
        } else {
          expect(result).toEqual(expected);
        }
      });

      it('should return raw Response when no Content-Type header', async () => {
        mockFetch.mockResolvedValue(new Response('data'));

        const delegate = createFetchDelegate({ baseURL });
        const result = await delegate.get<Response>('/test');
        expect(result).toBeInstanceOf(Response);
      });
    });
  });

  describe('AbortSignal', () => {
    const baseURL = 'https://api.example.com';

    it('should pass signal to fetch', async () => {
      const mockResponse = new Response(JSON.stringify({ id: 1 }), { headers: { 'Content-Type': 'application/json' } });
      mockFetch.mockResolvedValue(mockResponse);

      const controller = new AbortController();
      const delegate = createFetchDelegate({ baseURL });
      await delegate.get('/users/1', { signal: controller.signal });

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}/users/1`, {
        method: 'GET',
        headers: {},
        signal: controller.signal,
      });
    });

    it('should not include signal when not provided', async () => {
      const mockResponse = new Response(JSON.stringify({ id: 1 }), { headers: { 'Content-Type': 'application/json' } });
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });
      await delegate.get('/users/1');

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}/users/1`, {
        method: 'GET',
        headers: {},
      });
    });
  });
});
