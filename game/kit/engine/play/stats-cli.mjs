/* global process */
// npm run playtests [-- <game id>…] — the audit panel's blind-play table (./stats.js): for every game with sessions,
// each level played (in play order) with its sessions, pass rate, attempts to pass, hints, difficulty and time, then the
// difficulty-spike findings. Reads games/<game>/playtests/; plays nothing.
import { GAMES } from '../../../games.js'
import { isDataGame, readContent, readPlaytests } from '../content-node.js'
import { SPIKE, perLevel, spikes } from './stats.js'

const asked = process.argv.slice(2)
for (const id of asked.length ? asked : GAMES.map((g) => g.id)) {
  const records = readPlaytests(id)
  if (!records.length || !isDataGame(id)) continue
  const content = readContent(id)
  const spec = (await import(`../../domains/${content.domain}/domain.js`)).default.spec(content)
  const stats = perLevel(records)
  const skipped = new Set(records.flatMap((r) => r.levels.filter((e) => e.outcome === 'skipped').map((e) => e.level)))
  console.log(`\n${spec.title.zh} ${spec.title.en}: ${records.length} session(s) (${records.map((r) => `${r.session}: ${r.player.kind}${r.player.model ? ` ${r.player.model}` : ''}`).join('; ')})`)
  console.log('  level      sessions  passed  attempts  hints  difficulty  seconds')
  for (const level of spec.levels) {
    const s = stats.get(level.id)
    if (!s) {
      if (skipped.has(level.id)) console.log(`  ${level.id.padEnd(10)} skipped (play not covered)`)
      continue
    }
    const num = (v, w) => (v === null ? '–' : Number.isInteger(v) ? String(v) : v.toFixed(1)).padStart(w)
    console.log(`  ${level.id.padEnd(10)} ${num(s.sessions, 8)}  ${`${s.solved}/${s.sessions}`.padStart(6)}  ${num(s.attempts, 8)}  ${num(s.hints, 5)}  ${num(s.cost, 10)}  ${num(s.seconds, 7)}`)
  }
  const found = spikes(spec.course, records)
  for (const f of found) console.log(`  ${f.enough ? 'SPIKE ' : 'REPORT'} difficulty-spike: ${f.text}`)
  if (!found.length) console.log(`  no difficulty-spike (a required level at ${SPIKE.ratio}× its neighbours and ${SPIKE.gap} attempts more)`)
}
