import type { HttpDelegate } from '../../../types';

export interface CreateFetchDelegateOptions extends RequestInit {
  type: 'http';
  impl?: 'fetch';
  baseURL: string;
  format?: 'json' | 'text' | 'raw';
}

const parseResponse = (format: CreateFetchDelegateOptions['format']) => (response: Response) => {
  if (format === 'json') {
    return response.json();
  }

  if (format === 'text') {
    return response.text();
  }

  return response;
};

/**
 * Creates a delegate to handle fetch requests.
 *
 * @param options - The options to be used in the delegate.
 * @returns A delegate to handle fetch requests.
 */
export function createFetchDelegate({ baseURL, format = 'json' }: CreateFetchDelegateOptions): HttpDelegate {
  return {
    get<T>(url: string) {
      return fetch(`${baseURL}${url}`).then(parseResponse(format)) as Promise<T>;
    },
    post<T>(url: string, body: unknown) {
      return fetch(`${baseURL}${url}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(parseResponse(format)) as Promise<T>;
    },
    patch<T>(url: string, body: unknown) {
      return fetch(`${baseURL}${url}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(parseResponse(format)) as Promise<T>;
    },
    put<T>(url: string, body: unknown) {
      return fetch(`${baseURL}${url}`, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(parseResponse(format)) as Promise<T>;
    },
    delete<T>(url: string) {
      return fetch(`${baseURL}${url}`, {
        method: 'DELETE',
      }).then(parseResponse(format)) as Promise<T>;
    },
  };
}
