import type { HttpRequestOptions } from '../../../types';
import type { CreateAxiosDelegateOptions } from './types';

export async function createAxiosDelegate(options: CreateAxiosDelegateOptions) {
  let axiosModule: {
    default: {
      create: (config: Record<string, unknown>) => unknown;
      get: (url: string, config?: Record<string, unknown>) => Promise<{ data: unknown }>;
      post: (url: string, data: unknown, config?: Record<string, unknown>) => Promise<{ data: unknown }>;
      patch: (url: string, data: unknown, config?: Record<string, unknown>) => Promise<{ data: unknown }>;
      put: (url: string, data: unknown, config?: Record<string, unknown>) => Promise<{ data: unknown }>;
      delete: (url: string, config?: Record<string, unknown>) => Promise<{ data: unknown }>;
    };
  } | null;
  try {
    axiosModule = await new Function('moduleName', 'return import(moduleName)')('axios');
  } catch {
    axiosModule = null;
  }

  if (!axiosModule) {
    throw new Error('Axios is not installed. Please install axios to use the axios delegate.');
  }

  const axios = axiosModule.default;
  const { baseURL, ...restOptions } = options;
  const instance = axios.create({ baseURL, ...restOptions }) as {
    get: (url: string, config?: Record<string, unknown>) => Promise<{ data: unknown }>;
    post: (url: string, data: unknown, config?: Record<string, unknown>) => Promise<{ data: unknown }>;
    patch: (url: string, data: unknown, config?: Record<string, unknown>) => Promise<{ data: unknown }>;
    put: (url: string, data: unknown, config?: Record<string, unknown>) => Promise<{ data: unknown }>;
    delete: (url: string, config?: Record<string, unknown>) => Promise<{ data: unknown }>;
  };

  return {
    get<T>(url: string, requestOptions?: HttpRequestOptions) {
      return instance.get(url, { headers: requestOptions?.headers }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    post<T>(url: string, body: unknown, requestOptions?: HttpRequestOptions) {
      return instance.post(url, body, { headers: requestOptions?.headers }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    patch<T>(url: string, body: unknown, requestOptions?: HttpRequestOptions) {
      return instance.patch(url, body, { headers: requestOptions?.headers }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    put<T>(url: string, body: unknown, requestOptions?: HttpRequestOptions) {
      return instance.put(url, body, { headers: requestOptions?.headers }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    delete<T>(url: string, requestOptions?: HttpRequestOptions) {
      return instance.delete(url, { headers: requestOptions?.headers }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
  };
}
