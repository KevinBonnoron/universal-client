import { universalClient, withDelegate, withInterceptor, withMethods } from './src';

const withHttpDelegate = (baseURL: string) =>
  withDelegate(
    { type: 'http', impl: 'fetch', baseURL },
    withInterceptor({
      before: (context) => {
        return {
          ...context,
          headers: {
            ContentType: 'text/plain',
          },
        };
      },
    }),
  );

const client = await universalClient(
  withHttpDelegate('https://jsonplaceholder.typicode.com'),
  withMethods(({ delegate }) => ({
    getUsers: () => delegate.get('/users'),
  })),
);

const users = await client.getUsers();
console.log(users);
