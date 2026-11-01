// The audit panel's blind-play numbers (games/DESIGN.md 5): every session a game has played (./session.js records,
// games/<game>/playtests/), summed up level by level, and the rule difficulty-spike over them.
//
// A level's cost in one session is the attempts it took to pass; a level given up (by the player, or at the session's
// cap) costs the cap plus one, a failure counted past every attempt it had. Levels skipped (a play the harness does not
// cover) and levels still open have no cost. A level's difficulty is its mean cost over the sessions that played it.
//
// difficulty-spike: a required level whose difficulty stands out against its neighbours on the tree — the required
// levels it requires and those that require it, played in some session: its difficulty is at least SPIKE.ratio times
// theirs (their mean) and at least SPIKE.gap attempts more. With fewer than SPIKE.sessions sessions on the level and on
// each neighbour, a finding only reports (one LLM session is a reading, not a verdict); from there on it fails the check
// unless the game's work list leaves it open (game.json `open`, as for every rule).

const OPTIONAL = ['intro', 'step', 'finale', 'challenge']

export const SPIKE = { ratio: 2, gap: 2, sessions: 5 }

/** One session's cost of a level's outcome, or null when it has none. */
const costOf = (entry, cap) => (entry.outcome === 'solved' ? entry.attempts : entry.outcome === 'gave-up' ? cap + 1 : null)

/**
 * Level by level over every session: { id → { sessions, solved, gaveUp, attempts (mean, over the sessions that passed
 * it), hints, cost (the difficulty), seconds } } for the levels some session played, in no particular order. A level
 * of tasks counts as its tasks summed: attempts and hints add up, and it is solved when every task played was.
 */
export function perLevel(records) {
  const out = new Map()
  for (const record of records) {
    const cap = record.limits.attempts
    const byLevel = new Map()
    for (const e of record.levels) {
      const cost = costOf(e, cap)
      if (cost === null) continue
      const had = byLevel.get(e.level) ?? { cost: 0, attempts: 0, hints: 0, seconds: 0, solved: true }
      byLevel.set(e.level, { cost: had.cost + cost, attempts: had.attempts + e.attempts, hints: had.hints + e.hints, seconds: had.seconds + (e.seconds ?? 0), solved: had.solved && e.outcome === 'solved' })
    }
    for (const [id, s] of byLevel) {
      const acc = out.get(id) ?? { sessions: 0, solved: 0, gaveUp: 0, attemptsSolved: 0, hints: 0, cost: 0, seconds: 0 }
      acc.sessions += 1
      acc.solved += s.solved ? 1 : 0
      acc.gaveUp += s.solved ? 0 : 1
      acc.attemptsSolved += s.solved ? s.attempts : 0
      acc.hints += s.hints
      acc.cost += s.cost
      acc.seconds += s.seconds
      out.set(id, acc)
    }
  }
  return new Map([...out].map(([id, a]) => [id, { sessions: a.sessions, solved: a.solved, gaveUp: a.gaveUp, attempts: a.solved ? a.attemptsSolved / a.solved : null, hints: a.hints / a.sessions, cost: a.cost / a.sessions, seconds: a.seconds / a.sessions }]))
}

/**
 * difficulty-spike over a course (../../course.js defineCourse: its plan gives the tree and the roles): [{ rule, level,
 * part: 'playtests', text, enough }], `enough` when the level and its neighbours have SPIKE.sessions sessions each.
 */
export function spikes(course, records) {
  const stats = perLevel(records)
  const required = (id) => !OPTIONAL.includes(course.plan?.place.get(id)?.role)
  const requires = course.plan?.requires ?? new Map()
  const out = []
  for (const [id, s] of stats) {
    if (!required(id)) continue
    const near = [...new Set([...(requires.get(id) ?? []), ...[...requires].filter(([, rs]) => rs.includes(id)).map(([other]) => other)])].filter((n) => required(n) && stats.has(n))
    if (!near.length) continue
    const base = near.reduce((sum, n) => sum + stats.get(n).cost, 0) / near.length
    if (s.cost < SPIKE.ratio * base || s.cost - base < SPIKE.gap) continue
    const enough = s.sessions >= SPIKE.sessions && near.every((n) => stats.get(n).sessions >= SPIKE.sessions)
    out.push({ rule: 'difficulty-spike', level: id, part: 'playtests', enough, text: `${id} costs ${s.cost.toFixed(1)} attempts against ${base.toFixed(1)} on its neighbours (${near.join(', ')}); ${s.sessions} session(s)` })
  }
  return out
}

/** The panel's lines for a game: pass rate and difficulty level by level (in play order), then the spikes that only
 *  report (those with enough sessions are audit findings: npm run check fails on them). */
export function panel(order, course, records) {
  if (!records.length) return []
  const stats = perLevel(records)
  const played = order.filter((id) => stats.has(id))
  const rate = (s) => `${s.solved}/${s.sessions}`
  const lines = [`PLAYTESTS ${records.length} session(s), ${played.length} level(s) played: ${played.map((id) => `${id} ${rate(stats.get(id))}·${stats.get(id).cost.toFixed(1)}`).join('  ')}`]
  for (const f of spikes(course, records).filter((x) => !x.enough)) lines.push(`REPORT difficulty-spike: ${f.text} (reports until ${SPIKE.sessions} sessions)`)
  return lines
}
