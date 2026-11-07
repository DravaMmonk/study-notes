import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Bundle only the hub's imported UI and illustrations; game builds fill its sibling folders.
export default defineConfig({
  root: resolve(import.meta.dirname, '../games'),
  base: './',
  publicDir: false,
  resolve: {
    alias: [
      { find: /^react(\/.*)?$/, replacement: `${resolve(import.meta.dirname, 'node_modules/react')}$1` },
      { find: /^react-dom(\/.*)?$/, replacement: `${resolve(import.meta.dirname, 'node_modules/react-dom')}$1` },
      { find: 'lucide-react', replacement: resolve(import.meta.dirname, 'node_modules/lucide-react') },
    ],
  },
  plugins: [react()],
  build: {
    outDir: resolve(import.meta.dirname, 'dist-games'),
    emptyOutDir: true,
  },
})
