import type { Hooks, HooksInternal } from '../types';

export function trigger<Input>(hookInternal: HooksInternal, hook: keyof Hooks<Input>, input: Input) {
  const hooks = hookInternal.__hooks;
  const hookList = hooks[hook];
  if (hookList) {
    for (const hook of hookList) {
      if (typeof hook === 'function') {
        hook(input);
      }
    }
  }
}
