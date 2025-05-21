import type { Delegate, DelegateFeature, HttpDelegate } from '../../../types';
import { isHttpDelegate } from '../../../utils';

interface OfflineConfig {
  /**
   * The strategy to use for the offline manager.
   * @default 'cache-first'
   */
  strategy?: 'cache-first' | 'network-first' | 'network-only';
  /**
   * The TTL for the cache in milliseconds.
   * @default 300000 (5 minutes)
   */
  cacheTTL?: number;
}

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface OfflineManager {
  isOnline(): boolean;
  clearCache(): void;
  getCacheSize(): number;
}

interface ExtendedOfflineManager extends OfflineManager {
  getFromCache: <T>(key: string) => T | null;
  setInCache: <T>(key: string, data: T) => void;
  generateCacheKey: (method: string, url: string, body?: unknown) => string;
}

function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine !== undefined ? navigator.onLine : true;
}

function createOfflineManager(config: OfflineConfig): ExtendedOfflineManager {
  const cache = new Map<string, CacheEntry>();
  const cacheTTL = config.cacheTTL ?? 300000;

  function generateCacheKey(method: string, url: string, body?: unknown): string {
    const bodyStr = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyStr}`;
  }

  function getFromCache<T>(cacheKey: string): T | null {
    const entry = cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(cacheKey);
      return null;
    }

    return entry.data as T;
  }

  function setInCache<T>(cacheKey: string, data: T): void {
    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL,
    });
  }

  return {
    isOnline,
    clearCache: () => cache.clear(),
    getCacheSize: () => cache.size,
    getFromCache: getFromCache,
    setInCache: setInCache,
    generateCacheKey: generateCacheKey,
  };
}

function wrapHttpDelegateWithOffline(delegate: HttpDelegate, offlineManager: ExtendedOfflineManager, config: OfflineConfig): HttpDelegate {
  const strategy = config.strategy ?? 'cache-first';

  const wrapMethod = <K extends keyof HttpDelegate>(methodName: K) => {
    const originalMethod = delegate[methodName];

    return async <T>(url: string, bodyOrOptions?: unknown, optionsArg?: unknown): Promise<T> => {
      // Handle overloaded signatures
      const isGetOrDelete = methodName === 'get' || methodName === 'delete';
      const body = isGetOrDelete ? undefined : bodyOrOptions;
      const options = isGetOrDelete ? bodyOrOptions : optionsArg;

      const cacheKey = offlineManager.generateCacheKey(String(methodName), url, body);

      if (strategy === 'cache-first') {
        const cached = offlineManager.getFromCache<T>(cacheKey);
        if (cached) {
          console.info(`[OFFLINE] Cache hit for ${methodName} ${url}`);
          return cached;
        }

        if (offlineManager.isOnline()) {
          try {
            const result = isGetOrDelete ? await (originalMethod as (url: string, options?: unknown) => Promise<T>)(url, options) : await (originalMethod as (url: string, body: unknown, options?: unknown) => Promise<T>)(url, body, options);
            offlineManager.setInCache(cacheKey, result);
            return result;
          } catch (error) {
            console.error(`[OFFLINE] Network error for ${methodName} ${url}:`, error);
            throw error;
          }
        }

        throw new Error(`[OFFLINE] No cache available and offline for ${methodName} ${url}`);
      }

      if (strategy === 'network-first') {
        if (offlineManager.isOnline()) {
          try {
            const result = isGetOrDelete ? await (originalMethod as (url: string, options?: unknown) => Promise<T>)(url, options) : await (originalMethod as (url: string, body: unknown, options?: unknown) => Promise<T>)(url, body, options);
            offlineManager.setInCache(cacheKey, result);
            return result;
          } catch (error) {
            const cached = offlineManager.getFromCache<T>(cacheKey);
            if (cached) {
              console.warn(`[OFFLINE] Network failed, using cache for ${methodName} ${url}`);
              return cached;
            }
            throw error;
          }
        }

        const cached = offlineManager.getFromCache<T>(cacheKey);
        if (cached) {
          return cached;
        }
        throw new Error(`[OFFLINE] Offline and no cache for ${methodName} ${url}`);
      }

      if (strategy === 'network-only') {
        if (!offlineManager.isOnline()) {
          throw new Error(`[OFFLINE] Network unavailable for ${methodName} ${url}`);
        }
        return isGetOrDelete ? await (originalMethod as (url: string, options?: unknown) => Promise<T>)(url, options) : await (originalMethod as (url: string, body: unknown, options?: unknown) => Promise<T>)(url, body, options);
      }

      throw new Error(`[OFFLINE] Unknown strategy: ${strategy}`);
    };
  };

  return {
    get: wrapMethod('get'),
    post: wrapMethod('post'),
    patch: wrapMethod('patch'),
    put: wrapMethod('put'),
    delete: wrapMethod('delete'),
  };
}

function wrapDelegateWithOffline(delegate: Delegate, offlineManager: ExtendedOfflineManager, config: OfflineConfig): Delegate {
  if (isHttpDelegate(delegate)) {
    return wrapHttpDelegateWithOffline(delegate, offlineManager, config);
  }

  return delegate;
}

export function withOffline(config: OfflineConfig = {}): DelegateFeature<{ offline: OfflineManager }> {
  return ({ delegate, ...rest }) => {
    const offlineManager = createOfflineManager(config);

    return {
      ...rest,
      delegate: wrapDelegateWithOffline(delegate, offlineManager, config),
      offline: offlineManager,
    };
  };
}
