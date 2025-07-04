import { universalClient, withDelegate, withMethods } from './src';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
}

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch', baseURL: 'https://jsonplaceholder.typicode.com' }),
  withMethods(({ delegate }) => ({
    getUsers: () => delegate.get('/users'),
    getUserById: (id: number) => delegate.get(`/users/${id}`),
    createUser: (user: User) => delegate.post('/users', user),
    updateUser: (id: number, user: User) => delegate.put(`/users/${id}`, user),
    deleteUser: (id: number) => delegate.delete(`/users/${id}`),
  })),
);

const user = await client.getUserById(1);
console.log(user);
await client.getUserById(1);
await client.getUserById(1);
await client.getUserById(1);
await client.getUserById(1);
await client.getUserById(1);
