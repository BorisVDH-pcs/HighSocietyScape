import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Allow importing the shared logic + data from the repo root (one level up from
// web/): lib/core.mjs, xp_table.json, data/*.json. Keeps a single source of
// truth instead of copying files into the frontend.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

export default defineConfig({
  plugins: [react()],
  server: {
    fs: { allow: [repoRoot] },
  },
});
