import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { HttpDelegate } from '../../../types';
import { withOffline } from './with-offline.feature';

const mockNavigator = {
  onLine: true,
};

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

describe('withOffline', () => {
  let mockDelegate: {
    get: ReturnType<typeof mock>;
    post: ReturnType<typeof mock>;
    patch: ReturnType<typeof mock>;
    put: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockDelegate = {
      get: mock(async (url: string) => ({ url, data: 'test' })),
      post: mock(async (url: string, body: unknown) => ({ url, body, data: 'created' })),
      patch: mock(async (url: string, body: unknown) => ({ url, body, data: 'updated' })),
      put: mock(async (url: string, body: unknown) => ({ url, body, data: 'replaced' })),
      delete: mock(async (url: string) => ({ url, data: 'deleted' })),
    };

    mockNavigator.onLine = true;
  });

  it('should create offline feature with default config', () => {
    const feature = withOffline();
    const result = feature({ delegate: mockDelegate });

    expect(result.offline).toBeDefined();
    expect(result.offline.isOnline()).toBe(true);
    expect(result.offline.getCacheSize()).toBe(0);
    expect(result.delegate).toBeDefined();
  });

  it('should create offline feature with custom config', () => {
    const config = {
      strategy: 'network-first' as const,
      cacheTTL: 60000,
    };
    const feature = withOffline(config);
    const result = feature({ delegate: mockDelegate });

    expect(result.offline).toBeDefined();
    expect(result.delegate).toBeDefined();
  });

  it('should cache responses with cache-first strategy', async () => {
    const feature = withOffline({ strategy: 'cache-first' });
    const result = feature({ delegate: mockDelegate });

    const response1 = await (result.delegate as HttpDelegate).get('/api/test');
    expect(mockDelegate.get).toHaveBeenCalledTimes(1);
    expect(response1).toEqual({ url: '/api/test', data: 'test' });

    const response2 = await (result.delegate as HttpDelegate).get('/api/test');
    expect(response2).toEqual({ url: '/api/test', data: 'test' });
  });

  it('should use network-first strategy', async () => {
    const feature = withOffline({ strategy: 'network-first' });
    const result = feature({ delegate: mockDelegate });

    const response1 = await (result.delegate as HttpDelegate).get('/api/test');
    expect(mockDelegate.get).toHaveBeenCalledTimes(1);
    expect(response1).toEqual({ url: '/api/test', data: 'test' });

    const response2 = await (result.delegate as HttpDelegate).get('/api/test');
    expect(mockDelegate.get).toHaveBeenCalledTimes(2);
    expect(response2).toEqual({ url: '/api/test', data: 'test' });
  });

  it('should use network-only strategy', async () => {
    const feature = withOffline({ strategy: 'network-only' });
    const result = feature({ delegate: mockDelegate });

    await (result.delegate as HttpDelegate).get('/api/test');
    await (result.delegate as HttpDelegate).get('/api/test');
    expect(mockDelegate.get).toHaveBeenCalledTimes(2);
  });

  it('should handle offline mode with cache-first strategy', async () => {
    mockNavigator.onLine = false;

    const feature = withOffline({ strategy: 'cache-first' });
    const result = feature({ delegate: mockDelegate });

    await expect((result.delegate as HttpDelegate).get('/api/test')).rejects.toThrow('[OFFLINE] No cache available and offline');

    mockNavigator.onLine = true;
    await (result.delegate as HttpDelegate).get('/api/test');
    expect(mockDelegate.get).toHaveBeenCalledTimes(1);

    mockNavigator.onLine = false;

    const response = await (result.delegate as HttpDelegate).get('/api/test');
    expect(response).toEqual({ url: '/api/test', data: 'test' });
  });

  it('should handle offline mode with network-first strategy', async () => {
    mockNavigator.onLine = false;

    const feature = withOffline({ strategy: 'network-first' });
    const result = feature({ delegate: mockDelegate });

    await expect((result.delegate as HttpDelegate).get('/api/test')).rejects.toThrow('[OFFLINE] Offline and no cache');

    mockNavigator.onLine = true;
    await (result.delegate as HttpDelegate).get('/api/test');
    expect(mockDelegate.get).toHaveBeenCalledTimes(1);

    mockNavigator.onLine = false;

    const response = await (result.delegate as HttpDelegate).get('/api/test');
    expect(response).toEqual({ url: '/api/test', data: 'test' });
  });

  it('should handle network errors with network-first strategy', async () => {
    const errorDelegate = {
      ...mockDelegate,
      get: mock(async () => {
        throw new Error('Network error');
      }),
    };

    const feature = withOffline({ strategy: 'network-first' });
    const result = feature({ delegate: errorDelegate });

    expect((result.delegate as HttpDelegate).get('/api/test')).rejects.toThrow('Network error');

    // @ts-expect-error - mock assignment for testing
    errorDelegate.get = mock(async () => Promise.resolve({ url: '/api/test', data: 'cached' }));

    const result2 = feature({ delegate: errorDelegate });
    await (result2.delegate as HttpDelegate).get('/api/test');

    errorDelegate.get = mock(async () => {
      throw new Error('Network error');
    });

    const response = await (result2.delegate as HttpDelegate).get('/api/test');
    expect(response).toEqual({ url: '/api/test', data: 'cached' });
  });

  it('should respect cache TTL', async () => {
    const feature = withOffline({
      strategy: 'cache-first',
      cacheTTL: 10,
    });
    const result = feature({ delegate: mockDelegate });

    await (result.delegate as HttpDelegate).get('/api/test');
    expect(mockDelegate.get).toHaveBeenCalledTimes(1);

    await (result.delegate as HttpDelegate).get('/api/test');
    expect(mockDelegate.get).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, 15));

    await (result.delegate as HttpDelegate).get('/api/test');
    expect(mockDelegate.get).toHaveBeenCalledTimes(2);
  });

  it('should clear cache', async () => {
    const feature = withOffline({ strategy: 'cache-first' });
    const result = feature({ delegate: mockDelegate });

    await (result.delegate as HttpDelegate).get('/api/test');
    expect(result.offline.getCacheSize()).toBe(1);

    result.offline.clearCache();
    expect(result.offline.getCacheSize()).toBe(0);

    await (result.delegate as HttpDelegate).get('/api/test');
    expect(mockDelegate.get).toHaveBeenCalledTimes(2);
  });

  it('should generate unique cache keys for different requests', async () => {
    const feature = withOffline({ strategy: 'cache-first' });
    const result = feature({ delegate: mockDelegate });

    await (result.delegate as HttpDelegate).get('/api/test1');
    await (result.delegate as HttpDelegate).get('/api/test2');
    await (result.delegate as HttpDelegate).post('/api/test1', { data: 'body' });

    expect(mockDelegate.get).toHaveBeenCalledTimes(2);
    expect(mockDelegate.post).toHaveBeenCalledTimes(1);
    expect(result.offline.getCacheSize()).toBe(3);
  });

  it('should work with all HTTP methods', async () => {
    const feature = withOffline({ strategy: 'cache-first' });
    const result = feature({ delegate: mockDelegate });

    await (result.delegate as HttpDelegate).get('/api/test');
    await (result.delegate as HttpDelegate).post('/api/test', { data: 'test' });
    await (result.delegate as HttpDelegate).patch('/api/test', { data: 'test' });
    await (result.delegate as HttpDelegate).put('/api/test', { data: 'test' });
    await (result.delegate as HttpDelegate).delete('/api/test');

    expect(mockDelegate.get).toHaveBeenCalledTimes(1);
    expect(mockDelegate.post).toHaveBeenCalledTimes(1);
    expect(mockDelegate.patch).toHaveBeenCalledTimes(1);
    expect(mockDelegate.put).toHaveBeenCalledTimes(1);
    expect(mockDelegate.delete).toHaveBeenCalledTimes(1);
  });
});
