import { describe, expect, it, mock } from 'bun:test';
import type { HttpDelegate } from '../types';
import { createDelegate, isDelegate, isHttpDelegate, isServerSentEventDelegate, isWebSocketDelegate } from './delegate.utils';

describe('delegate.utils', () => {
  describe('isHttpDelegate', () => {
    it('should return true for valid HTTP delegate', () => {
      const httpDelegate = {
        get: async () => ({}),
        post: async () => ({}),
        patch: async () => ({}),
        put: async () => ({}),
        delete: async () => ({}),
      } as HttpDelegate;

      expect(isHttpDelegate(httpDelegate)).toBe(true);
    });

    it('should return false for invalid HTTP delegate', () => {
      expect(isHttpDelegate({})).toBe(false);
      expect(isHttpDelegate({ get: () => {} })).toBe(false);
      expect(isHttpDelegate({ get: () => {}, post: () => {} })).toBe(false);
      expect(isHttpDelegate(null)).toBe(false);
      expect(isHttpDelegate(undefined)).toBe(false);
      expect(isHttpDelegate('string')).toBe(false);
    });
  });

  describe('isWebSocketDelegate', () => {
    it('should return true for valid WebSocket delegate', () => {
      const webSocketDelegate = {
        connect: () => {},
        send: async () => {},
        close: async () => {},
      };

      expect(isWebSocketDelegate(webSocketDelegate)).toBe(true);
    });

    it('should return false for invalid WebSocket delegate', () => {
      expect(isWebSocketDelegate({})).toBe(false);
      expect(isWebSocketDelegate({ connect: () => {} })).toBe(false);
      expect(isWebSocketDelegate({ connect: () => {}, send: () => {} })).toBe(false);
      expect(isWebSocketDelegate(null)).toBe(false);
      expect(isWebSocketDelegate(undefined)).toBe(false);
    });
  });

  describe('isServerSentEventDelegate', () => {
    it('should return true for valid ServerSentEvent delegate', () => {
      const sseDelegate = {
        onMessage: () => {},
        onError: () => {},
        onOpen: () => {},
        subscribe: () => {},
      };

      expect(isServerSentEventDelegate(sseDelegate)).toBe(true);
    });

    it('should return false for invalid ServerSentEvent delegate', () => {
      expect(isServerSentEventDelegate({})).toBe(false);
      expect(isServerSentEventDelegate({ onMessage: () => {} })).toBe(false);
      expect(isServerSentEventDelegate({ onMessage: () => {}, onError: () => {} })).toBe(false);
      expect(isServerSentEventDelegate(null)).toBe(false);
      expect(isServerSentEventDelegate(undefined)).toBe(false);
    });
  });

  describe('isDelegate', () => {
    it('should return true for HTTP delegate', () => {
      const httpDelegate = {
        get: async () => ({}),
        post: async () => ({}),
        patch: async () => ({}),
        put: async () => ({}),
        delete: async () => ({}),
      } as HttpDelegate;

      expect(isDelegate(httpDelegate)).toBe(true);
    });

    it('should return true for WebSocket delegate', () => {
      const webSocketDelegate = {
        connect: () => {},
        send: async () => {},
        close: async () => {},
      };

      expect(isDelegate(webSocketDelegate)).toBe(true);
    });

    it('should return true for ServerSentEvent delegate', () => {
      const sseDelegate = {
        onMessage: () => {},
        onError: () => {},
        onOpen: () => {},
        subscribe: () => {},
      };

      expect(isDelegate(sseDelegate)).toBe(true);
    });

    it('should return false for invalid delegate', () => {
      expect(isDelegate({})).toBe(false);
      expect(isDelegate(null)).toBe(false);
      expect(isDelegate(undefined)).toBe(false);
      expect(isDelegate('string')).toBe(false);
    });
  });

  describe('createDelegate', () => {
    it('should return delegate when passed a delegate', () => {
      const httpDelegate = {
        get: async () => ({}),
        post: async () => ({}),
        patch: async () => ({}),
        put: async () => ({}),
        delete: async () => ({}),
      } as HttpDelegate;

      const result = createDelegate(httpDelegate);
      expect(result).toBe(httpDelegate);
    });

    it('should create HTTP delegate from options', () => {
      const options = {
        type: 'http' as const,
        baseURL: 'https://api.example.com',
      };

      const result = createDelegate(options);
      expect(isHttpDelegate(result)).toBe(true);
    });

    it('should create WebSocket delegate from options', () => {
      const options = {
        type: 'websocket' as const,
        baseURL: 'ws://localhost:8080',
      };

      // @ts-expect-error - WebSocket mock for testing
      global.WebSocket = mock(() => ({}));

      const result = createDelegate(options);
      expect(isWebSocketDelegate(result)).toBe(true);
    });

    it('should create ServerSentEvent delegate from options', () => {
      const options = {
        type: 'server-sent-event' as const,
        baseURL: 'http://localhost:8080/events',
      };

      // @ts-expect-error - EventSource mock for testing
      global.EventSource = mock(() => ({}));

      const result = createDelegate(options);
      expect(isServerSentEventDelegate(result)).toBe(true);
    });

    it('should throw error for unsupported delegate type', () => {
      const options = {
        type: 'unsupported',
      } as const;

      // @ts-expect-error - unsupported delegate type
      expect(() => createDelegate(options)).toThrow('Unsupported delegate type');
    });
  });
});
