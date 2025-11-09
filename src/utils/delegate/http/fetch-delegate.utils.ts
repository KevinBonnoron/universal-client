import type { HttpDelegate, HttpRequestOptions } from '../../../types';
import type { CreateFetchDelegateOptions } from './types';

function parseResponse(format: CreateFetchDelegateOptions['format']) {
  return async (response: Response) => {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.clone().json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // keep the default error message
      }

      throw new Error(errorMessage);
    }

    if (format === 'json') {
      return response.json();
    }

    if (format === 'text') {
      return response.text();
    }

    return response;
  };
}

function getURLSearchParams(params?: HttpRequestOptions['params']) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null) {
      continue;
    }

    if (value instanceof Date) {
      query.append(key, value.toISOString());
    } else if (Array.isArray(value)) {
      for (const item of value) {
        query.append(`${key}[]`, item?.toString() ?? '');
      }
    } else {
      query.append(key, value.toString());
    }
  }

  return query.size ? `?${query}` : '';
}

/**
 * Creates a delegate to handle fetch requests.
 *
 * @param options - The options to be used in the delegate.
 * @returns A delegate to handle fetch requests.
 */
export function createFetchDelegate({ baseURL, format = 'json' }: Omit<CreateFetchDelegateOptions, 'type' | 'impl'>): HttpDelegate {
  function fetchRequest<T>(method: string, url: string, body?: unknown, { params = {}, headers = {} }: HttpRequestOptions = {}) {
    const options: RequestInit = {
      method,
      headers: {
        ...headers,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(`${baseURL}${url}${getURLSearchParams(params)}`, options).then(parseResponse(format)) as Promise<T>;
  }

  return {
    get<T>(url: string, { params = {}, headers = {} }: HttpRequestOptions = {}) {
      return fetchRequest<T>('GET', url, undefined, { params, headers });
    },
    post<T>(url: string, body: unknown, { params = {}, headers = {} }: HttpRequestOptions = {}) {
      return fetchRequest<T>('POST', url, body, { params, headers });
    },
    patch<T>(url: string, body: unknown, { params = {}, headers = {} }: HttpRequestOptions = {}) {
      return fetchRequest<T>('PATCH', url, body, { params, headers });
    },
    put<T>(url: string, body: unknown, { params = {}, headers = {} }: HttpRequestOptions = {}) {
      return fetchRequest<T>('PUT', url, body, { params, headers });
    },
    delete<T>(url: string, { params = {}, headers = {} }: HttpRequestOptions = {}) {
      return fetchRequest<T>('DELETE', url, undefined, { params, headers });
    },
  };
}
