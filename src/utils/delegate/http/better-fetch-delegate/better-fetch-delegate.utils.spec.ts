import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { HttpError } from '../http-error/http-error.utils';

const betterFetchInstance = mock();
const createFetch = mock(() => betterFetchInstance);

mock.module('@better-fetch/fetch', () => ({
  createFetch,
}));

async function importDelegate() {
  const { createBetterFetchDelegate } = await import('./better-fetch-delegate.utils');
  return createBetterFetchDelegate({ type: 'http', impl: 'better-fetch', baseURL: 'https://api.example.com' });
}

describe('createBetterFetchDelegate', () => {
  beforeEach(() => {
    betterFetchInstance.mockReset();
    createFetch.mockClear();
  });

  it('should unwrap data on a successful GET', async () => {
    betterFetchInstance.mockResolvedValueOnce({ data: { id: 1 }, error: null });
    const delegate = await importDelegate();

    const result = await delegate.get('/users/1');

    expect(betterFetchInstance).toHaveBeenCalledWith('/users/1', { headers: undefined });
    expect(result).toEqual({ id: 1 });
  });

  it.each([
    { method: 'post' as const, httpMethod: 'POST' },
    { method: 'put' as const, httpMethod: 'PUT' },
    { method: 'patch' as const, httpMethod: 'PATCH' },
  ])('should forward $httpMethod requests with body and method', async ({ method, httpMethod }) => {
    betterFetchInstance.mockResolvedValueOnce({ data: { ok: true }, error: null });
    const delegate = await importDelegate();

    const body = { name: 'John' };
    const result = await delegate[method]('/users', body);

    expect(betterFetchInstance).toHaveBeenCalledWith('/users', { method: httpMethod, body, headers: undefined });
    expect(result).toEqual({ ok: true });
  });

  it('should forward DELETE requests', async () => {
    betterFetchInstance.mockResolvedValueOnce({ data: { deleted: true }, error: null });
    const delegate = await importDelegate();

    const result = await delegate.delete('/users/1');

    expect(betterFetchInstance).toHaveBeenCalledWith('/users/1', { method: 'DELETE', headers: undefined });
    expect(result).toEqual({ deleted: true });
  });

  it('should throw HttpError when better-fetch returns an error', async () => {
    const errorBody = { status: 404, statusText: 'Not Found', code: 'USER_NOT_FOUND', message: 'User does not exist' };
    const responseHeaders = new Headers({ 'X-Request-Id': 'abc' });
    betterFetchInstance.mockResolvedValueOnce({
      data: null,
      error: errorBody,
      response: new Response(null, { status: 404, statusText: 'Not Found', headers: responseHeaders }),
    });
    const delegate = await importDelegate();

    const error = (await delegate.get('/users/42').catch((err) => err)) as HttpError;

    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.message).toBe('HTTP 404: Not Found');
    expect(error.body).toEqual(errorBody);
    expect(error.headers.get('X-Request-Id')).toBe('abc');
  });

  it('should fall back to status/statusText from the error object when response is missing', async () => {
    betterFetchInstance.mockResolvedValueOnce({
      data: null,
      error: { status: 503, statusText: 'Service Unavailable', message: 'down' },
    });
    const delegate = await importDelegate();

    const error = (await delegate.get('/users').catch((err) => err)) as HttpError;

    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(503);
    expect(error.statusText).toBe('Service Unavailable');
    expect(error.headers).toBeInstanceOf(Headers);
  });

  it('should default to status 0 and fall back to error.message when neither response nor error carry a status', async () => {
    betterFetchInstance.mockResolvedValueOnce({ data: null, error: { message: 'parsing failed' } });
    const delegate = await importDelegate();

    const error = (await delegate.get('/users').catch((err) => err)) as HttpError;

    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(0);
    expect(error.statusText).toBe('');
    expect(error.message).toBe('parsing failed');
  });

  it('should fall back to a generic message when status is 0 and error has no message', async () => {
    betterFetchInstance.mockResolvedValueOnce({ data: null, error: { code: 'WEIRD' } });
    const delegate = await importDelegate();

    const error = (await delegate.get('/users').catch((err) => err)) as HttpError;

    expect(error).toBeInstanceOf(HttpError);
    expect(error.message).toBe('HTTP request failed');
  });

  it('should preserve Retry-After header from the underlying response', async () => {
    betterFetchInstance.mockResolvedValueOnce({
      data: null,
      error: { status: 429, statusText: 'Too Many Requests' },
      response: new Response(null, { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '120' } }),
    });
    const delegate = await importDelegate();

    const error = (await delegate.get('/users').catch((err) => err)) as HttpError;

    expect(error.headers.get('Retry-After')).toBe('120');
  });

  it('should pass custom headers through', async () => {
    betterFetchInstance.mockResolvedValueOnce({ data: {}, error: null });
    const delegate = await importDelegate();

    await delegate.get('/users', { headers: { Authorization: 'Bearer xyz' } });

    expect(betterFetchInstance).toHaveBeenCalledWith('/users', { headers: { Authorization: 'Bearer xyz' } });
  });
});
