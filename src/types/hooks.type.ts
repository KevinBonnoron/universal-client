export interface Hooks {
  onInit?: (...args: unknown[]) => void;
  onRequest?: (...args: unknown[]) => void;
  onResponse?: (...args: unknown[]) => void;
  onError?: (...args: unknown[]) => void;
}

export interface HooksInternal {
  __hooks: {
    [K in keyof Hooks]: Hooks[K][];
  };
}
