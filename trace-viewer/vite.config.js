import { existsSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On the dev server the games sit where the published site puts them: the hub at /game/index.html (straight from
// games/, with its kit), each game at /game/<id>/index.html (this project's page for it). The pages' own paths,
// /game.html and /state-graph.html, lead there too, so every link works the same locally as on the site.
const GAMES_DIR = resolve(import.meta.dirname, '../games')
const GAME_PAGES = { 'vision-complete': '/game.html', 'state-graph': '/state-graph.html' }
const gamePaths = () => ({
  name: 'game-paths',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url, 'http://localhost')
      const path = url.pathname
      const moved = Object.keys(GAME_PAGES).find((id) => GAME_PAGES[id] === path)
      if (moved || path === '/game' || path === '/game/') {
        res.statusCode = 302
        res.setHeader('Location', `${moved ? `/game/${moved}` : '/game'}/index.html${url.search}`)
        return res.end()
      }
      const game = path.match(/^\/game\/([^/]+)\/(?:index\.html)?$/)
      if (game && GAME_PAGES[game[1]]) {
        req.url = `${GAME_PAGES[game[1]]}${url.search}`
        return next()
      }
      if (path.startsWith('/game/')) {
        const file = resolve(GAMES_DIR, `.${path.slice('/game'.length)}`)
        if (file.startsWith(GAMES_DIR + sep) && existsSync(file) && statSync(file).isFile()) req.url = `/@fs${file}${url.search}`
      }
      return next()
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  // The shared game shell lives outside this project (games/kit/shell); resolve its React from here.
  resolve: { dedupe: ['react', 'react-dom', 'lucide-react'] },
  plugins: [react(), gamePaths()],
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
