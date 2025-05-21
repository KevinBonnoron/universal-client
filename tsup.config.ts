import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    external: ['axios', '@better-fetch/fetch', 'eventsource'],
    treeshake: true,
    splitting: false,
    clean: true,
    minify: true,
    sourcemap: true,
    banner: {
      js: `/**
 * ${pkg.name} v${pkg.version}
 * (c) ${new Date().getFullYear()} ${pkg.author}
 * @license ${pkg.license}
 */`,
    },
    esbuildOptions(options) {
      options.legalComments = 'none';
      options.metafile = true;
      options.platform = 'neutral';
    },
  },
]);
