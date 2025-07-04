import type { AxiosInstance, CreateAxiosDefaults } from 'axios';
import axios from 'axios';
import type { RestDelegate } from '../types';

type AxiosExtension = (axiosInstance: AxiosInstance) => AxiosInstance;

interface WithAxiosOptions extends CreateAxiosDefaults {
  /**
   * The extensions to be used in the axios instance.
   */
  extensions?: AxiosExtension[];
}

/**
 * Creates a delegate to handle axios requests.
 * 
 * @param options - The options to be used in the delegate.
 * @returns A delegate to handle axios requests.
 */
export function createAxiosDelegate({ baseURL, extensions = [] }: WithAxiosOptions): RestDelegate {
  const instance = extensions.reduce((axiosInstance, extension) => extension(axiosInstance), axios.create({ baseURL }));

  return {
    get<T>(url: string) {
      return instance.get(url).then((response) => response.data) as Promise<T>;
    },
    post<T, B>(url: string, body: B) {
      return instance.post(url, body).then((response) => response.data) as Promise<T>;
    },
    patch<T, B>(url: string, body: B) {
      return instance.patch(url, body).then((response) => response.data) as Promise<T>;
    },
    put<T, B>(url: string, body: B) {
      return instance.put(url, body).then((response) => response.data) as Promise<T>;
    },
    delete<T>(url: string) {
      return instance.delete(url).then((response) => response.data) as Promise<T>;
    },
  };
}
