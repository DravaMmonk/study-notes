/* global process */
// Build the standalone site: the hub at dist-games/index.html, each game at dist-games/<id>/.
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { GAMES } from '../../games.js'

const cwd = resolve(import.meta.dirname, '../../../trace-viewer')
const build = (config, env = {}) => execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', config], {
  cwd, stdio: 'inherit', env: { ...process.env, ...env },
})

// The hub build clears the output before any games are written.
build('vite.games.config.js')
for (const { id } of GAMES) {
  console.log(`\n${id}`)
  build('vite.game.config.js', { GAME: id })
}
