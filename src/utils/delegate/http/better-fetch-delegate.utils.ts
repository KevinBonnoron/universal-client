import { type CreateFetchOption, createFetch } from '@better-fetch/fetch';
import type { HttpDelegate } from '../../../types';

export interface CreateBetterFetchDelegateOptions extends CreateFetchOption {
  baseURL: string;
}

/**
 * Creates a delegate to handle better-fetch requests.
 *
 * @param options - The options to be used in the delegate.
 * @returns A delegate to handle better-fetch requests.
 */
export function createBetterFetchDelegate({ baseURL, ...options }: CreateBetterFetchDelegateOptions): HttpDelegate {
  const instance = createFetch({ baseURL, ...options });

  return {
    get<T>(url: string) {
      return instance(url).then((response) => response.data) as Promise<T>;
    },
    post<T>(url: string, body: unknown) {
      return instance(url, { method: 'POST', body }).then((response) => response.data) as Promise<T>;
    },
    patch<T>(url: string, body: unknown) {
      return instance(url, { method: 'PATCH', body }).then((response) => response.data) as Promise<T>;
    },
    put<T>(url: string, body: unknown) {
      return instance(url, { method: 'PUT', body }).then((response) => response.data) as Promise<T>;
    },
    delete<T>(url: string) {
      return instance(url, { method: 'DELETE' }).then((response) => response.data) as Promise<T>;
    },
  };
}
