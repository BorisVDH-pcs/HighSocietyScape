import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Allow importing the shared logic + data from the repo root (one level up from
// web/): lib/core.mjs, xp_table.json, data/*.json. Keeps a single source of
// truth instead of copying files into the frontend.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

// GitHub Pages serves this project site from a SUBPATH
// (borisvdh-pcs.github.io/HighSocietyScape/), so built asset URLs must be
// prefixed with the repo name. `base` does that for bundled assets + index.html;
// public-folder assets referenced by absolute path in code must use
// import.meta.env.BASE_URL (see the logo in App.jsx). Left as '/' in dev.
// If you ever move to a custom domain or a user/org page (served from root),
// set this back to '/'.
export default defineConfig({
  base: '/HighSocietyScape/',
  plugins: [react()],
  server: {
    fs: { allow: [repoRoot] },
  },
});
