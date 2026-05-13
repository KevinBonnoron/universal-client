import type { HttpRequestOptions } from '../../../../types';
import { HttpError } from '../http-error/http-error.utils';
import type { CreateAxiosDelegateOptions } from '../types';

type AxiosErrorLike = {
  response?: {
    status: number;
    statusText: string;
    headers?: Record<string, string> | Headers;
    data?: unknown;
  };
  message?: string;
};

function toHttpError(error: unknown): never {
  if (error && typeof error === 'object' && 'response' in error) {
    const { response } = error as AxiosErrorLike;
    if (response) {
      const status = response.status;
      const statusText = response.statusText;
      const headers = response.headers instanceof Headers ? response.headers : new Headers((response.headers as Record<string, string> | undefined) ?? {});
      throw new HttpError(`HTTP ${status}: ${statusText}`, status, statusText, headers, response.data ?? null);
    }
  }
  throw error;
}

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
      return instance
        .get(url, { headers: requestOptions?.headers })
        .then(({ data }) => data)
        .catch(toHttpError) as Promise<T>;
    },
    post<T>(url: string, body: unknown, requestOptions?: HttpRequestOptions) {
      return instance
        .post(url, body, { headers: requestOptions?.headers })
        .then(({ data }) => data)
        .catch(toHttpError) as Promise<T>;
    },
    patch<T>(url: string, body: unknown, requestOptions?: HttpRequestOptions) {
      return instance
        .patch(url, body, { headers: requestOptions?.headers })
        .then(({ data }) => data)
        .catch(toHttpError) as Promise<T>;
    },
    put<T>(url: string, body: unknown, requestOptions?: HttpRequestOptions) {
      return instance
        .put(url, body, { headers: requestOptions?.headers })
        .then(({ data }) => data)
        .catch(toHttpError) as Promise<T>;
    },
    delete<T>(url: string, requestOptions?: HttpRequestOptions) {
      return instance
        .delete(url, { headers: requestOptions?.headers })
        .then(({ data }) => data)
        .catch(toHttpError) as Promise<T>;
    },
  };
}
