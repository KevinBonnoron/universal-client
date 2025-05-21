import type { HttpDelegate, HttpRequestOptions } from '../../../types';
import type { CreateFetchDelegateOptions } from './types';

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
    get<T>(url: string, { params = {}, headers = {} }: HttpRequestOptions = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        query.append(key, value);
      }

      return fetch(`${baseURL}${url}${query.size ? `?${query}` : ''}`, {
        headers: {
          ...headers,
        },
      }).then(parseResponse(format)) as Promise<T>;
    },
    post<T>(url: string, body: unknown, { params = {}, headers = {} }: HttpRequestOptions = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        query.append(key, value);
      }

      return fetch(`${baseURL}${url}${query.size ? `?${query}` : ''}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          ...headers,
        },
      }).then(parseResponse(format)) as Promise<T>;
    },
    patch<T>(url: string, body: unknown, { params = {}, headers = {} }: HttpRequestOptions = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        query.append(key, value);
      }

      return fetch(`${baseURL}${url}${query.size ? `?${query}` : ''}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: {
          ...headers,
        },
      }).then(parseResponse(format)) as Promise<T>;
    },
    put<T>(url: string, body: unknown, { params = {}, headers = {} }: HttpRequestOptions = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        query.append(key, value);
      }

      return fetch(`${baseURL}${url}${params}`, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: {
          ...headers,
        },
      }).then(parseResponse(format)) as Promise<T>;
    },
    delete<T>(url: string, { params = {}, headers = {} }: HttpRequestOptions = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        query.append(key, value);
      }

      return fetch(`${baseURL}${url}${query.size ? `?${query}` : ''}`, {
        method: 'DELETE',
        headers: {
          ...headers,
        },
      }).then(parseResponse(format)) as Promise<T>;
    },
  };
}
