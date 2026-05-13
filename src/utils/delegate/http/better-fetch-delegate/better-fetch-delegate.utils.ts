import type { HttpRequestOptions } from '../../../../types';
import { HttpError } from '../http-error/http-error.utils';
import type { CreateBetterFetchDelegateOptions } from '../types';

type BetterFetchResult = {
  data: unknown;
  error?: {
    status?: number;
    statusText?: string;
    message?: string;
    [key: string]: unknown;
  } | null;
  response?: Response;
};

function unwrap<T>(result: BetterFetchResult): T {
  if (result.error) {
    const status = result.error.status ?? result.response?.status ?? 0;
    const statusText = result.error.statusText ?? result.response?.statusText ?? '';
    const headers = result.response?.headers ?? new Headers();
    const message = status > 0 ? `HTTP ${status}: ${statusText}` : (typeof result.error.message === 'string' && result.error.message) || 'HTTP request failed';
    throw new HttpError(message, status, statusText, headers, result.error);
  }
  return result.data as T;
}

export async function createBetterFetchDelegate(options: CreateBetterFetchDelegateOptions) {
  let betterFetchModule: { createFetch: (options: CreateBetterFetchDelegateOptions) => (url: string, options?: Record<string, unknown>) => Promise<BetterFetchResult> } | null;
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
      return instance(url, { headers: requestOptions?.headers }).then((result) => unwrap<T>(result));
    },
    post<T>(url: string, body: unknown, requestOptions?: HttpRequestOptions) {
      return instance(url, { method: 'POST', body, headers: requestOptions?.headers }).then((result) => unwrap<T>(result));
    },
    patch<T>(url: string, body: unknown, requestOptions?: HttpRequestOptions) {
      return instance(url, { method: 'PATCH', body, headers: requestOptions?.headers }).then((result) => unwrap<T>(result));
    },
    put<T>(url: string, body: unknown, requestOptions?: HttpRequestOptions) {
      return instance(url, { method: 'PUT', body, headers: requestOptions?.headers }).then((result) => unwrap<T>(result));
    },
    delete<T>(url: string, requestOptions?: HttpRequestOptions) {
      return instance(url, { method: 'DELETE', headers: requestOptions?.headers }).then((result) => unwrap<T>(result));
    },
  };
}
