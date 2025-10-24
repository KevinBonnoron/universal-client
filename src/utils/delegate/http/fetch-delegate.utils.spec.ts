import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { createFetchDelegate } from './fetch-delegate.utils';

// Mock fetch globally
const mockFetch = mock();
global.fetch = mockFetch as unknown as typeof fetch;

describe('createFetchDelegate', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  describe('PUT method', () => {
    it('should send PUT request with correct URL and body', async () => {
      const mockResponse = { json: () => Promise.resolve({ success: true }) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
      });

      const testData = { name: 'John', age: 30 };
      await delegate.put('/users/1', testData);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users/1', {
        method: 'PUT',
        body: JSON.stringify(testData),
        headers: {},
      });
    });

    it('should not concatenate body to URL', async () => {
      const mockResponse = { json: () => Promise.resolve({ success: true }) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
      });

      const testData = { name: 'John', age: 30 };
      await delegate.put('/users/1', testData);

      // Vérifier que l'URL ne contient pas le body
      const call = mockFetch.mock.calls[0];
      const url = call[0];
      const options = call[1];

      expect(url).toBe('https://api.example.com/users/1');
      expect(url).not.toContain('John');
      expect(url).not.toContain('30');
      expect(options.body).toBe(JSON.stringify(testData));
    });

    it('should handle PUT with params correctly', async () => {
      const mockResponse = { json: () => Promise.resolve({ success: true }) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
      });

      const testData = { name: 'John' };
      const params = { include: 'profile', format: 'json' };

      await delegate.put('/users/1', testData, { params });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users/1?include=profile&format=json', {
        method: 'PUT',
        body: JSON.stringify(testData),
        headers: {},
      });
    });

    it('should handle PUT with headers correctly', async () => {
      const mockResponse = { json: () => Promise.resolve({ success: true }) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
      });

      const testData = { name: 'John' };
      const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer token' };

      await delegate.put('/users/1', testData, { headers });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users/1', {
        method: 'PUT',
        body: JSON.stringify(testData),
        headers,
      });
    });

    it('should handle PUT with both params and headers', async () => {
      const mockResponse = { json: () => Promise.resolve({ success: true }) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
      });

      const testData = { name: 'John' };
      const params = { include: 'profile' };
      const headers = { 'Content-Type': 'application/json' };

      await delegate.put('/users/1', testData, { params, headers });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users/1?include=profile', {
        method: 'PUT',
        body: JSON.stringify(testData),
        headers,
      });
    });

    it('should handle complex body objects correctly', async () => {
      const mockResponse = { json: () => Promise.resolve({ success: true }) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
      });

      const complexData = {
        user: { name: 'John', age: 30 },
        metadata: { source: 'web', timestamp: '2024-01-01T00:00:00Z' },
        tags: ['admin', 'verified'],
      };

      await delegate.put('/users/1', complexData);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users/1', {
        method: 'PUT',
        body: JSON.stringify(complexData),
        headers: {},
      });
    });
  });

  describe('POST method', () => {
    it('should send POST request with correct URL and body', async () => {
      const mockResponse = { json: () => Promise.resolve({ success: true }) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
      });

      const testData = { name: 'John', age: 30 };
      await delegate.post('/users', testData);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users', {
        method: 'POST',
        body: JSON.stringify(testData),
        headers: {},
      });
    });
  });

  describe('PATCH method', () => {
    it('should send PATCH request with correct URL and body', async () => {
      const mockResponse = { json: () => Promise.resolve({ success: true }) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
      });

      const testData = { name: 'John Updated' };
      await delegate.patch('/users/1', testData);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users/1', {
        method: 'PATCH',
        body: JSON.stringify(testData),
        headers: {},
      });
    });
  });

  describe('GET method', () => {
    it('should send GET request with correct URL', async () => {
      const mockResponse = { json: () => Promise.resolve({ id: 1, name: 'John' }) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
      });

      await delegate.get('/users/1');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users/1', {
        headers: {},
      });
    });

    it('should handle GET with params', async () => {
      const mockResponse = { json: () => Promise.resolve({ users: [] }) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
      });

      const params = { page: '1', limit: '10' };
      await delegate.get('/users', { params });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users?page=1&limit=10', {
        headers: {},
      });
    });
  });

  describe('DELETE method', () => {
    it('should send DELETE request with correct URL', async () => {
      const mockResponse = { json: () => Promise.resolve({ success: true }) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
      });

      await delegate.delete('/users/1');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users/1', {
        method: 'DELETE',
        headers: {},
      });
    });
  });

  describe('Response parsing', () => {
    it('should parse JSON response by default', async () => {
      const mockData = { id: 1, name: 'John' };
      const mockResponse = { json: () => Promise.resolve(mockData) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
      });

      const result = await delegate.get('/users/1');
      expect(result).toEqual(mockData);
    });

    it('should parse text response when format is text', async () => {
      const mockText = 'Hello World';
      const mockResponse = { text: () => Promise.resolve(mockText) };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
        format: 'text',
      });

      const result = await delegate.get('/users/1');
      expect(result).toBe(mockText);
    });

    it('should return raw response when format is raw', async () => {
      const mockResponse = { status: 200, ok: true };
      mockFetch.mockResolvedValue(mockResponse);

      const delegate = createFetchDelegate({
        baseURL: 'https://api.example.com',
        type: 'http',
        format: 'raw',
      });

      const result = await delegate.get('/users/1');
      expect(result).toBe(mockResponse);
    });
  });
});
