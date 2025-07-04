import type { Feature } from './types';

// Type simple pour combiner deux types avec remplacement
type Merge<A, B> = Omit<A, keyof B> & B;

/**
 * Creates a universal client that combines multiple features.
 *
 * @param features - The features to be used in the client.
 * @returns A universal client that combines multiple features.
 */
export function universalClient<A>(featureA: Feature<A>): A;
export function universalClient<A, B>(featureA: Feature<A>, featureB: Feature<B, A>): Merge<A, B>;
export function universalClient<A, B, C>(featureA: Feature<A>, featureB: Feature<B, A>, featureC: Feature<C, Merge<A, B>>): Merge<Merge<A, B>, C>;
export function universalClient<A, B, C, D>(featureA: Feature<A>, featureB: Feature<B, A>, featureC: Feature<C, Merge<A, B>>, featureD: Feature<D, Merge<Merge<A, B>, C>>): Merge<Merge<Merge<A, B>, C>, D>;
export function universalClient<A, B, C, D, E>(
  featureA: Feature<A>,
  featureB: Feature<B, A>,
  featureC: Feature<C, Merge<A, B>>,
  featureD: Feature<D, Merge<Merge<A, B>, C>>,
  featureE: Feature<E, Merge<Merge<Merge<A, B>, C>, D>>,
): Merge<Merge<Merge<Merge<A, B>, C>, D>, E>;
export function universalClient<A, B, C, D, E, F>(
  featureA: Feature<A>,
  featureB: Feature<B, A>,
  featureC: Feature<C, Merge<A, B>>,
  featureD: Feature<D, Merge<Merge<A, B>, C>>,
  featureE: Feature<E, Merge<Merge<Merge<A, B>, C>, D>>,
  featureF: Feature<F, Merge<Merge<Merge<Merge<A, B>, C>, D>, E>>,
): Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>;
export function universalClient<A, B, C, D, E, F, G>(
  featureA: Feature<A>,
  featureB: Feature<B, A>,
  featureC: Feature<C, Merge<A, B>>,
  featureD: Feature<D, Merge<Merge<A, B>, C>>,
  featureE: Feature<E, Merge<Merge<Merge<A, B>, C>, D>>,
  featureF: Feature<F, Merge<Merge<Merge<Merge<A, B>, C>, D>, E>>,
  featureG: Feature<G, Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>>,
): Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>;
export function universalClient<A, B, C, D, E, F, G, H>(
  featureA: Feature<A>,
  featureB: Feature<B, A>,
  featureC: Feature<C, Merge<A, B>>,
  featureD: Feature<D, Merge<Merge<A, B>, C>>,
  featureE: Feature<E, Merge<Merge<Merge<A, B>, C>, D>>,
  featureF: Feature<F, Merge<Merge<Merge<Merge<A, B>, C>, D>, E>>,
  featureG: Feature<G, Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>>,
  featureH: Feature<H, Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>>,
): Merge<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>;
export function universalClient<A, B, C, D, E, F, G, H, I>(
  featureA: Feature<A>,
  featureB: Feature<B, A>,
  featureC: Feature<C, Merge<A, B>>,
  featureD: Feature<D, Merge<Merge<A, B>, C>>,
  featureE: Feature<E, Merge<Merge<Merge<A, B>, C>, D>>,
  featureF: Feature<F, Merge<Merge<Merge<Merge<A, B>, C>, D>, E>>,
  featureG: Feature<G, Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>>,
  featureH: Feature<H, Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>>,
  featureI: Feature<I, Merge<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>>,
): Merge<Merge<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>, I>;
export function universalClient<A, B, C, D, E, F, G, H, I, J>(
  featureA: Feature<A>,
  featureB: Feature<B, A>,
  featureC: Feature<C, Merge<A, B>>,
  featureD: Feature<D, Merge<Merge<A, B>, C>>,
  featureE: Feature<E, Merge<Merge<Merge<A, B>, C>, D>>,
  featureF: Feature<F, Merge<Merge<Merge<Merge<A, B>, C>, D>, E>>,
  featureG: Feature<G, Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>>,
  featureH: Feature<H, Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>>,
  featureI: Feature<I, Merge<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>>,
  featureJ: Feature<J, Merge<Merge<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>, I>>,
): Merge<Merge<Merge<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>, I>, J>;
export function universalClient(...withFeatures: Feature<unknown, unknown>[]): unknown;
export function universalClient(...withFeatures: Feature<unknown, unknown>[]) {
  const client = withFeatures.reduce((accumulator, feature) => Object.assign(accumulator, feature(accumulator)), {});
  if ('onInit' in client && typeof client.onInit === 'function') {
    const { onInit, ...rest } = client;
    onInit(rest);
    client.onInit = undefined;
  }

  return client;
}
