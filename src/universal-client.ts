import type { Feature } from './types';

type Merge<A, B> = Omit<A, keyof B> & B;

/**
 * Creates a universal client that combines multiple features.
 *
 * @param features - The features to be used in the client.
 * @returns A universal client that combines multiple features.
 */
export function universalClient<A>(featureA: Feature<unknown, A>): A;
export function universalClient<A, B>(featureA: Feature<unknown, A>, featureB: Feature<A, B>): Merge<A, B>;
export function universalClient<A, B, C>(featureA: Feature<unknown, A>, featureB: Feature<A, B>, featureC: Feature<Merge<A, B>, C>): Merge<Merge<A, B>, C>;
export function universalClient<A, B, C, D>(featureA: Feature<unknown, A>, featureB: Feature<A, B>, featureC: Feature<Merge<A, B>, C>, featureD: Feature<Merge<Merge<A, B>, C>, D>): Merge<Merge<Merge<A, B>, C>, D>;
export function universalClient<A, B, C, D, E>(
  featureA: Feature<unknown, A>,
  featureB: Feature<A, B>,
  featureC: Feature<Merge<A, B>, C>,
  featureD: Feature<Merge<Merge<A, B>, C>, D>,
  featureE: Feature<Merge<Merge<Merge<A, B>, C>, D>, E>,
): Merge<Merge<Merge<Merge<A, B>, C>, D>, E>;
export function universalClient<A, B, C, D, E, F>(
  featureA: Feature<unknown, A>,
  featureB: Feature<A, B>,
  featureC: Feature<Merge<A, B>, C>,
  featureD: Feature<Merge<Merge<A, B>, C>, D>,
  featureE: Feature<Merge<Merge<Merge<A, B>, C>, D>, E>,
  featureF: Feature<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>,
): Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>;
export function universalClient<A, B, C, D, E, F, G>(
  featureA: Feature<unknown, A>,
  featureB: Feature<A, B>,
  featureC: Feature<Merge<A, B>, C>,
  featureD: Feature<Merge<Merge<A, B>, C>, D>,
  featureE: Feature<Merge<Merge<Merge<A, B>, C>, D>, E>,
  featureF: Feature<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>,
  featureG: Feature<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>,
): Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>;
export function universalClient<A, B, C, D, E, F, G, H>(
  featureA: Feature<unknown, A>,
  featureB: Feature<A, B>,
  featureC: Feature<Merge<A, B>, C>,
  featureD: Feature<Merge<Merge<A, B>, C>, D>,
  featureE: Feature<Merge<Merge<Merge<A, B>, C>, D>, E>,
  featureF: Feature<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>,
  featureG: Feature<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>,
  featureH: Feature<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>,
): Merge<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>;
export function universalClient<A, B, C, D, E, F, G, H, I>(
  featureA: Feature<unknown, A>,
  featureB: Feature<A, B>,
  featureC: Feature<Merge<A, B>, C>,
  featureD: Feature<Merge<Merge<A, B>, C>, D>,
  featureE: Feature<Merge<Merge<Merge<A, B>, C>, D>, E>,
  featureF: Feature<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>,
  featureG: Feature<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>,
  featureH: Feature<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>,
  featureI: Feature<Merge<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>, I>,
): Merge<Merge<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>, I>;
export function universalClient<A, B, C, D, E, F, G, H, I, J>(
  featureA: Feature<unknown, A>,
  featureB: Feature<A, B>,
  featureC: Feature<Merge<A, B>, C>,
  featureD: Feature<Merge<Merge<A, B>, C>, D>,
  featureE: Feature<Merge<Merge<Merge<A, B>, C>, D>, E>,
  featureF: Feature<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>,
  featureG: Feature<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>,
  featureH: Feature<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>,
  featureI: Feature<Merge<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>, I>,
  featureJ: Feature<Merge<Merge<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>, I>, J>,
): Merge<Merge<Merge<Merge<Merge<Merge<Merge<Merge<Merge<A, B>, C>, D>, E>, F>, G>, H>, I>, J>;
export function universalClient(...withFeatures: Feature<unknown, unknown>[]): unknown;
export function universalClient(...withFeatures: Feature<unknown, unknown>[]) {
  // biome-ignore lint/performance/noAccumulatingSpread: needed for typescript
  const client = withFeatures.reduce((accumulator, feature) => Object.assign(accumulator, feature(accumulator)), {});

  // Extract onInit hook if present
  const { onInit, ...rest } = client as Record<string, unknown>;

  // Call onInit hook if it exists
  if (typeof onInit === 'function') {
    onInit(rest);
  }

  return rest;
}
