export type CreateAxiosDelegateOptions = {
  type: 'http';
  impl: 'axios';
  baseURL: string;
  [key: string]: unknown;
};

export type CreateBetterFetchDelegateOptions = {
  type: 'http';
  impl: 'better-fetch';
  baseURL: string;
  [key: string]: unknown;
};

export interface CreateFetchDelegateOptions extends RequestInit {
  type: 'http';
  impl?: 'fetch';
  baseURL: string;
  format?: 'json' | 'text' | 'raw';
}
