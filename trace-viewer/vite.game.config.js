import { renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The game on its own, for GitHub Pages: `npm run build:game` writes dist-game/ with the game as
// index.html and relative paths, so it works from any sub-folder (it is published at
// https://dravammonk.github.io/study-notes/game/, beside the MkDocs notes).
const outDir = resolve(import.meta.dirname, 'dist-game')

export default defineConfig({
  base: './',
  mode: 'game',
  plugins: [
    react(),
    {
      name: 'game-as-index',
      closeBundle() {
        renameSync(resolve(outDir, 'game.html'), resolve(outDir, 'index.html'))
      },
    },
  ],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: { input: { game: resolve(import.meta.dirname, 'game.html') } },
  },
})
