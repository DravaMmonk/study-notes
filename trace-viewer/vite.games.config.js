import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Bundle only the hub's imported UI and illustrations; game builds fill its sibling folders.
export default defineConfig({
  root: resolve(import.meta.dirname, '../games'),
  base: './',
  publicDir: false,
  build: {
    outDir: resolve(import.meta.dirname, 'dist-games'),
    emptyOutDir: true,
  },
})
