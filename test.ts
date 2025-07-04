import { universalClient, withDelegate, withMethods, withOffline, withTelemetry } from './src';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
}

const client = universalClient(
  withDelegate(
    { name: 'fetch', type: 'http', impl: 'fetch', baseURL: 'https://jsonplaceholder.typicode.com' },
    withOffline(),
    withTelemetry(),
  ),
  withMethods(({ fetch }) => ({
    getUsers: () => fetch.get('/users'),
    getUserById: (id: number) => fetch.get(`/users/${id}`),
    createUser: (user: User) => fetch.post('/users', user),
    updateUser: (id: number, user: User) => fetch.put(`/users/${id}`, user),
    deleteUser: (id: number) => fetch.delete(`/users/${id}`),
  })),
);

const user = await client.getUserById(1);
console.log(user);
await client.getUserById(1);
await client.getUserById(1);
await client.getUserById(1);
await client.getUserById(1);
await client.getUserById(1);


const t = withDelegate({ name: 'test', type: 'websocket', baseURL: 'https://jsonplaceholder.typicode.com' });