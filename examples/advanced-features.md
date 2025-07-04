# Advanced Features Example

This example demonstrates advanced usage patterns of Universal Client including hooks, custom delegates, caching, authentication, and retry mechanisms using TypeScript.

## Overview

Learn how to:
- Implement custom hooks for request/response processing
- Create caching strategies with TTL
- Handle authentication with token management
- Implement retry logic with exponential backoff
- Build batch operations
- Transform data with typed interfaces

## Type Definitions

Define comprehensive types for advanced features:

```typescript
interface CacheItem<T> {
  data: T;
  expiry: number;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface RequestConfig {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  cached?: boolean;
  retries?: number;
}

interface ResponseData<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryCondition?: (error: any) => boolean;
}

interface BatchResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  index: number;
}
```

## Advanced Cache Implementation

```typescript
class AdvancedCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private defaultTTL: number;
  private maxSize: number;
  
  constructor(defaultTTL = 300000, maxSize = 1000) { // 5 minutes, 1000 items
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
  }
  
  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  set(key: string, data: T, ttl?: number): void {
    // Enforce max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiry });
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
  
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  // Get cache statistics
  getStats(): { size: number; hitRate: number; memoryUsage: string } {
    const size = this.cache.size;
    const memoryUsage = `${Math.round(JSON.stringify(Array.from(this.cache.entries())).length / 1024)}KB`;
    
    return {
      size,
      hitRate: 0, // Would need tracking for real implementation
      memoryUsage
    };
  }
}
```

## Authentication Manager

```typescript
class AuthenticationManager {
  private tokens: AuthTokens | null = null;
  private refreshPromise: Promise<string> | null = null;
  
  setTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
  }
  
  getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }
  
  isAuthenticated(): boolean {
    return !!this.tokens && Date.now() < this.tokens.expiresAt;
  }
  
  isTokenExpired(): boolean {
    return !!this.tokens && Date.now() >= this.tokens.expiresAt;
  }
  
  getAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  
  async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newAccessToken = await this.refreshPromise;
      return newAccessToken;
    } finally {
      this.refreshPromise = null;
    }
  }
  
  private async performTokenRefresh(): Promise<string> {
    // Simulate token refresh API call
    console.log('🔑 Refreshing access token...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newTokens: AuthTokens = {
      accessToken: `new-access-token-${Date.now()}`,
      refreshToken: this.tokens!.refreshToken,
      expiresAt: Date.now() + 3600000 // 1 hour
    };
    
    this.setTokens(newTokens);
    console.log('✅ Access token refreshed successfully');
    
    return newTokens.accessToken;
  }
  
  clearTokens(): void {
    this.tokens = null;
  }
}
```

## Retry Utility with Exponential Backoff

```typescript
class RetryManager {
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    }
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry
        if (attempt === config.maxRetries) {
          break;
        }
        
        if (config.retryCondition && !config.retryCondition(error)) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * (2 ** attempt),
          config.maxDelay
        );
        
        console.log(`❌ Attempt ${attempt + 1} failed: ${lastError.message}`);
        console.log(`⏳ Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}
```

## Advanced Client Setup

```typescript
import { universalClient, withDelegate, withMethods, withHooks } from '@kevinbonnoron/universal-client';

// Initialize managers
const cache = new AdvancedCache();
const authManager = new AuthenticationManager();

// Set initial authentication
authManager.setTokens({
  accessToken: 'initial-access-token',
  refreshToken: 'initial-refresh-token',
  expiresAt: Date.now() + 3600000
});

