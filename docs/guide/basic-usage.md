---
title: Basic Usage
outline: deep
---

# Basic Usage

Learn how to create a client with HTTP delegate, define typed methods, and make HTTP requests.

## Type Definitions

First, define the types for your API responses:

```typescript
interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: {
      lat: string;
      lng: string;
    };
  };
  phone: string;
  website: string;
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
}

interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
}

interface Comment {
  postId: number;
  id: number;
  name: string;
  email: string;
  body: string;
}

type CreatePost = Omit<Post, 'id'>;
```

## Client Setup

Create a Universal Client with HTTP delegate and typed methods:

```typescript
import { universalClient, withDelegate, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withMethods(({ delegate }) => ({
    // User operations
    getUser: (id: number) => delegate.get<User>(`https://jsonplaceholder.typicode.com/users/${id}`),
    getAllUsers: () => delegate.get<User[]>('https://jsonplaceholder.typicode.com/users'),

    // Post operations
    getPost: (id: number) => delegate.get<Post>(`https://jsonplaceholder.typicode.com/posts/${id}`),
    getAllPosts: () => delegate.get<Post[]>('https://jsonplaceholder.typicode.com/posts'),
    createPost: (data: CreatePost) => delegate.post<Post>('https://jsonplaceholder.typicode.com/posts', data),
    updatePost: (id: number, data: Post) => delegate.put<Post>(`https://jsonplaceholder.typicode.com/posts/${id}`, data),
    deletePost: (id: number) => delegate.delete<void>(`https://jsonplaceholder.typicode.com/posts/${id}`),

    // Comment operations
    getPostComments: (postId: number) => delegate.get<Comment[]>(`https://jsonplaceholder.typicode.com/posts/${postId}/comments`),
  })),
);
```

### Using Different HTTP Implementations

The Universal Client supports three HTTP implementations:

#### 1. Fetch (Default, Browser Native)

```typescript
const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get<User>(`/users/${id}`),
  })),
);
```

#### 2. Axios (Install separately: `npm install axios`)

```typescript
const client = universalClient(
  withDelegate({ type: 'http', impl: 'axios' }),
  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get<User>(`/users/${id}`),
  })),
);
```

#### 3. Better-Fetch (Install separately: `npm install @better-fetch/fetch`)

```typescript
const client = universalClient(
  withDelegate({ type: 'http', impl: 'better-fetch' }),
  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get<User>(`/users/${id}`),
  })),
);
```

## Usage Examples

### Fetching a Single User

```typescript
async function fetchUser(): Promise<void> {
  try {
    const user = await client.getUser(1);
    console.log('User:', {
      id: user.id,
      name: user.name,
      email: user.email,
      company: user.company.name
    });
  } catch (error) {
    console.error('Error fetching user:', error);
  }
}
```

### Fetching Multiple Users

```typescript
async function fetchAllUsers(): Promise<void> {
  try {
    const users = await client.getAllUsers();
    console.log(`Fetched ${users.length} users`);

    users.slice(0, 3).forEach(user => {
      console.log(`- ${user.name} (${user.email})`);
    });
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}
```

### Creating a New Post

```typescript
async function createNewPost(): Promise<void> {
  try {
    const postData: CreatePost = {
      title: 'My New Post',
      body: 'This is the content of my new post created with Universal Client!',
      userId: 1
    };

    const newPost = await client.createPost(postData);

    console.log('Created post:', {
      id: newPost.id,
      title: newPost.title
    });
  } catch (error) {
    console.error('Error creating post:', error);
  }
}
```

### Updating a Post

```typescript
async function updateExistingPost(postId: number): Promise<void> {
  try {
    const updatedData: Post = {
      id: postId,
      userId: 1,
      title: 'Updated Post Title',
      body: 'This is the updated content!'
    };

    const updatedPost = await client.updatePost(postId, updatedData);

    console.log('Updated post:', {
      id: updatedPost.id,
      title: updatedPost.title
    });
  } catch (error) {
    console.error('Error updating post:', error);
  }
}
```

### Fetching Comments

```typescript
async function fetchPostComments(): Promise<void> {
  try {
    const comments = await client.getPostComments(1);

    console.log(`Found ${comments.length} comments`);

    if (comments.length > 0) {
      const firstComment = comments[0];
      console.log('First comment:', {
        id: firstComment.id,
        name: firstComment.name,
        email: firstComment.email,
        body: firstComment.body.substring(0, 50) + '...'
      });
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
  }
}
```

## Using with Environment Management

For managing multiple environments (dev, staging, prod):

```typescript
import { universalClient, withDelegate, withEnvironments, withMethods } from 'universal-client';

const client = universalClient(
  withDelegate({ type: 'http', impl: 'fetch' }),
  withEnvironments({
    name: 'delegate',
    environments: {
      development: 'http://localhost:3000',
      staging: 'https://staging-api.example.com',
      production: 'https://api.example.com'
    },
    default: 'development'
  }),
  withMethods(({ delegate }) => ({
    getUser: (id: number) => delegate.get<User>(`/users/${id}`),
    getAllUsers: () => delegate.get<User[]>('/users'),
  })),
);

// Switch environment
client.environments.setEnvironment('production');

// Make request (will use production URL)
const user = await client.getUser(1);
```

## Error Handling

```typescript
async function fetchWithErrorHandling(): Promise<User | null> {
  try {
    return await client.getUser(1);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Network error:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
    return null;
  }
}
```
