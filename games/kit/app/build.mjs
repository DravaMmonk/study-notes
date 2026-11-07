/* global process */
// Build the standalone site: the hub at dist-games/index.html, each game at dist-games/<id>/.
import { execFile } from 'node:child_process'
import { availableParallelism } from 'node:os'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { GAMES } from '../../games.js'

const cwd = resolve(import.meta.dirname, '../../../trace-viewer')
const run = promisify(execFile)

// One vite build; its output is printed whole when it ends, so parallel builds never interleave.
async function build(name, config, env = {}) {
  try {
    const { stdout, stderr } = await run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', config], {
      cwd, env: { ...process.env, ...env }, maxBuffer: 64 << 20,
    })
    console.log(`\n${name}\n${stdout}${stderr}`)
  } catch (error) {
    console.error(`\n${name} failed\n${error.stdout ?? ''}${error.stderr ?? error.message}`)
    throw error
  }
}

// The hub build clears the output before any games are written; the games' folders are their own, so they build at once.
await build('hub', 'vite.games.config.js')
const queue = GAMES.map(({ id }) => id)
const worker = async () => {
  for (let id = queue.shift(); id; id = queue.shift()) await build(id, 'vite.game.config.js', { GAME: id })
}
await Promise.all(Array.from({ length: availableParallelism() }, worker))
