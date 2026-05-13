import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { HttpError } from '../http-error/http-error.utils';

type AxiosMethodMock = ReturnType<typeof mock>;

const axiosInstance = {
  get: mock(),
  post: mock(),
  patch: mock(),
  put: mock(),
  delete: mock(),
};

const axiosCreate = mock(() => axiosInstance);

mock.module('axios', () => ({
  default: {
    create: axiosCreate,
  },
}));

async function importDelegate() {
  const { createAxiosDelegate } = await import('./axios-delegate.utils');
  return createAxiosDelegate({ type: 'http', impl: 'axios', baseURL: 'https://api.example.com' });
}

function rejectWithAxiosError(method: AxiosMethodMock, { status, statusText, data, headers }: { status: number; statusText: string; data?: unknown; headers?: Record<string, string> }) {
  method.mockRejectedValueOnce({
    message: `Request failed with status code ${status}`,
    response: { status, statusText, data, headers: headers ?? {} },
  });
}

describe('createAxiosDelegate', () => {
  beforeEach(() => {
    for (const method of Object.values(axiosInstance)) {
      method.mockReset();
    }
    axiosCreate.mockClear();
  });

  it('should forward GET requests and unwrap response.data', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: { id: 1 } });
    const delegate = await importDelegate();

    const result = await delegate.get('/users/1');

    expect(axiosInstance.get).toHaveBeenCalledWith('/users/1', { headers: undefined });
    expect(result).toEqual({ id: 1 });
  });

  it.each([
    { method: 'post' as const, httpMethod: 'POST' },
    { method: 'put' as const, httpMethod: 'PUT' },
    { method: 'patch' as const, httpMethod: 'PATCH' },
  ])('should forward $httpMethod requests with body', async ({ method }) => {
    axiosInstance[method].mockResolvedValueOnce({ data: { ok: true } });
    const delegate = await importDelegate();

    const body = { name: 'John' };
    const result = await delegate[method]('/users', body);

    expect(axiosInstance[method]).toHaveBeenCalledWith('/users', body, { headers: undefined });
    expect(result).toEqual({ ok: true });
  });

  it('should forward DELETE requests', async () => {
    axiosInstance.delete.mockResolvedValueOnce({ data: { deleted: true } });
    const delegate = await importDelegate();

    const result = await delegate.delete('/users/1');

    expect(axiosInstance.delete).toHaveBeenCalledWith('/users/1', { headers: undefined });
    expect(result).toEqual({ deleted: true });
  });

  it('should translate axios error responses into HttpError', async () => {
    rejectWithAxiosError(axiosInstance.get, {
      status: 404,
      statusText: 'Not Found',
      data: { code: 'USER_NOT_FOUND', message: 'User does not exist' },
      headers: { 'x-request-id': 'abc' },
    });
    const delegate = await importDelegate();

    const error = (await delegate.get('/users/42').catch((err) => err)) as HttpError;

    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.message).toBe('HTTP 404: Not Found');
    expect(error.body).toEqual({ code: 'USER_NOT_FOUND', message: 'User does not exist' });
    expect(error.headers.get('x-request-id')).toBe('abc');
  });

  it('should preserve Retry-After on 429 responses', async () => {
    rejectWithAxiosError(axiosInstance.get, {
      status: 429,
      statusText: 'Too Many Requests',
      data: { error: 'rate limited' },
      headers: { 'retry-after': '120' },
    });
    const delegate = await importDelegate();

    const error = (await delegate.get('/users').catch((err) => err)) as HttpError;

    expect(error.headers.get('retry-after')).toBe('120');
  });

  it('should rethrow non-HTTP errors untouched (e.g. network failure)', async () => {
    const networkError = new Error('ECONNREFUSED');
    axiosInstance.get.mockRejectedValueOnce(networkError);
    const delegate = await importDelegate();

    const error = await delegate.get('/users').catch((err) => err);

    expect(error).toBe(networkError);
    expect(error).not.toBeInstanceOf(HttpError);
  });

  it('should pass custom headers to axios', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: {} });
    const delegate = await importDelegate();

    await delegate.get('/users', { headers: { Authorization: 'Bearer xyz' } });

    expect(axiosInstance.get).toHaveBeenCalledWith('/users', { headers: { Authorization: 'Bearer xyz' } });
  });
});
