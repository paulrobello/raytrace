import { defineConfig } from 'vite';

// No framework, no special plugins. index.html at the repo root is the entry;
// /src/main.js is the UI script. The render worker is spawned with
//   new Worker(new URL('./partrace-worker.js', import.meta.url), { type: 'module' })
// which Vite detects and bundles automatically.
export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist'
  }
});
