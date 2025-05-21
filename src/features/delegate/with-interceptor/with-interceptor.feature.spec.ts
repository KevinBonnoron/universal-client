import { describe, expect, it, mock } from 'bun:test';
import type { HttpDelegate } from '../../../types';
import { universalClient } from '../../../universal-client';
import type { RequestInterceptorContext, ResponseInterceptorContext } from '../../../utils/delegate-middleware.utils';
import { withMethods } from '../../core/with-methods/with-methods.feature';
import { withInterceptor } from './with-interceptor.feature';

describe('withInterceptor', () => {
  it('should apply interceptor to modify request URL', async () => {
    const mockDelegate = {
      get: mock(async (url: string) => ({ id: 1, name: 'Test', url })),
      post: mock(async () => ({})),
      patch: mock(async () => ({})),
      put: mock(async () => ({})),
      delete: mock(async () => ({})),
    } as HttpDelegate;

    const client = universalClient(
      () => ({ delegate: mockDelegate }),
      withInterceptor({
        name: 'delegate',
        interceptor: {
          before: (context: RequestInterceptorContext) => {
            // Add API prefix
            return { url: `/api${context.url}` };
          },
        },
      }),
      withMethods(({ delegate }) => ({
        getUser: (id: number) => (delegate as HttpDelegate).get(`/users/${id}`),
      })),
    );

    const result = await client.getUser(1);

    expect(mockDelegate.get).toHaveBeenCalled();
    // @ts-expect-error - result has url property from mock
    expect(result.url).toBe('/api/users/1');
  });

  it('should apply interceptor to modify request body', async () => {
    const mockDelegate = {
      get: mock(async () => ({})),
      post: mock(async (_url: string, body: unknown) => body),
      patch: mock(async () => ({})),
      put: mock(async () => ({})),
      delete: mock(async () => ({})),
    } as HttpDelegate;

    const client = universalClient(
      () => ({ delegate: mockDelegate }),
      withInterceptor({
        name: 'delegate',
        interceptor: {
          before: (context: RequestInterceptorContext) => {
            // Add timestamp to body
            return {
              body: {
                ...(context.body as object),
                timestamp: Date.now(),
              },
            };
          },
        },
      }),
      withMethods(({ delegate }) => ({
        createUser: (data: { name: string }) => (delegate as HttpDelegate).post('/users', data),
      })),
    );

    const result = await client.createUser({ name: 'John' });

    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('name', 'John');
  });

  it('should apply interceptor to transform response', async () => {
    const mockDelegate = {
      get: mock(async () => ({
        id: 1,
        name: 'John',
        createdAt: '2024-01-01T00:00:00.000Z',
      })),
      post: mock(async () => ({})),
      patch: mock(async () => ({})),
      put: mock(async () => ({})),
      delete: mock(async () => ({})),
    } as HttpDelegate;

    const client = universalClient(
      () => ({ delegate: mockDelegate }),
      withInterceptor({
        name: 'delegate',
        interceptor: {
          after: <T>(context: ResponseInterceptorContext<T>) => {
            // Convert ISO date strings to Date objects
            const result = context.result as Record<string, unknown>;
            if (result.createdAt && typeof result.createdAt === 'string') {
              return {
                ...result,
                createdAt: new Date(result.createdAt),
              } as T;
            }
            return context.result;
          },
        },
      }),
      withMethods(({ delegate }) => ({
        getUser: (id: number) => (delegate as HttpDelegate).get<{ createdAt: Date }>(`/users/${id}`),
      })),
    );

    const user = await client.getUser(1);

    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('should apply interceptor to handle errors', async () => {
    const errorHandler = mock((_method: string, _url: string, _error: string) => {});
    const mockDelegate = {
      get: mock(async () => {
        throw new Error('Network error');
      }),
      post: mock(async () => ({})),
      patch: mock(async () => ({})),
      put: mock(async () => ({})),
      delete: mock(async () => ({})),
    } as HttpDelegate;

    const client = universalClient(
      () => ({ delegate: mockDelegate }),
      withInterceptor({
        name: 'delegate',
        interceptor: {
          error: (method: string, url: string, error: Error, _body?: unknown) => {
            errorHandler(method, url, error.message);
          },
        },
      }),
      withMethods(({ delegate }) => ({
        getUser: (id: number) => (delegate as HttpDelegate).get(`/users/${id}`),
      })),
    );

    await expect(client.getUser(1)).rejects.toThrow('Network error');
    expect(errorHandler).toHaveBeenCalledWith('get', '/users/1', 'Network error');
  });

  it('should combine before and after interceptors', async () => {
    const mockDelegate = {
      get: mock(async (url: string) => ({ data: 'response', url })),
      post: mock(async () => ({})),
      patch: mock(async () => ({})),
      put: mock(async () => ({})),
      delete: mock(async () => ({})),
    } as HttpDelegate;

    const client = universalClient(
      () => ({ delegate: mockDelegate }),
      withInterceptor({
        name: 'delegate',
        interceptor: {
          before: (context: RequestInterceptorContext) => {
            return { url: `/v1${context.url}` };
          },
          after: <T>(context: ResponseInterceptorContext<T>) => {
            return {
              ...context.result,
              intercepted: true,
            } as T;
          },
        },
      }),
      withMethods(({ delegate }) => ({
        getData: () => (delegate as HttpDelegate).get('/data'),
      })),
    );

    const result = await client.getData();

    expect(mockDelegate.get).toHaveBeenCalled();
    // @ts-expect-error - result has url property from mock
    expect(result.url).toBe('/v1/data');
    expect(result).toEqual({ data: 'response', url: '/v1/data', intercepted: true });
  });

  it('should not apply interceptor to non-HTTP delegates', () => {
    const mockDelegate = {
      connect: () => {},
      close: () => {},
      send: () => {},
      onOpen: () => () => {},
      onClose: () => () => {},
      onError: () => () => {},
      onMessage: () => () => {},
    };

    const client = universalClient(
      () => ({ delegate: mockDelegate }),
      withInterceptor({
        name: 'delegate',
        interceptor: {
          before: () => ({ url: '/modified' }),
        },
      }),
    );

    expect(client.delegate).toBe(mockDelegate);
  });
});
