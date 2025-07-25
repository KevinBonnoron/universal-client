# Basic Usage Example

This example demonstrates the fundamental usage of Universal Client with HTTP requests using TypeScript.

## Overview

Learn how to:
- Create a client with fetch delegate
- Define typed methods
- Make HTTP requests (GET, POST, PUT, DELETE)
- Handle errors properly
- Work with typed responses

## Type Definitions

First, let's define the types for our API responses:

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

type CreatePost = Exclude<Post, 'id'>;
```

## Client Setup

Create a Universal Client with fetch delegate and typed methods:

```typescript
import { universalClient, withDelegate, withMethods } from '@kevinbonnoron/universal-client';

const client = universalClient(
  withDelegate({  type: 'http',  baseURL: 'https://jsonplaceholder.typicode.com' }),
  withMethods(({ delegate }) => ({
    // User operations
    getUser: (id: number) => delegate.get<User>(`/users/${id}`),
    getAllUsers: () => delegate.get<Users[]>('/users'),
    
    // Post operations
    getPost: (id: number) => delegate.get<Post>(`/posts/${id}`),
    getAllPosts: () => delegate.get<Post[]>('/posts'),
    createPost: (data: CreatePost) => delegate.post<Post>('/posts', { 
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    }),
    updatePost: (id: number, data: Post) => delegate.put<Post>(`/posts/${id}`, { 
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    }),
    deletePost: (id: number) => delegate.delete<void>(`/posts/${id}`),
    
    // Comment operations
    getPostComments: async (postId: number) => delegate.get<Comment[]>(`/posts/${postId}/comments`),
  })),
);
```

## Usage Examples

### 1. Fetching a Single User

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

### 2. Fetching Multiple Users

```typescript
async function fetchAllUsers(): Promise<void> {
  try {
    const users = await client.getAllUsers();
    console.log(`Fetched ${users.length} users`);
    
    // Display first 3 users
    users.slice(0, 3).forEach(user => {
      console.log(`- ${user.name} (${user.email})`);
    });
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}
```

### 3. Creating a New Post

```typescript
async function createNewPost(): Promise<void> {
  try {
    const postData: CreatePostData = {
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

### 4. Updating a Post

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

### 5. Fetching Comments

```typescript
async function fetchPostComments(): Promise<void> {
  try {
    const comments = await client.getPostComments(1);
    
    console.log(`Found ${comments.length} comments`);
    
    // Display first comment
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

## Key Benefits

- **Type Safety**: Full TypeScript support with proper interfaces
- **Clean API**: Simple and intuitive method definitions
- **Error Handling**: Comprehensive error handling patterns
- **Flexibility**: Easy to extend with custom methods
- **Performance**: Efficient HTTP operations with proper typing
