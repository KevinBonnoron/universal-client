import { createFetchDelegate } from './fetch-delegate.utils';

import { type CreateAxiosDelegateOptions, createAxiosDelegate } from './axios-delegate.utils';
import { type CreateBetterFetchDelegateOptions, createBetterFetchDelegate } from './better-fetch-delegate.utils';
import type { CreateFetchDelegateOptions } from './fetch-delegate.utils';

type FetchDelegateOptions = {
  type: 'http';
  impl: 'fetch';
} & CreateFetchDelegateOptions;

type BetterFetchDelegateOptions = {
  type: 'http';
  impl: 'better-fetch';
} & CreateBetterFetchDelegateOptions;

type AxiosDelegateOptions = {
  type: 'http';
  impl: 'axios';
} & CreateAxiosDelegateOptions;

export type HttpDelegateOptions = FetchDelegateOptions | BetterFetchDelegateOptions | AxiosDelegateOptions;

export const createHttpDelegate = (options: HttpDelegateOptions) => {
  if (options.impl === 'axios') {
    return createAxiosDelegate(options);
  }

  if (options.impl === 'better-fetch') {
    return createBetterFetchDelegate(options);
  }

  if (options.impl === 'fetch') {
    return createFetchDelegate(options);
  }

  throw new Error('Unsupported delegate implementation');
};
