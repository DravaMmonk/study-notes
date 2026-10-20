/* global process */
// npm run build:games — every game in the hub's list (../../games.js), each into trace-viewer/dist-games/<id>/.
import { execFileSync } from 'node:child_process'
import { GAMES } from '../../games.js'

for (const { id } of GAMES) {
  console.log(`\n${id}`)
  execFileSync('npx', ['vite', 'build', '--config', 'vite.game.config.js'], { stdio: 'inherit', env: { ...process.env, GAME: id } })
}
