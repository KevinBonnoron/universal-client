import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    external: ['axios', 'eventsource', '@better-fetch/fetch'],
    treeshake: true,
    splitting: false,
    clean: true,
  },
]);