const client = universalClient(
  withDelegate({ 
    type: 'fetch', 
    baseURL: 'https://jsonplaceholder.typicode.com' 
  }),
  
  withHooks({
    // Pre-request hook
    beforeRequest: async (config: RequestConfig): Promise<RequestConfig> => {
      console.log(`📤 [${new Date().toISOString()}] ${config.method || 'GET'} ${config.url}`);
      
      // Add authentication headers
      if (authManager.isAuthenticated()) {
        config.headers = {
          ...config.headers,
          ...authManager.getAuthHeaders()
        };
      } else if (authManager.isTokenExpired()) {
        // Refresh token if expired
        try {
          await authManager.refreshToken();
          config.headers = {
            ...config.headers,
            ...authManager.getAuthHeaders()
          };
        } catch (error) {
          console.error('Failed to refresh token:', error);
        }
      }
      
      // Check cache for GET requests
      if ((!config.method || config.method.toLowerCase() === 'get') && config.cached !== false) {
        const cacheKey = `${config.method || 'GET'}:${config.url}`;
        const cachedData = cache.get(cacheKey);
        
        if (cachedData) {
          console.log('💾 Using cached response');
          return { ...config, cachedResponse: cachedData };
        }
      }
      
      return config;
    },
    
    // Post-response hook
    afterResponse: async (response: ResponseData, config: RequestConfig): Promise<ResponseData> => {
      console.log(`📥 [${new Date().toISOString()}] ${response.status} ${config.url}`);
      
      // Cache successful GET responses
      if (
        response.status >= 200 && 
        response.status < 300 && 
        (!config.method || config.method.toLowerCase() === 'get') &&
        config.cached !== false
      ) {
        const cacheKey = `${config.method || 'GET'}:${config.url}`;
        cache.set(cacheKey, response.data);
        console.log('💾 Response cached');
      }
      
      return response;
    },
    
    // Error handling hook
    onError: async (error: any, config: RequestConfig): Promise<any> => {
      console.log(`❌ [${new Date().toISOString()}] Error in ${config.url}:`, error.message);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        console.log('🔑 Authentication error detected');
        
        if (authManager.isTokenExpired()) {
          try {
            await authManager.refreshToken();
            console.log('🔄 Token refreshed, request should be retried');
            return { ...config, shouldRetry: true };
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            authManager.clearTokens();
          }
        }
      }
      
      return error;
    }
  }),
  
  withMethods(({ delegate }) => ({
    // Enhanced CRUD operations with retry logic
    getUser: async (id: number): Promise<User> => {
      return RetryManager.executeWithRetry(
        () => delegate.get(`/users/${id}`),
        {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 5000,
          retryCondition: (error) => error.response?.status >= 500
        }
      );
    },
    
    getAllUsers: async (): Promise<User[]> => {
      return RetryManager.executeWithRetry(
        () => delegate.get('/users')
      );
    },
    
    createPost: async (data: CreatePostData): Promise<Post> => {
      return RetryManager.executeWithRetry(
        () => delegate.post('/posts', { 
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' }
        })
      );
    },
    
    // Batch operations
    getBatchUsers: async (ids: number[]): Promise<BatchResult<User>[]> => {
      const promises = ids.map((id, index) => 
        RetryManager.executeWithRetry(() => delegate.get(`/users/${id}`))
          .then(data => ({ success: true, data, index }))
          .catch(error => ({ success: false, error, index }))
      );
      
      return Promise.all(promises);
    },
    
    // Parallel requests with different retry strategies
    getParallelData: async (): Promise<{
      users: User[];
      posts: Post[];
      comments: Comment[];
    }> => {
      const [users, posts, comments] = await Promise.allSettled([
        RetryManager.executeWithRetry(() => delegate.get('/users')),
        RetryManager.executeWithRetry(() => delegate.get('/posts')),
        RetryManager.executeWithRetry(() => delegate.get('/comments'))
      ]);
      
      return {
        users: users.status === 'fulfilled' ? users.value : [],
        posts: posts.status === 'fulfilled' ? posts.value : [],
        comments: comments.status === 'fulfilled' ? comments.value : []
      };
    },
    
    // Advanced data transformation
    getUserSummary: async (id: number): Promise<UserSummary> => {
      const [user, posts] = await Promise.all([
        RetryManager.executeWithRetry(() => delegate.get(`/users/${id}`)),
        RetryManager.executeWithRetry(() => delegate.get(`/users/${id}/posts`))
      ]);
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        website: user.website,
        company: user.company.name,
        address: `${user.address.city}, ${user.address.zipcode}`,
        stats: {
          totalPosts: posts.length,
          avgPostLength: posts.reduce((sum: number, post: Post) => sum + post.body.length, 0) / posts.length,
          recentPosts: posts
            .sort((a: Post, b: Post) => b.id - a.id)
            .slice(0, 3)
            .map((post: Post) => ({
              id: post.id,
              title: post.title,
              preview: post.body.substring(0, 100) + '...'
            }))
        }
      };
    },
    
    // Cache management methods
    clearCache: (): void => cache.clear(),
    getCacheStats: () => cache.getStats(),
    getCacheSize: (): number => cache.size(),
    
    // Authentication methods
    authenticate: (tokens: AuthTokens): void => {
      authManager.setTokens(tokens);
      console.log('🔑 Authentication tokens updated');
    },
    
    refreshAuthToken: async (): Promise<string> => {
      return authManager.refreshToken();
    },
    
    logout: (): void => {
      authManager.clearTokens();
      cache.clear();
      console.log('👋 Logged out and cache cleared');
    },
    
    isAuthenticated: (): boolean => authManager.isAuthenticated()
  }))
);
```

## Usage Examples

### 1. Advanced Caching Demo

```typescript
async function advancedCachingDemo(): Promise<void> {
  console.log('=== Advanced Caching Demo ===');
  
  // First request - will be cached
  console.log('First request (will cache):');
  const user1 = await client.getUser(1);
  console.log(`User: ${user1.name}`);
  
  // Second request - from cache
  console.log('\nSecond request (from cache):');
  const user1Cached = await client.getUser(1);
  console.log(`User: ${user1Cached.name}`);
  
  // Cache statistics
  const stats = client.getCacheStats();
  console.log('\nCache Stats:', stats);
}
```

### 2. Authentication Flow Demo

```typescript
async function authenticationFlowDemo(): Promise<void> {
  console.log('=== Authentication Flow Demo ===');
  
  // Check initial auth status
  console.log('Initial auth status:', client.isAuthenticated());
  
  // Simulate token refresh
  console.log('\nRefreshing token...');
  try {
    const newToken = await client.refreshAuthToken();
    console.log('New token received:', newToken.substring(0, 20) + '...');
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
  
  // Test authenticated request
  console.log('\nMaking authenticated request...');
  const user = await client.getUser(1);
  console.log(`Authenticated user fetch: ${user.name}`);
}
```

### 3. Batch Operations Demo

```typescript
async function batchOperationsDemo(): Promise<void> {
  console.log('=== Batch Operations Demo ===');
  
  const userIds = [1, 2, 3, 999]; // 999 will likely fail
  
  console.log(`Fetching users: ${userIds.join(', ')}`);
  const results = await client.getBatchUsers(userIds);
  
  results.forEach((result, index) => {
    const userId = userIds[result.index];
    
    if (result.success) {
      console.log(`✅ User ${userId}: ${result.data.name}`);
    } else {
      console.log(`❌ User ${userId}: ${result.error.message}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\nBatch completed: ${successCount}/${results.length} successful`);
}
```

### 4. Parallel Data Fetching

```typescript
async function parallelDataDemo(): Promise<void> {
  console.log('=== Parallel Data Fetching Demo ===');
  
  const startTime = Date.now();
  
  const data = await client.getParallelData();
  
  const endTime = Date.now();
  
  console.log(`Data fetched in ${endTime - startTime}ms:`);
  console.log(`- Users: ${data.users.length}`);
  console.log(`- Posts: ${data.posts.length}`);
  console.log(`- Comments: ${data.comments.length}`);
}
```

### 5. Data Transformation Demo

```typescript
interface UserSummary {
  id: number;
  name: string;
  email: string;
  website: string;
  company: string;
  address: string;
  stats: {
    totalPosts: number;
    avgPostLength: number;
    recentPosts: Array<{
      id: number;
      title: string;
      preview: string;
    }>;
  };
}

async function dataTransformationDemo(): Promise<void> {
  console.log('=== Data Transformation Demo ===');
  
  const summary = await client.getUserSummary(1);
  
  console.log('User Summary:');
  console.log(`Name: ${summary.name}`);
  console.log(`Email: ${summary.email}`);
  console.log(`Company: ${summary.company}`);
  console.log(`Location: ${summary.address}`);
  console.log(`Posts: ${summary.stats.totalPosts}`);
  console.log(`Avg Post Length: ${Math.round(summary.stats.avgPostLength)} chars`);
  console.log('Recent Posts:');
  
  summary.stats.recentPosts.forEach(post => {
    console.log(`  - ${post.title}`);
    console.log(`    ${post.preview}`);
  });
}
```

### 6. Error Handling and Recovery

```typescript
async function errorHandlingDemo(): Promise<void> {
  console.log('=== Error Handling and Recovery Demo ===');
  
  try {
    // This will likely fail and trigger retry logic
    console.log('Attempting to fetch non-existent user...');
    await client.getUser(99999);
  } catch (error) {
    console.log(`Final error after retries: ${error.message}`);
  }
  
  // Demonstrate authentication error handling
  try {
    // Simulate expired token
    console.log('\nSimulating authentication error...');
    // Force token expiration
    client.authenticate({
      accessToken: 'expired-token',
      refreshToken: 'valid-refresh-token',
      expiresAt: Date.now() - 1000 // Expired
    });
    
    // This should trigger token refresh
    const user = await client.getUser(1);
    console.log(`User fetched after token refresh: ${user.name}`);
  } catch (error) {
    console.error(`Authentication handling failed: ${error.message}`);
  }
}
```

### 7. Complete Advanced Example

```typescript
async function runAdvancedExample(): Promise<void> {
  console.log('🚀 Universal Client - Advanced Features Example\n');
  
  try {
    // 1. Caching demonstration
    await advancedCachingDemo();
    console.log('\n');
    
    // 2. Authentication flow
    await authenticationFlowDemo();
    console.log('\n');
    
    // 3. Batch operations
    await batchOperationsDemo();
    console.log('\n');
    
    // 4. Parallel data fetching
    await parallelDataDemo();
    console.log('\n');
    
    // 5. Data transformation
    await dataTransformationDemo();
    console.log('\n');
    
    // 6. Error handling
    await errorHandlingDemo();
    console.log('\n');
    
    // 7. Final cleanup
    console.log('=== Cleanup ===');
    console.log('Cache stats before cleanup:', client.getCacheStats());
    client.logout();
    console.log('Cache stats after cleanup:', client.getCacheStats());
    
    console.log('\n✅ Advanced features example completed successfully!');
    
    // Display summary
    console.log('\n📋 Features Demonstrated:');
    console.log('  ✓ Advanced Caching with TTL and Statistics');
    console.log('  ✓ Authentication with Token Refresh');
    console.log('  ✓ Retry Logic with Exponential Backoff');
    console.log('  ✓ Batch Operations with Error Handling');
    console.log('  ✓ Parallel Data Fetching');
    console.log('  ✓ Data Transformation and Aggregation');
    console.log('  ✓ Request/Response Hooks');
    console.log('  ✓ Comprehensive Error Recovery');
    console.log('  ✓ Memory Management and Cleanup');
    
  } catch (error) {
    console.error('❌ Error in advanced example:', error);
  }
}

// Run the example
runAdvancedExample();
```

## Configuration Options

### Cache Configuration

```typescript
const customCache = new AdvancedCache(
  600000, // 10 minutes TTL
  500     // Max 500 items
);
```

### Retry Configuration

```typescript
const customRetryConfig: RetryConfig = {
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 30000,
  retryCondition: (error) => {
    // Only retry on network errors or 5xx status codes
    return !error.response || error.response.status >= 500;
  }
};
```

### Authentication Configuration

```typescript
const authConfig = {
  tokenRefreshThreshold: 300000, // Refresh 5 minutes before expiry
  automaticRefresh: true,
  clearCacheOnLogout: true
};
```

## Key Benefits

- **Production Ready**: Comprehensive error handling and recovery mechanisms
- **Performance Optimized**: Intelligent caching and batch operations
- **Security Focused**: Automatic token management and secure authentication flows
- **Type Safe**: Full TypeScript support with detailed interfaces
- **Extensible**: Modular design allows for custom implementations
- **Observable**: Detailed logging and monitoring capabilities 