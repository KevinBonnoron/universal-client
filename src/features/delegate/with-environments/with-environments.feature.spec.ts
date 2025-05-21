import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { HttpDelegate } from '../../../types';
import { withEnvironments } from './with-environments.feature';

const mockConsole = {
  warn: mock(() => {}),
  info: mock(() => {}),
};

Object.defineProperty(global, 'console', {
  value: mockConsole,
  writable: true,
});

describe('withEnvironments', () => {
  let mockHttpDelegate: {
    get: ReturnType<typeof mock>;
    post: ReturnType<typeof mock>;
    patch: ReturnType<typeof mock>;
    put: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };
  let mockWebSocketDelegate: {
    connect: ReturnType<typeof mock>;
    send: ReturnType<typeof mock>;
    onMessage: ReturnType<typeof mock>;
    close: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockHttpDelegate = {
      get: mock(async (url: string) => ({ url, data: 'test' })),
      post: mock(async (url: string, body: unknown) => ({ url, body, data: 'created' })),
      patch: mock(async (url: string, body: unknown) => ({ url, body, data: 'updated' })),
      put: mock(async (url: string, body: unknown) => ({ url, body, data: 'replaced' })),
      delete: mock(async (url: string) => ({ url, data: 'deleted' })),
    };

    mockWebSocketDelegate = {
      connect: mock(() => {}),
      send: mock(async (_message: string) => {}),
      onMessage: mock((_callback: (message: string) => void) => () => {}),
      close: mock(async () => {}),
    };

    mockConsole.warn.mockClear();
    mockConsole.info.mockClear();
  });

  it('should create environments feature with default environment', () => {
    const config = {
      name: 'delegate' as const,
      environments: {
        dev: 'http://localhost:3000',
        prod: 'https://api.example.com',
      },
    };

    const feature = withEnvironments(config);
    const result = feature({ delegate: mockHttpDelegate });

    expect(result.environments).toBeDefined();
    expect(result.environments.getCurrentEnvironment()).toBe('dev');
    expect(result.environments.getBaseURL()).toBe('http://localhost:3000');
  });

  it('should use specified default environment', () => {
    const config = {
      name: 'delegate' as const,
      environments: {
        dev: 'http://localhost:3000',
        prod: 'https://api.example.com',
        staging: 'https://staging.example.com',
      },
      default: 'staging' as const,
    };

    const feature = withEnvironments(config);
    const result = feature({ delegate: mockHttpDelegate });

    expect(result.environments.getCurrentEnvironment()).toBe('staging');
    expect(result.environments.getBaseURL()).toBe('https://staging.example.com');
  });

  it('should switch environments', () => {
    const config = {
      name: 'delegate' as const,
      environments: {
        dev: 'http://localhost:3000',
        prod: 'https://api.example.com',
      },
    };

    const feature = withEnvironments(config);
    const result = feature({ delegate: mockHttpDelegate });

    result.environments.setEnvironment('prod');
    expect(result.environments.getCurrentEnvironment()).toBe('prod');
    expect(result.environments.getBaseURL()).toBe('https://api.example.com');
    expect(mockConsole.info).toHaveBeenCalledWith('[ENVIRONMENTS] Switched to environment: prod (https://api.example.com)');
  });

  it('should handle invalid environment with fallback', () => {
    const config = {
      name: 'delegate' as const,
      environments: {
        dev: 'http://localhost:3000',
        prod: 'https://api.example.com',
      },
      fallback: 'dev' as const,
    };

    const feature = withEnvironments(config);
    const result = feature({ delegate: mockHttpDelegate });

    // @ts-expect-error - invalid environment
    result.environments.setEnvironment('invalid');
    expect(result.environments.getCurrentEnvironment()).toBe('dev');
    expect(result.environments.getBaseURL()).toBe('http://localhost:3000');
    expect(mockConsole.warn).toHaveBeenCalledWith('[ENVIRONMENTS] Environment "invalid" not found, falling back to "dev"');
  });

  it('should handle invalid environment with default fallback', () => {
    const config = {
      name: 'delegate' as const,
      environments: {
        dev: 'http://localhost:3000',
        prod: 'https://api.example.com',
      },
    };

    const feature = withEnvironments(config);
    const result = feature({ delegate: mockHttpDelegate });

    // @ts-expect-error - invalid environment for testing
    result.environments.setEnvironment('invalid');
    expect(result.environments.getCurrentEnvironment()).toBe('dev');
    expect(result.environments.getBaseURL()).toBe('http://localhost:3000');
    expect(mockConsole.warn).toHaveBeenCalledWith('[ENVIRONMENTS] Environment "invalid" not found, falling back to "dev"');
  });

  it('should wrap HTTP delegate with environment URLs', async () => {
    const config = {
      name: 'delegate' as const,
      environments: {
        dev: 'http://localhost:3000',
        prod: 'https://api.example.com',
      },
    };

    const feature = withEnvironments(config);
    const result = feature({ delegate: mockHttpDelegate });

    const response = await (result as { delegate: HttpDelegate }).delegate.get('/api/users');

    expect(mockHttpDelegate.get).toHaveBeenCalled();
    expect(mockConsole.info).toHaveBeenCalledWith('[ENVIRONMENTS] Building URL: http://localhost:3000 + /api/users = http://localhost:3000/api/users');
    // @ts-expect-error - response has url property from mock
    expect(response.url).toBe('http://localhost:3000/api/users');
  });

  it('should handle absolute URLs without modification', async () => {
    const config = {
      name: 'delegate' as const,
      environments: {
        dev: 'http://localhost:3000',
        prod: 'https://api.example.com',
      },
    };

    const feature = withEnvironments(config);
    const result = feature({ delegate: mockHttpDelegate });

    const response = await (result as { delegate: HttpDelegate }).delegate.get('https://external-api.com/data');

    expect(mockHttpDelegate.get).toHaveBeenCalled();
    // @ts-expect-error - response has url property from mock
    expect(response.url).toBe('https://external-api.com/data');
  });

  it('should handle relative URLs without leading slash', async () => {
    const config = {
      name: 'delegate' as const,
      environments: {
        dev: 'http://localhost:3000',
        prod: 'https://api.example.com',
      },
    };

    const feature = withEnvironments(config);
    const result = feature({ delegate: mockHttpDelegate });

    const response = await (result as { delegate: HttpDelegate }).delegate.get('api/users');

    expect(mockHttpDelegate.get).toHaveBeenCalled();
    // @ts-expect-error - response has url property from mock
    expect(response.url).toBe('http://localhost:3000/api/users');
  });

  it('should handle base URL with trailing slash', async () => {
    const config = {
      name: 'delegate' as const,
      environments: {
        dev: 'http://localhost:3000/',
        prod: 'https://api.example.com/',
      },
    };

    const feature = withEnvironments(config);
    const result = feature({ delegate: mockHttpDelegate });

    const response = await (result as { delegate: HttpDelegate }).delegate.get('/api/users');

    expect(mockHttpDelegate.get).toHaveBeenCalled();
    // @ts-expect-error - response has url property from mock
    expect(response.url).toBe('http://localhost:3000/api/users');
  });

  it('should work with all HTTP methods', async () => {
    const config = {
      name: 'delegate' as const,
      environments: {
        dev: 'http://localhost:3000',
        prod: 'https://api.example.com',
      },
    };

    const feature = withEnvironments(config);
    const result = feature({ delegate: mockHttpDelegate });

    const postResponse = await (result as { delegate: HttpDelegate }).delegate.post('/api/users', { name: 'John' });
    const patchResponse = await (result as { delegate: HttpDelegate }).delegate.patch('/api/users/1', { name: 'Jane' });
    const putResponse = await (result as { delegate: HttpDelegate }).delegate.put('/api/users/1', { name: 'Bob' });
    const deleteResponse = await (result as { delegate: HttpDelegate }).delegate.delete('/api/users/1');

    expect(mockHttpDelegate.post).toHaveBeenCalled();
    expect(mockHttpDelegate.patch).toHaveBeenCalled();
    expect(mockHttpDelegate.put).toHaveBeenCalled();
    expect(mockHttpDelegate.delete).toHaveBeenCalled();
    // @ts-expect-error - postResponse has url property from mock
    expect(postResponse.url).toBe('http://localhost:3000/api/users');
    // @ts-expect-error - patchResponse has url property from mock
    expect(patchResponse.url).toBe('http://localhost:3000/api/users/1');
    // @ts-expect-error - putResponse has url property from mock
    expect(putResponse.url).toBe('http://localhost:3000/api/users/1');
    // @ts-expect-error - deleteResponse has url property from mock
    expect(deleteResponse.url).toBe('http://localhost:3000/api/users/1');
  });

  it('should wrap WebSocket delegate with environment URLs', () => {
    const config = {
      name: 'delegate' as const,
      environments: {
        dev: 'ws://localhost:3000',
        prod: 'wss://api.example.com',
      },
    };

    const feature = withEnvironments(config);
    const result = feature({ delegate: mockWebSocketDelegate });

    (result as { delegate: { connect: () => void } }).delegate.connect();

    expect(mockConsole.info).toHaveBeenCalledWith('[ENVIRONMENTS] WebSocket connecting to: ws://localhost:3000');
    expect(mockWebSocketDelegate.connect).toHaveBeenCalled();
  });

  it('should preserve other delegate types without modification', () => {
    const mockOtherDelegate = {
      customMethod: () => 'custom',
    };

    const config = {
      name: 'delegate' as const,
      environments: {
        dev: 'http://localhost:3000',
        prod: 'https://api.example.com',
      },
    };

    const feature = withEnvironments(config);
    const result = feature({ delegate: mockOtherDelegate });

    expect((result as { delegate: unknown }).delegate).toBe(mockOtherDelegate);
    expect(result.environments).toBeDefined();
  });

  it('should work with custom delegate names', () => {
    const config = {
      name: 'apiClient' as const,
      environments: {
        dev: 'http://localhost:3000',
        prod: 'https://api.example.com',
      },
    };

    const feature = withEnvironments(config);
    const result = feature({ apiClient: mockHttpDelegate });

    expect(result.environments).toBeDefined();
    expect(result.apiClient).toBeDefined();
  });
});
