import { createFetchDelegate, universalClient, withDelegate, withMethods } from './src';

const client = universalClient(
  withDelegate(createFetchDelegate({ baseURL: 'https://jsonplaceholder.typicode.com' })),
  withMethods(({ delegate }) => ({
    getUser: (id: string) => delegate.get(`/users/${id}`),
  })),
);
