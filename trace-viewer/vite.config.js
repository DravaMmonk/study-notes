import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fieldnotes: the reader for ../docs and the notes' figures (figures.html). The games are their own repository; a note's
// embedded level opens from the published games site (src/figures/task.js).
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        figures: resolve(import.meta.dirname, 'figures.html'),
      },
    },
  },
})
