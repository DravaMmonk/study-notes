import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // The shared game shell lives outside this project (games/kit/shell); resolve its React from here.
  resolve: { dedupe: ['react', 'react-dom', 'lucide-react'] },
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
        game: resolve(import.meta.dirname, 'game.html'),
        stateGraph: resolve(import.meta.dirname, 'state-graph.html'),
        figures: resolve(import.meta.dirname, 'figures.html'),
      },
    },
  },
})
