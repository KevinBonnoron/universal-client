import type { Feature } from '../../../types';

interface Hooks<Input> {
  onInit?: (input: Input) => void;
}

/**
 * Add hooks to the client.
 *
 * @param hooks - The hooks to be used in the feature.
 * @returns A feature that returns the hooks.
 */
export function withHooks<H extends Hooks<Input>, Input>(hooks: H): Feature<Input, Input> {
  return () => ({ ...hooks }) as unknown as Input;
}
