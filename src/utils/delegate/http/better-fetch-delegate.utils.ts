export type CreateBetterFetchDelegateOptions = {
  type: 'http';
  impl: 'better-fetch';
  baseURL: string;
  [key: string]: unknown;
};

export async function createBetterFetchDelegate(options: CreateBetterFetchDelegateOptions) {
  // @ts-ignore - better-fetch is not a peer dependency
  const betterFetchModule = await import('@better-fetch/fetch').catch(() => null);
  if (!betterFetchModule) {
    throw new Error('@better-fetch/fetch is not installed. Please install @better-fetch/fetch to use the better-fetch delegate.');
  }

  const { createFetch } = betterFetchModule;
  const { baseURL, ...restOptions } = options;
  const instance = createFetch({ baseURL, ...restOptions });

  return {
    get<T>(url: string) {
      return instance(url).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    post<T>(url: string, body: unknown) {
      return instance(url, { method: 'POST', body }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    patch<T>(url: string, body: unknown) {
      return instance(url, { method: 'PATCH', body }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    put<T>(url: string, body: unknown) {
      return instance(url, { method: 'PUT', body }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
    delete<T>(url: string) {
      return instance(url, { method: 'DELETE' }).then((response: { data: unknown }) => response.data) as Promise<T>;
    },
  };
}
