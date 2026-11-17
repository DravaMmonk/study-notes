// Manual benchmark: three fresh processes per target, two consecutive calls per process.
// From trace-viewer: node --import ../games/kit/engine/package-imports.mjs ../games/kit/engine/bench/preview.mjs
// Pass --tools for vocabulary/names/games/packages, or --sample <tool> <kind> <id> for CPU profiling.
import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { contentTargets } from '../resolver.js'

const args = process.argv.slice(2)
if (args[0] === '--sample') {
  const { TOOLS } = await import('../ops/tools.js')
  const { closeGames } = await import('../games.mjs')
  const [tool, kind, id] = args.slice(1)
  const input = kind ? { [kind]: id, ...(kind === 'package' && tool !== 'vocabulary' ? { scope: 'package' } : {}) } : {}
  if (tool === 'preview') Object.assign(input, { changeset: { ops: [] }, check: false })
  const times = [], cpu = [], hashes = []
  try {
    for (let call = 0; call < 2; call++) {
      const usage = process.cpuUsage()
      const start = performance.now()
      const result = await TOOLS[tool].run(input)
      times.push(Math.round(performance.now() - start))
      const used = process.cpuUsage(usage)
      cpu.push(Math.round((used.user + used.system) / 1000))
      hashes.push(createHash('sha256').update(JSON.stringify(result)).digest('hex'))
    }
    console.log(JSON.stringify({ times, cpu, hashes }))
  } finally { await closeGames() }
} else {
  const installed = [...contentTargets([], undefined, { package: true }), ...contentTargets([], undefined, { game: true })]
  const targets = args.includes('--tools')
    ? [...['vocabulary', 'names'].flatMap(tool => installed.map(({ kind, id }) => [tool, kind, id])), ['games'], ['packages']]
    : installed.map(({ kind, id }) => ['preview', kind, id])
  const selected = args.indexOf('--target')
  const measured = selected < 0 ? targets : targets.filter(([, kind, id]) => kind === args[selected + 1] && id === args[selected + 2])
  if (!measured.length) throw new Error('no benchmark target matches --target <package|game> <id>')
  for (const target of measured) {
    const samples = []
    for (let trial = 0; trial < 3; trial++) {
      const child = spawnSync(process.execPath, [...process.execArgv.filter(arg => !arg.startsWith('--cpu-prof')), fileURLToPath(import.meta.url), '--sample', ...target], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
      if (child.status !== 0) throw new Error(child.stderr || child.error || `benchmark exited ${child.status}`)
      samples.push(JSON.parse(child.stdout.trim()))
    }
    const median = index => samples.map(sample => sample.times[index]).sort((a, b) => a - b)[1]
    console.log(JSON.stringify({ target, first: median(0), second: median(1), samples }))
  }
}
