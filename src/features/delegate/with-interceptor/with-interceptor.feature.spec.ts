import { describe, expect, it, mock } from 'bun:test';
import type { HttpDelegate, RequestInterceptorContext } from '../../../types';
import { universalClient } from '../../../universal-client';
import { withMethods } from '../../core/with-methods/with-methods.feature';
import { withInterceptor } from './with-interceptor.feature';

interface UserResponse {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  replacedAt?: string;
  deletedAt?: string;
  url?: string;
  body?: unknown;
  method?: string;
  processed?: boolean;
  intercepted?: boolean;
  timestamp?: number;
  source?: string;
  version?: string;
  validated?: boolean;
}

describe('withInterceptor', () => {
  const createMockDelegate = (): HttpDelegate => {
    const mockGet = mock(async (url: string) => ({ id: 1, name: 'Test', url }));
    const mockPost = mock(async (url: string, body: unknown) => ({ url, body, method: 'POST' }));
    const mockPatch = mock(async (url: string, body: unknown) => ({ url, body, method: 'PATCH' }));
    const mockPut = mock(async (url: string, body: unknown) => ({ url, body, method: 'PUT' }));
    const mockDelete = mock(async (url: string) => ({ url, method: 'DELETE' }));

    return {
      get: mockGet as HttpDelegate['get'],
      post: mockPost as HttpDelegate['post'],
      patch: mockPatch as HttpDelegate['patch'],
      put: mockPut as HttpDelegate['put'],
      delete: mockDelete as HttpDelegate['delete'],
    };
  };

  describe('GET requests', () => {
    it('should modify URL in before interceptor', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            url: `/api${context.url}`,
          }),
        }),
        withMethods(({ delegate }) => ({
          getUser: (id: number) => (delegate as HttpDelegate).get<UserResponse>(`/users/${id}`),
        })),
      );

      const result = await client.getUser(1);

      expect(mockDelegate.get).toHaveBeenCalled();
      expect(result.url).toBe('/api/users/1');
    });

    it('should transform response in after interceptor', async () => {
      const mockDelegate = {
        ...createMockDelegate(),
        get: mock(async () => ({
          id: 1,
          name: 'John',
          createdAt: '2024-01-01T00:00:00.000Z',
        })),
      } as HttpDelegate;

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onAfterResponse: ({ response }) => ({
            ...response,
            createdAt: new Date((response as UserResponse).createdAt || ''),
            processed: true,
          }),
        }),
        withMethods(({ delegate }) => ({
          getUser: (id: number) => (delegate as HttpDelegate).get<UserResponse>(`/users/${id}`),
        })),
      );

      const result = await client.getUser(1);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result).toHaveProperty('processed', true);
    });

    it('should combine before and after interceptors', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            url: `/v1${context.url}`,
          }),
          onAfterResponse: ({ response }) => ({
            ...response,
            intercepted: true,
          }),
        }),
        withMethods(({ delegate }) => ({
          getUser: (id: number) => (delegate as HttpDelegate).get<UserResponse>(`/users/${id}`),
        })),
      );

      const result = await client.getUser(1);

      expect(result).toHaveProperty('intercepted', true);
      expect(result.url).toBe('/v1/users/1');
    });

    it('should preserve options (params, format, signal) through interceptor', async () => {
      const mockDelegate = createMockDelegate();
      const controller = new AbortController();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: () => ({
            headers: { Authorization: 'Bearer token123' },
          }),
        }),
        withMethods(({ delegate }) => ({
          getUser: (id: number) => (delegate as HttpDelegate).get<UserResponse>(`/users/${id}`, { params: { include: 'profile' }, format: 'json', signal: controller.signal }),
        })),
      );

      await client.getUser(1);

      expect(mockDelegate.get).toHaveBeenCalledWith(
        '/users/1',
        expect.objectContaining({
          params: { include: 'profile' },
          format: 'json',
          signal: controller.signal,
          headers: { Authorization: 'Bearer token123' },
        }),
      );
    });

    it('should handle errors', async () => {
      const errorHandler = mock((_method: string, _url: string, _error: string) => {});
      const mockDelegate = {
        ...createMockDelegate(),
        get: mock(async () => {
          throw new Error('Network error');
        }),
      } as HttpDelegate;

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onError: (method: string, url: string, error: Error) => {
            errorHandler(method, url, error.message);
          },
        }),
        withMethods(({ delegate }) => ({
          getUser: (id: number) => (delegate as HttpDelegate).get<UserResponse>(`/users/${id}`),
        })),
      );

      await expect(client.getUser(1)).rejects.toThrow('Network error');
      expect(errorHandler).toHaveBeenCalledWith('get', '/users/1', 'Network error');
    });
  });

  describe('POST requests', () => {
    it('should modify URL in before interceptor', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            url: `/api${context.url}`,
          }),
        }),
        withMethods(({ delegate }) => ({
          createUser: (data: { name: string }) => (delegate as HttpDelegate).post<UserResponse>('/users', data),
        })),
      );

      const result = await client.createUser({ name: 'John' });

      expect(mockDelegate.post).toHaveBeenCalled();
      expect(result.url).toBe('/api/users');
    });

    it('should modify body in before interceptor', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            body: {
              ...(context.body as object),
              timestamp: Date.now(),
              source: 'interceptor',
            },
          }),
        }),
        withMethods(({ delegate }) => ({
          createUser: (data: { name: string }) => (delegate as HttpDelegate).post<UserResponse>('/users', data),
        })),
      );

      await client.createUser({ name: 'John' });

      expect(mockDelegate.post).toHaveBeenCalledTimes(1);
      expect(mockDelegate.post).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          name: 'John',
          timestamp: expect.any(Number),
          source: 'interceptor',
        }),
        expect.any(Object),
      );
    });

    it('should transform response in after interceptor', async () => {
      const mockDelegate = {
        ...createMockDelegate(),
        post: mock(async () => ({
          id: 2,
          name: 'Jane',
          createdAt: '2024-01-02T00:00:00.000Z',
        })),
      } as HttpDelegate;

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onAfterResponse: ({ response }) => ({
            ...response,
            createdAt: new Date((response as UserResponse).createdAt || ''),
            processed: true,
          }),
        }),
        withMethods(({ delegate }) => ({
          createUser: (data: { name: string }) => (delegate as HttpDelegate).post<UserResponse>('/users', data),
        })),
      );

      const result = await client.createUser({ name: 'John' });

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result).toHaveProperty('processed', true);
    });

    it('should combine before and after interceptors', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            url: `/v1${context.url}`,
            body: context.body ? { ...context.body, version: 'v1' } : undefined,
          }),
          onAfterResponse: ({ response }) => ({
            ...response,
            intercepted: true,
          }),
        }),
        withMethods(({ delegate }) => ({
          createUser: (data: { name: string }) => (delegate as HttpDelegate).post<UserResponse>('/users', data),
        })),
      );

      const result = await client.createUser({ name: 'John' });

      expect(mockDelegate.post).toHaveBeenCalledWith(
        '/v1/users',
        expect.objectContaining({
          name: 'John',
          version: 'v1',
        }),
        expect.any(Object),
      );
      expect(result).toHaveProperty('intercepted', true);
    });

    it('should preserve options (params, format, signal) through interceptor', async () => {
      const mockDelegate = createMockDelegate();
      const controller = new AbortController();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: () => ({
            headers: { Authorization: 'Bearer token123' },
          }),
        }),
        withMethods(({ delegate }) => ({
          createUser: (data: { name: string }) => (delegate as HttpDelegate).post<UserResponse>('/users', data, { params: { notify: 'true' }, format: 'json', signal: controller.signal }),
        })),
      );

      await client.createUser({ name: 'John' });

      expect(mockDelegate.post).toHaveBeenCalledWith(
        '/users',
        { name: 'John' },
        expect.objectContaining({
          params: { notify: 'true' },
          format: 'json',
          signal: controller.signal,
          headers: { Authorization: 'Bearer token123' },
        }),
      );
    });

    it('should handle errors', async () => {
      const errorHandler = mock((_method: string, _url: string, _error: string) => {});
      const mockDelegate = {
        ...createMockDelegate(),
        post: mock(async () => {
          throw new Error('Network error');
        }),
      } as HttpDelegate;

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onError: (method: string, url: string, error: Error) => {
            errorHandler(method, url, error.message);
          },
        }),
        withMethods(({ delegate }) => ({
          createUser: (data: { name: string }) => (delegate as HttpDelegate).post<UserResponse>('/users', data),
        })),
      );

      await expect(client.createUser({ name: 'John' })).rejects.toThrow('Network error');
      expect(errorHandler).toHaveBeenCalledWith('post', '/users', 'Network error');
    });
  });

  describe('PATCH requests', () => {
    it('should modify URL in before interceptor', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            url: `/api${context.url}`,
          }),
        }),
        withMethods(({ delegate }) => ({
          updateUser: (id: number, data: { name: string }) => (delegate as HttpDelegate).patch<UserResponse>(`/users/${id}`, data),
        })),
      );

      const result = await client.updateUser(1, { name: 'John Updated' });

      expect(mockDelegate.patch).toHaveBeenCalled();
      expect(result.url).toBe('/api/users/1');
    });

    it('should modify body in before interceptor', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            body: {
              ...(context.body as object),
              updatedAt: Date.now(),
              source: 'interceptor',
            },
          }),
        }),
        withMethods(({ delegate }) => ({
          updateUser: (id: number, data: { name: string }) => (delegate as HttpDelegate).patch<UserResponse>(`/users/${id}`, data),
        })),
      );

      await client.updateUser(1, { name: 'John Updated' });

      expect(mockDelegate.patch).toHaveBeenCalledWith(
        '/users/1',
        expect.objectContaining({
          name: 'John Updated',
          updatedAt: expect.any(Number),
          source: 'interceptor',
        }),
        expect.any(Object),
      );
    });

    it('should transform response in after interceptor', async () => {
      const mockDelegate = {
        ...createMockDelegate(),
        patch: mock(async () => ({
          id: 1,
          name: 'John Updated',
          updatedAt: '2024-01-01T12:00:00.000Z',
        })),
      } as HttpDelegate;

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onAfterResponse: ({ response }) => ({
            ...response,
            updatedAt: new Date((response as UserResponse).updatedAt || ''),
            processed: true,
          }),
        }),
        withMethods(({ delegate }) => ({
          updateUser: (id: number, data: { name: string }) => (delegate as HttpDelegate).patch<UserResponse>(`/users/${id}`, data),
        })),
      );

      const result = await client.updateUser(1, { name: 'John Updated' });

      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result).toHaveProperty('processed', true);
    });

    it('should combine before and after interceptors', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            url: `/v1${context.url}`,
            body: context.body ? { ...context.body, version: 'v1' } : undefined,
          }),
          onAfterResponse: ({ response }) => ({
            ...response,
            intercepted: true,
          }),
        }),
        withMethods(({ delegate }) => ({
          updateUser: (id: number, data: { name: string }) => (delegate as HttpDelegate).patch<UserResponse>(`/users/${id}`, data),
        })),
      );

      const result = await client.updateUser(1, { name: 'John Updated' });

      expect(mockDelegate.patch).toHaveBeenCalledWith(
        '/v1/users/1',
        expect.objectContaining({
          name: 'John Updated',
          version: 'v1',
        }),
        expect.any(Object),
      );
      expect(result).toHaveProperty('intercepted', true);
    });

    it('should preserve options (params, format, signal) through interceptor', async () => {
      const mockDelegate = createMockDelegate();
      const controller = new AbortController();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: () => ({
            headers: { Authorization: 'Bearer token123' },
          }),
        }),
        withMethods(({ delegate }) => ({
          updateUser: (id: number, data: { name: string }) => (delegate as HttpDelegate).patch<UserResponse>(`/users/${id}`, data, { params: { validate: 'true' }, format: 'json', signal: controller.signal }),
        })),
      );

      await client.updateUser(1, { name: 'John Updated' });

      expect(mockDelegate.patch).toHaveBeenCalledWith(
        '/users/1',
        { name: 'John Updated' },
        expect.objectContaining({
          params: { validate: 'true' },
          format: 'json',
          signal: controller.signal,
          headers: { Authorization: 'Bearer token123' },
        }),
      );
    });

    it('should handle errors', async () => {
      const errorHandler = mock((_method: string, _url: string, _error: string) => {});
      const mockDelegate = {
        ...createMockDelegate(),
        patch: mock(async () => {
          throw new Error('Network error');
        }),
      } as HttpDelegate;

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onError: (method: string, url: string, error: Error) => {
            errorHandler(method, url, error.message);
          },
        }),
        withMethods(({ delegate }) => ({
          updateUser: (id: number, data: { name: string }) => (delegate as HttpDelegate).patch<UserResponse>(`/users/${id}`, data),
        })),
      );

      await expect(client.updateUser(1, { name: 'John Updated' })).rejects.toThrow('Network error');
      expect(errorHandler).toHaveBeenCalledWith('patch', '/users/1', 'Network error');
    });
  });

  describe('PUT requests', () => {
    it('should modify URL in before interceptor', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            url: `/api${context.url}`,
          }),
        }),
        withMethods(({ delegate }) => ({
          replaceUser: (id: number, data: { name: string }) => (delegate as HttpDelegate).put<UserResponse>(`/users/${id}`, data),
        })),
      );

      const result = await client.replaceUser(1, { name: 'John Replaced' });

      expect(mockDelegate.put).toHaveBeenCalled();
      expect(result.url).toBe('/api/users/1');
    });

    it('should modify body in before interceptor', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            body: {
              ...(context.body as object),
              replacedAt: Date.now(),
              source: 'interceptor',
            },
          }),
        }),
        withMethods(({ delegate }) => ({
          replaceUser: (id: number, data: { name: string }) => (delegate as HttpDelegate).put<UserResponse>(`/users/${id}`, data),
        })),
      );

      await client.replaceUser(1, { name: 'John Replaced' });

      expect(mockDelegate.put).toHaveBeenCalledWith(
        '/users/1',
        expect.objectContaining({
          name: 'John Replaced',
          replacedAt: expect.any(Number),
          source: 'interceptor',
        }),
        expect.any(Object),
      );
    });

    it('should transform response in after interceptor', async () => {
      const mockDelegate = {
        ...createMockDelegate(),
        put: mock(async () => ({
          id: 1,
          name: 'John Replaced',
          replacedAt: '2024-01-01T15:00:00.000Z',
        })),
      } as HttpDelegate;

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onAfterResponse: ({ response }) => ({
            ...response,
            replacedAt: new Date((response as UserResponse).replacedAt || ''),
            processed: true,
          }),
        }),
        withMethods(({ delegate }) => ({
          replaceUser: (id: number, data: { name: string }) => (delegate as HttpDelegate).put<UserResponse>(`/users/${id}`, data),
        })),
      );

      const result = await client.replaceUser(1, { name: 'John Replaced' });

      expect(result.replacedAt).toBeInstanceOf(Date);
      expect(result).toHaveProperty('processed', true);
    });

    it('should combine before and after interceptors', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            url: `/v1${context.url}`,
            body: context.body ? { ...context.body, version: 'v1' } : undefined,
          }),
          onAfterResponse: ({ response }) => ({
            ...response,
            intercepted: true,
          }),
        }),
        withMethods(({ delegate }) => ({
          replaceUser: (id: number, data: { name: string }) => (delegate as HttpDelegate).put<UserResponse>(`/users/${id}`, data),
        })),
      );

      const result = await client.replaceUser(1, { name: 'John Replaced' });

      expect(mockDelegate.put).toHaveBeenCalledWith(
        '/v1/users/1',
        expect.objectContaining({
          name: 'John Replaced',
          version: 'v1',
        }),
        expect.any(Object),
      );
      expect(result).toHaveProperty('intercepted', true);
    });

    it('should preserve options (params, format, signal) through interceptor', async () => {
      const mockDelegate = createMockDelegate();
      const controller = new AbortController();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: () => ({
            headers: { Authorization: 'Bearer token123' },
          }),
        }),
        withMethods(({ delegate }) => ({
          replaceUser: (id: number, data: { name: string }) => (delegate as HttpDelegate).put<UserResponse>(`/users/${id}`, data, { params: { replace: 'full' }, format: 'json', signal: controller.signal }),
        })),
      );

      await client.replaceUser(1, { name: 'John Replaced' });

      expect(mockDelegate.put).toHaveBeenCalledWith(
        '/users/1',
        { name: 'John Replaced' },
        expect.objectContaining({
          params: { replace: 'full' },
          format: 'json',
          signal: controller.signal,
          headers: { Authorization: 'Bearer token123' },
        }),
      );
    });

    it('should handle errors', async () => {
      const errorHandler = mock((_method: string, _url: string, _error: string) => {});
      const mockDelegate = {
        ...createMockDelegate(),
        put: mock(async () => {
          throw new Error('Network error');
        }),
      } as HttpDelegate;

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onError: (method: string, url: string, error: Error) => {
            errorHandler(method, url, error.message);
          },
        }),
        withMethods(({ delegate }) => ({
          replaceUser: (id: number, data: { name: string }) => (delegate as HttpDelegate).put<UserResponse>(`/users/${id}`, data),
        })),
      );

      await expect(client.replaceUser(1, { name: 'John Replaced' })).rejects.toThrow('Network error');
      expect(errorHandler).toHaveBeenCalledWith('put', '/users/1', 'Network error');
    });
  });

  describe('DELETE requests', () => {
    it('should modify URL in before interceptor', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            url: `/api${context.url}`,
          }),
        }),
        withMethods(({ delegate }) => ({
          deleteUser: (id: number) => (delegate as HttpDelegate).delete<UserResponse>(`/users/${id}`),
        })),
      );

      const result = await client.deleteUser(1);

      expect(mockDelegate.delete).toHaveBeenCalled();
      expect(result.url).toBe('/api/users/1');
    });

    it('should transform response in after interceptor', async () => {
      const mockDelegate = {
        ...createMockDelegate(),
        delete: mock(async () => ({
          id: 1,
          deleted: true,
          deletedAt: '2024-01-01T18:00:00.000Z',
        })),
      } as HttpDelegate;

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onAfterResponse: ({ response }) => ({
            ...response,
            deletedAt: new Date((response as UserResponse).deletedAt || ''),
            processed: true,
          }),
        }),
        withMethods(({ delegate }) => ({
          deleteUser: (id: number) => (delegate as HttpDelegate).delete<UserResponse>(`/users/${id}`),
        })),
      );

      const result = await client.deleteUser(1);

      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(result).toHaveProperty('processed', true);
    });

    it('should combine before and after interceptors', async () => {
      const mockDelegate = createMockDelegate();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: (context: RequestInterceptorContext) => ({
            url: `/v1${context.url}`,
          }),
          onAfterResponse: ({ response }) => ({
            ...response,
            intercepted: true,
          }),
        }),
        withMethods(({ delegate }) => ({
          deleteUser: (id: number) => (delegate as HttpDelegate).delete<UserResponse>(`/users/${id}`),
        })),
      );

      const result = await client.deleteUser(1);

      expect(result).toHaveProperty('intercepted', true);
      expect(result.url).toBe('/v1/users/1');
    });

    it('should preserve options (params, format, signal) through interceptor', async () => {
      const mockDelegate = createMockDelegate();
      const controller = new AbortController();

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onBeforeRequest: () => ({
            headers: { Authorization: 'Bearer token123' },
          }),
        }),
        withMethods(({ delegate }) => ({
          deleteUser: (id: number) => (delegate as HttpDelegate).delete<UserResponse>(`/users/${id}`, { params: { soft: 'true' }, format: 'json', signal: controller.signal }),
        })),
      );

      await client.deleteUser(1);

      expect(mockDelegate.delete).toHaveBeenCalledWith(
        '/users/1',
        expect.objectContaining({
          params: { soft: 'true' },
          format: 'json',
          signal: controller.signal,
          headers: { Authorization: 'Bearer token123' },
        }),
      );
    });

    it('should handle errors', async () => {
      const errorHandler = mock((_method: string, _url: string, _error: string) => {});
      const mockDelegate = {
        ...createMockDelegate(),
        delete: mock(async () => {
          throw new Error('Network error');
        }),
      } as HttpDelegate;

      const client = universalClient(
        () => ({ delegate: mockDelegate }),
        withInterceptor({
          onError: (method: string, url: string, error: Error) => {
            errorHandler(method, url, error.message);
          },
        }),
        withMethods(({ delegate }) => ({
          deleteUser: (id: number) => (delegate as HttpDelegate).delete<UserResponse>(`/users/${id}`),
        })),
      );

      await expect(client.deleteUser(1)).rejects.toThrow('Network error');
      expect(errorHandler).toHaveBeenCalledWith('delete', '/users/1', 'Network error');
    });
  });

  describe('SSE delegates', () => {
    const createMockSseDelegate = () => ({
      open: mock((_options?: unknown) => {}),
      close: mock(() => {}),
      onOpen: mock((_cb: (event: Event) => void) => () => {}),
      onError: mock((_cb: (event: Event) => void) => () => {}),
      onMessage: mock((_cb: (data: unknown) => void) => () => {}),
      subscribe: mock((_event: string, _cb: (data: unknown) => void) => () => {}),
    });

    it('should call onBeforeOpen and onAfterOpen interceptors on open', async () => {
      const onBeforeOpen = mock(() => undefined);
      const onAfterOpen = mock(() => {});
      const mockSseDelegate = createMockSseDelegate();

      const client = universalClient(() => ({ delegate: mockSseDelegate }), withInterceptor({ onBeforeOpen, onAfterOpen }));

      await (client.delegate as ReturnType<typeof createMockSseDelegate>).open({ url: '/events' });

      expect(onBeforeOpen).toHaveBeenCalledWith({ url: '/events' });
      expect(mockSseDelegate.open).toHaveBeenCalledWith({ url: '/events' });
      expect(onAfterOpen).toHaveBeenCalledWith({ url: '/events' });
    });

    it('should apply modified options from onBeforeOpen', async () => {
      const onBeforeOpen = mock(() => ({ url: '/modified-events' }));
      const mockSseDelegate = createMockSseDelegate();

      const client = universalClient(() => ({ delegate: mockSseDelegate }), withInterceptor({ onBeforeOpen }));

      await (client.delegate as ReturnType<typeof createMockSseDelegate>).open({ url: '/events' });

      expect(mockSseDelegate.open).toHaveBeenCalledWith({ url: '/modified-events' });
    });

    it('should call onBeforeClose and onAfterClose interceptors on close', () => {
      const onBeforeClose = mock(() => {});
      const onAfterClose = mock(() => {});
      const mockSseDelegate = createMockSseDelegate();

      const client = universalClient(() => ({ delegate: mockSseDelegate }), withInterceptor({ onBeforeClose, onAfterClose }));

      (client.delegate as ReturnType<typeof createMockSseDelegate>).close();

      expect(onBeforeClose).toHaveBeenCalled();
      expect(mockSseDelegate.close).toHaveBeenCalled();
      expect(onAfterClose).toHaveBeenCalled();
    });

    it('should intercept onError events and convert Event to Error', () => {
      const onErrorInterceptor = mock((_error: unknown) => {});
      const mockSseDelegate = createMockSseDelegate();

      const client = universalClient(() => ({ delegate: mockSseDelegate }), withInterceptor({ onError: onErrorInterceptor }));

      const userCallback = mock((_event: Event) => {});
      (client.delegate as ReturnType<typeof createMockSseDelegate>).onError(userCallback);

      // Get the wrapped callback that was passed to the original delegate
      const wrappedCallback = mockSseDelegate.onError.mock.calls[0][0];
      const fakeEvent = new Event('error');
      wrappedCallback(fakeEvent);

      expect(onErrorInterceptor).toHaveBeenCalledWith(expect.any(Error));
      expect((onErrorInterceptor.mock.calls[0][0] as Error).message).toBe('error');
      expect(userCallback).toHaveBeenCalledWith(fakeEvent);
    });

    it('should intercept onMessage events', () => {
      const onMessageInterceptor = mock((_data: unknown) => {});
      const mockSseDelegate = createMockSseDelegate();

      const client = universalClient(() => ({ delegate: mockSseDelegate }), withInterceptor({ onMessage: onMessageInterceptor }));

      const userCallback = mock((_data: unknown) => {});
      (client.delegate as ReturnType<typeof createMockSseDelegate>).onMessage(userCallback);

      const wrappedCallback = mockSseDelegate.onMessage.mock.calls[0][0];
      wrappedCallback({ type: 'update', payload: 'data' });

      expect(onMessageInterceptor).toHaveBeenCalledWith({ type: 'update', payload: 'data' });
      expect(userCallback).toHaveBeenCalledWith({ type: 'update', payload: 'data' });
    });

    it('should preserve onOpen and subscribe without interception', () => {
      const mockSseDelegate = createMockSseDelegate();

      const client = universalClient(() => ({ delegate: mockSseDelegate }), withInterceptor({ onBeforeOpen: () => undefined }));

      const delegate = client.delegate as ReturnType<typeof createMockSseDelegate>;
      delegate.onOpen(() => {});
      delegate.subscribe('custom-event', () => {});

      expect(mockSseDelegate.onOpen).toHaveBeenCalled();
      expect(mockSseDelegate.subscribe).toHaveBeenCalledWith('custom-event', expect.any(Function));
    });
  });

  describe('WebSocket delegates', () => {
    it('should wrap WebSocket delegate with interceptors', () => {
      const onBeforeConnect = mock(() => {});
      const mockWebSocketDelegate = {
        connect: mock(() => {}),
        close: mock(() => {}),
        send: mock(() => {}),
        onOpen: () => () => {},
        onClose: () => () => {},
        onError: () => () => {},
        onMessage: () => () => {},
      };

      const client = universalClient(() => ({ delegate: mockWebSocketDelegate }), withInterceptor({ onBeforeConnect }));

      (client.delegate as typeof mockWebSocketDelegate).connect();

      expect(onBeforeConnect).toHaveBeenCalled();
      expect(mockWebSocketDelegate.connect).toHaveBeenCalled();
    });
  });
});
