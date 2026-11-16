// The audit panel's blind-play numbers (games/DESIGN.md 5): every session a game has played (./session.js records,
// games/<game>/playtests/), summed up level by level, without automatic difficulty judgments.
//
// A level's cost in one session is the attempts it took to pass; a level given up (by the player, or at the session's
// cap) costs the cap plus one, a failure counted past every attempt it had. Levels skipped (a play the harness does not
// cover) and levels still open have no cost. A level's difficulty is its mean cost over the sessions that played it.
//
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

/** Observed playtest totals, without a pedagogical verdict. */
export function panel(order, course, records) {
  if (!records.length) return []
  const stats = perLevel(records)
  const played = order.filter((id) => stats.has(id))
  const rate = (s) => `${s.solved}/${s.sessions}`
  const lines = [`PLAYTESTS ${records.length} session(s), ${played.length} level(s) played: ${played.map((id) => `${id} ${rate(stats.get(id))}·${stats.get(id).cost.toFixed(1)}`).join('  ')}`]
  return lines
}
