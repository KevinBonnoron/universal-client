import type { AxiosInstance, AxiosResponse, CreateAxiosDefaults } from 'axios';
import axios from 'axios';
import type { HttpDelegate } from '../../../types';

export interface CreateAxiosDelegateOptions extends CreateAxiosDefaults {
  format?: 'json' | 'text' | 'raw';
  extensions?: ((axiosInstance: AxiosInstance) => AxiosInstance)[];
}

const parseResponse = (format: CreateAxiosDelegateOptions['format']) => (response: AxiosResponse) => {
  if (format === 'json') {
    return response.data;
  }

  if (format === 'text') {
    return response.data;
  }

  return response.data;
};

/**
 * Creates a delegate to handle axios requests.
 *
 * @param options - The options to be used in the delegate.
 * @returns A delegate to handle axios requests.
 */
export function createAxiosDelegate({ baseURL, extensions = [], format = 'json', ...options }: CreateAxiosDelegateOptions): HttpDelegate {
  const instance = extensions.reduce((axiosInstance, extension) => extension(axiosInstance), axios.create({ baseURL, ...options }));

  return {
    get<T>(url: string) {
      return instance.get(url).then(parseResponse(format)) as Promise<T>;
    },
    post<T, B>(url: string, body: B) {
      return instance.post(url, body).then(parseResponse(format)) as Promise<T>;
    },
    patch<T, B>(url: string, body: B) {
      return instance.patch(url, body).then(parseResponse(format)) as Promise<T>;
    },
    put<T, B>(url: string, body: B) {
      return instance.put(url, body).then(parseResponse(format)) as Promise<T>;
    },
    delete<T>(url: string) {
      return instance.delete(url).then(parseResponse(format)) as Promise<T>;
    },
  };
}
