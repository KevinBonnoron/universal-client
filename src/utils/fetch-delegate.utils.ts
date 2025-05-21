import type { RestDelegate } from '../types';

interface CreateFetchDelegateOptions {
  baseURL?: string;
}

/**
 * Creates a delegate to handle fetch requests.
 * 
 * @param options - The options to be used in the delegate.
 * @returns A delegate to handle fetch requests.
 */
export function createFetchDelegate({ baseURL }: CreateFetchDelegateOptions): RestDelegate {
  return {
    get<T>(url: string) {
      return fetch(`${baseURL}${url}`).then((response) => response.json()) as Promise<T>;
    },
    post<T>(url: string, body: unknown) {
      return fetch(`${baseURL}${url}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((response) => response.json()) as Promise<T>;
    },
    patch<T>(url: string, body: unknown) {
      return fetch(`${baseURL}${url}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((response) => response.json()) as Promise<T>;
    },
    put<T>(url: string, body: unknown) {
      return fetch(`${baseURL}${url}`, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((response) => response.json()) as Promise<T>;
    },
    delete<T>(url: string) {
      return fetch(`${baseURL}${url}`, {
        method: 'DELETE',
      }).then((response) => response.json()) as Promise<T>;
    },
  };
}
