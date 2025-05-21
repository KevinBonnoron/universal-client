import type { Delegate, Feature } from '../../types';

/**
 * Add a delegate to the client.
 * 
 * @param delegate - The delegate to be used in the feature.
 * @param name - The name of the delegate.
 * @returns A feature that returns the delegate.
 */
export function withDelegate<D extends Delegate, Name extends string>(delegate: D): Feature<{ delegate: D }>;
export function withDelegate<D extends Delegate, Name extends string>(delegate: D, name: Name): Feature<{ [key in Name]: D }>;
export function withDelegate<D extends Delegate, Name extends string>(delegate: D, name: Name = 'delegate' as Name): Feature<{ [key in Name]: D }> {
  return () => ({ [name]: delegate }) as { [key in Name]: D };
}
