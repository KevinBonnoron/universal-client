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
      });
    });

    it('should handle options', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL });
      const params = { include: 'profile', format: 'json' };
      const headers = { 'Content-Type': 'application/json' };

      await delegate.get(url, { params, headers });

      const fetchUrl = mockFetch.mock.calls[0][0] as string;
      const options = mockFetch.mock.calls[0][1] as RequestInit;

      expect(fetchUrl).toBe(`${baseURL}${url}?include=profile&format=json`);
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
        headers: {},
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
      it.each([{ format: 'json' as const }, { format: 'text' as const }, { format: 'raw' as const }, { format: undefined }])('should throw error with format=$format', async ({ format }) => {
        const mockResponse = new Response(JSON.stringify({ error: 'Server error' }), {
          status: 500,
          statusText: 'Internal Server Error',
        });
        mockFetch.mockResolvedValue(mockResponse);

        const delegate = createFetchDelegate({ baseURL, format });

        await expect(delegate.get('/users')).rejects.toThrow('Server error');
      });
    });
  });

  describe('Response parsing', () => {
    const baseURL = 'https://api.example.com';

    it.each([
      { format: 'json' as const, data: { id: 1, name: 'John' }, expected: { id: 1, name: 'John' } },
      { format: 'text' as const, data: 'Hello World', expected: 'Hello World' },
      { format: 'raw' as const, data: new Response('Hello World'), expected: new Response('Hello World') },
      { data: { id: 1, name: 'John' }, expected: { id: 1, name: 'John' } },
    ])('should parse $format response correctly', async ({ format, data, expected }) => {
      const mockResponse = new Response(typeof data === 'string' ? data : JSON.stringify(data));
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({ baseURL, format });

      const result = await delegate.get('/users/1');
      expect(result).toEqual(expected);
    });
  });
});
