import type { HttpDelegate, HttpRequestOptions } from '../../../types';
import type { CreateFetchDelegateOptions } from './types';

function detectFormat(response: Response): HttpRequestOptions['format'] {
  const contentType = response.headers.get('Content-Type') ?? '';

  if (contentType.includes('application/json')) {
    return 'json';
  }

  if (contentType.startsWith('text/') || contentType.includes('application/xml') || contentType.includes('application/javascript')) {
    return 'text';
  }

  if (contentType.startsWith('image/') || contentType.startsWith('audio/') || contentType.startsWith('video/') || contentType.startsWith('application/')) {
    return 'blob';
  }

  return 'raw';
}

function parseResponse(format: HttpRequestOptions['format']) {
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

    const resolved = format ?? detectFormat(response);
    if (resolved === 'json') {
      return response.json();
    }

    if (resolved === 'text') {
      return response.text();
    }

    if (resolved === 'blob') {
      return response.blob();
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
export function createFetchDelegate({ baseURL }: Omit<CreateFetchDelegateOptions, 'type' | 'impl'>): HttpDelegate {
  function fetchRequest<T>(method: string, url: string, body?: unknown, { params = {}, headers = {}, format, signal }: HttpRequestOptions = {}) {
    const options: RequestInit = {
      method,
      headers: {
        ...headers,
      },
    };

    if (signal) {
      options.signal = signal;
    }

    if (body !== undefined && body !== null) {
      if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer || body instanceof URLSearchParams || body instanceof ReadableStream || typeof body === 'string') {
        options.body = body;
      } else {
        options.body = JSON.stringify(body);
        (options.headers as Record<string, string>)['Content-Type'] ??= 'application/json';
      }
    }

    return fetch(`${baseURL}${url}${getURLSearchParams(params)}`, options).then(parseResponse(format)) as Promise<T>;
  }

  return {
    get<T>(url: string, options?: HttpRequestOptions) {
      return fetchRequest<T>('GET', url, undefined, options);
    },
    post<T>(url: string, body: unknown, options?: HttpRequestOptions) {
      return fetchRequest<T>('POST', url, body, options);
    },
    patch<T>(url: string, body: unknown, options?: HttpRequestOptions) {
      return fetchRequest<T>('PATCH', url, body, options);
    },
    put<T>(url: string, body: unknown, options?: HttpRequestOptions) {
      return fetchRequest<T>('PUT', url, body, options);
    },
    delete<T>(url: string, options?: HttpRequestOptions) {
      return fetchRequest<T>('DELETE', url, undefined, options);
    },
  };
}
