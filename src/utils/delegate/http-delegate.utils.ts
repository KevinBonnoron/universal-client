import type { CreateAxiosDelegateOptions, CreateBetterFetchDelegateOptions, CreateFetchDelegateOptions } from './http';
import { createAxiosDelegate, createBetterFetchDelegate, createFetchDelegate } from './http';

export type HttpDelegateOptions = CreateFetchDelegateOptions | CreateBetterFetchDelegateOptions | CreateAxiosDelegateOptions;

export const createHttpDelegate = async (options: HttpDelegateOptions) => {
  if (options.impl === 'axios') {
    return createAxiosDelegate(options);
  }

  if (options.impl === 'better-fetch') {
    return createBetterFetchDelegate(options);
  }

  return createFetchDelegate(options);
};
