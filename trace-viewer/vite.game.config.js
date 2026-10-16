import { existsSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A game on its own, for GitHub Pages, with the game as index.html and relative paths so it works from any
// sub-folder. `npm run build:game` writes dist-game/ (Vision Complete, published at game/vision-complete/);
// `npm run build:state-graph` writes dist-state-graph/ (状态之图, at game/state-graph/). Both sit under the games hub
// in games/ and share the game shell in games/kit/shell.
const GAMES = {
  'vision-complete': { page: 'game.html', outDir: resolve(import.meta.dirname, 'dist-game') },
  'state-graph': { page: 'state-graph.html', outDir: resolve(import.meta.dirname, 'dist-state-graph') },
}
const { page, outDir } = GAMES[process.env.GAME ?? 'vision-complete']

export default defineConfig({
  base: './',
  mode: 'game',
  // The shared game shell lives outside this project (games/kit/shell); resolve its React from here.
  resolve: { dedupe: ['react', 'react-dom', 'lucide-react'] },
  plugins: [
    react(),
    {
      name: 'game-as-index',
      closeBundle() {
        // Also runs after a failed build, which writes no page; the build's own error is the one to read then.
        if (existsSync(resolve(outDir, page))) renameSync(resolve(outDir, page), resolve(outDir, 'index.html'))
      },
    },
  ],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: { input: { game: resolve(import.meta.dirname, page) } },
  },
})
