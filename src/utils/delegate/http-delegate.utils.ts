import type { HttpDelegate } from '../../types';
import { createFetchDelegate } from './http/fetch-delegate/fetch-delegate.utils';
import type { CreateAxiosDelegateOptions, CreateBetterFetchDelegateOptions, CreateFetchDelegateOptions } from './http/types';

export type HttpDelegateOptions = CreateFetchDelegateOptions | CreateBetterFetchDelegateOptions | CreateAxiosDelegateOptions;

export async function createHttpDelegate(options: HttpDelegateOptions): Promise<HttpDelegate> {
  if (options.impl === 'axios') {
    const { createAxiosDelegate } = await import('./http/axios-delegate/axios-delegate.utils');
    return createAxiosDelegate(options);
  }

  if (options.impl === 'better-fetch') {
    const { createBetterFetchDelegate } = await import('./http/better-fetch-delegate/better-fetch-delegate.utils');
    return createBetterFetchDelegate(options);
  }

  return createFetchDelegate(options);
}
