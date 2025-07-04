export type CreateAxiosDelegateOptions = {
  type: 'http';
  impl: 'axios';
  baseURL?: string;
  format?: 'json' | 'text' | 'raw';
  extensions?: unknown[];
  [key: string]: unknown;
};

export async function createAxiosDelegate(options: CreateAxiosDelegateOptions) {
  // @ts-ignore - axios is not a peer dependency
  const axiosModule = await import('axios').catch(() => null);
  if (!axiosModule) {
    throw new Error('Axios is not installed. Please install axios to use the axios delegate.');
  }

  const axios = axiosModule.default;
  const { baseURL, ...restOptions } = options;
  const instance = axios.create({ baseURL, ...restOptions });

  return {
    get<T>(url: string) {
      return instance.get(url).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    post<T>(url: string, body: unknown) {
      return instance.post(url, body).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    patch<T>(url: string, body: unknown) {
      return instance.patch(url, body).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    put<T>(url: string, body: unknown) {
      return instance.put(url, body).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    delete<T>(url: string) {
      return instance.delete(url).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
  };
}
