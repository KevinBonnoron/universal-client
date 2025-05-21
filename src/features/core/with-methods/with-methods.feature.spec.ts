import { describe, expect, it } from 'bun:test';
import { withMethods } from './with-methods.feature';

describe('withMethods', () => {
  it('should create methods from a method creator function', () => {
    const methodCreator = (input: { baseUrl: string }) => ({
      getUser: (id: string) => `${input.baseUrl}/users/${id}`,
      createUser: (_user: Record<string, unknown>) => `${input.baseUrl}/users`,
    });

    const feature = withMethods(methodCreator);
    const input = { baseUrl: 'https://api.example.com' };
    const result = feature(input);

    expect(result.getUser('123')).toBe('https://api.example.com/users/123');
    expect(result.createUser({ name: 'John' })).toBe('https://api.example.com/users');
  });

  it('should work with empty input', () => {
    const methodCreator = () => ({
      getData: () => 'data',
      setData: (value: string) => value,
    });

    const feature = withMethods(methodCreator);
    const result = feature({});

    expect(result.getData()).toBe('data');
    expect(result.setData('test')).toBe('test');
  });

  it('should work with complex input types', () => {
    interface Config {
      apiKey: string;
      timeout: number;
    }

    const methodCreator = (config: Config) => ({
      makeRequest: (url: string) => ({
        url,
        headers: { Authorization: `Bearer ${config.apiKey}` },
        timeout: config.timeout,
      }),
    });

    const feature = withMethods(methodCreator);
    const config: Config = { apiKey: 'secret123', timeout: 5000 };
    const result = feature(config);

    const request = result.makeRequest('/api/data');
    expect(request).toEqual({
      url: '/api/data',
      headers: { Authorization: 'Bearer secret123' },
      timeout: 5000,
    });
  });

  it('should preserve method context and closures', () => {
    let callCount = 0;

    const methodCreator = (input: { counter: number }) => ({
      increment: () => {
        callCount++;
        return input.counter + callCount;
      },
      getCallCount: () => callCount,
    });

    const feature = withMethods(methodCreator);
    const result = feature({ counter: 10 });

    expect(result.increment()).toBe(11);
    expect(result.increment()).toBe(12);
    expect(result.getCallCount()).toBe(2);
  });

  it('should work with async methods', async () => {
    const methodCreator = (input: { delay: number }) => ({
      delayedResponse: async (message: string) => {
        await new Promise((resolve) => setTimeout(resolve, input.delay));
        return `Response: ${message}`;
      },
    });

    const feature = withMethods(methodCreator);
    const result = feature({ delay: 10 });

    const response = await result.delayedResponse('Hello');
    expect(response).toBe('Response: Hello');
  });

  it('should handle methods that return different types', () => {
    const methodCreator = () => ({
      getString: () => 'string',
      getNumber: () => 42,
      getBoolean: () => true,
      getObject: () => ({ key: 'value' }),
      getArray: () => [1, 2, 3],
    });

    const feature = withMethods(methodCreator);
    const result = feature({});

    expect(typeof result.getString()).toBe('string');
    expect(typeof result.getNumber()).toBe('number');
    expect(typeof result.getBoolean()).toBe('boolean');
    expect(typeof result.getObject()).toBe('object');
    expect(Array.isArray(result.getArray())).toBe(true);
  });
});
