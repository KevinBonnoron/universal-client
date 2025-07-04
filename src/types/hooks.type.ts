export interface Hooks {
  onInit?: () => void;
  onRequest?: (url: string) => void;
  onResponse?: () => void;
  onError?: () => void;
}

export interface HooksInternal {
  __hooks: {
    [K in keyof Hooks]: (Hooks[K])[];
  };
}