import { existsSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { gameApp } from '../games/kit/app/vite.js'

// One game on its own, for GitHub Pages: `GAME=<id> npm run build:game` writes dist-games/<id>/ with the game as
// index.html and relative paths, so it works from any sub-folder (the site puts it at game/<id>/, hooks/games.py).
// Every game's page is game.html and its entry games/kit/app; the game itself is games/<id>.
const game = process.env.GAME
if (!game) throw new Error('GAME=<id> names the game to build (an id in games/games.js)')
const outDir = resolve(import.meta.dirname, 'dist-games', game)

export default defineConfig({
  base: './',
  mode: 'game',
  // The shared kit lives outside this project (games/kit); resolve its React from here.
  resolve: { dedupe: ['react', 'react-dom', 'lucide-react'] },
  plugins: [
    react(),
    gameApp({ game }),
    {
      name: 'game-as-index',
      closeBundle() {
        // Also runs after a failed build, which writes no page; the build's own error is the one to read then.
        if (existsSync(resolve(outDir, 'game.html'))) renameSync(resolve(outDir, 'game.html'), resolve(outDir, 'index.html'))
      },
    },
  ],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: { input: { game: resolve(import.meta.dirname, 'game.html') } },
  },
})
