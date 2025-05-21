import type { Feature } from './types';

/**
 * Creates a universal client that combines multiple features.
 * 
 * @param features - The features to be used in the client.
 * @returns A universal client that combines multiple features.
 */
export function universalClient<A>(featureA: Feature<A>): A;
export function universalClient<A, B>(featureA: Feature<A>, featureB: Feature<B, A>): A & B;
export function universalClient<A, B, C>(featureA: Feature<A>, featureB: Feature<B, A>, featureC: Feature<C, B & A>): A & B & C;
export function universalClient<A, B, C, D>(
  featureA: Feature<A>,
  featureB: Feature<B, A>,
  featureC: Feature<C, B & A>,
  featureD: Feature<D, C & B & A>,
): A & B & C & D;
export function universalClient<A, B, C, D, E>(
  featureA: Feature<A>,
  featureB: Feature<B, A>,
  featureC: Feature<C, B & A>,
  featureD: Feature<D, C & B & A>,
  featureE: Feature<E, D & C & B & A>,
): A & B & C & D & E;
export function universalClient<A, B, C, D, E, F>(
  featureA: Feature<A>,
  featureB: Feature<B, A>,
  featureC: Feature<C, B & A>,
  featureD: Feature<D, C & B & A>,
  featureE: Feature<E, D & C & B & A>,
  featureF: Feature<F, E & D & C & B & A>,
): A & B & C & D & E & F;
export function universalClient(...withFeatures: Feature<unknown>[]) {
  const client = withFeatures.reduce((accumulator, feature) => Object.assign(accumulator, feature(accumulator)), {});
  if ('onInit' in client && typeof client.onInit === 'function') {
    const { onInit, ...rest } = client;
    onInit(rest);
    client.onInit = undefined;
  }

  return client;
}
