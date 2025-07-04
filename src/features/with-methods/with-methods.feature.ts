import type { Feature } from '../../types';

/**
 * Add methods to the client.
 *
 * @param methodCreator - The method creator to be used in the feature.
 * @returns A feature that returns the methods.
 */
export function withMethods<Methods, Input>(methodCreator: (input: Input) => Methods): Feature<Methods, Input> {
  return (input: Input) => methodCreator(input);
}
