import type { HttpRequestOptions } from '../../../types';
import type { CreateBetterFetchDelegateOptions } from './types';

export async function createBetterFetchDelegate(options: CreateBetterFetchDelegateOptions) {
  let betterFetchModule: { createFetch: (options: CreateBetterFetchDelegateOptions) => (url: string, options?: Record<string, unknown>) => Promise<{ data: unknown }> } | null;
  try {
    betterFetchModule = await new Function('moduleName', 'return import(moduleName)')('@better-fetch/fetch');
  } catch {
    betterFetchModule = null;
  }

  if (!betterFetchModule) {
    throw new Error('@better-fetch/fetch is not installed. Please install @better-fetch/fetch to use the better-fetch delegate.');
  }

  const { createFetch } = betterFetchModule;
  const { baseURL, ...restOptions } = options;
  const instance = createFetch({ baseURL, ...restOptions });

  return {
    get<T>(url: string, requestOptions?: HttpRequestOptions) {
      return instance(url, { headers: requestOptions?.headers }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    post<T>(url: string, body: unknown, requestOptions?: HttpRequestOptions) {
      return instance(url, { method: 'POST', body, headers: requestOptions?.headers }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    patch<T>(url: string, body: unknown, requestOptions?: HttpRequestOptions) {
      return instance(url, { method: 'PATCH', body, headers: requestOptions?.headers }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    put<T>(url: string, body: unknown, requestOptions?: HttpRequestOptions) {
      return instance(url, { method: 'PUT', body, headers: requestOptions?.headers }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    delete<T>(url: string, requestOptions?: HttpRequestOptions) {
      return instance(url, { method: 'DELETE', headers: requestOptions?.headers }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
  };
}
