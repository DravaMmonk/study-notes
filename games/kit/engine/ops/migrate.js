// The save migration a changeset needs (games/DIRECTION.md decision 4), generated rather than written by hand. Saves
// keep, per level id, whether it is solved and what the player left on it (../../shell/saves.js); a changeset can
// break that in four ways, and each gets its save op:
//
//   ids         a level renamed or removed: the operation says so itself (operations.js `saves`), first in the step,
//               so everything after it speaks of the new ids
//   kept state  a level whose puzzle changed, so what players kept on it answers the old one: the domain says which
//               changes do that and how its saves drop the state (domain.js `changes`: { stale, drop })
//   new prerequisites  a level put in the course (added, or moved) where it is now required, all the way back, by a
//               level a player solved without it: counted solved for them ({ solve }), from the first such level they
//               solved, so nobody is sent back. Only the level put there: a level moved later now comes after the
//               levels it passed over, and they are not handed to whoever solved it early
//   new builds  a level that now builds a part: for whoever solved it, the board they kept becomes the part's ({ built })
//
// A course is read through its spec (domain.js spec(content)): its levels with what each requires, and the course's
// builds(level).

/** Every level's prerequisites all the way back: Map id → Set. */
export function ancestors(levels) {
  const requires = new Map(levels.map((l) => [l.id, l.requires ?? []]))
  const out = new Map()
  const up = (id) => {
    if (out.has(id)) return out.get(id)
    const set = new Set()
    out.set(id, set)
    for (const r of requires.get(id) ?? []) { set.add(r); for (const x of up(r)) set.add(x) }
    return set
  }
  for (const l of levels) up(l.id)
  return out
}

/** Where each level id of before went: Map old id → [new id] (none: removed; several: split), from a step's id ops. */
export function idMoves(oldIds, ops) {
  const moves = new Map(oldIds.map((id) => [id, [id]]))
  const move = (from, to) => { for (const [old, now] of moves) if (now.includes(from)) moves.set(old, [...new Set(now.flatMap((x) => (x === from ? to : [x])))]) }
  for (const op of ops) {
    for (const [from, to] of Object.entries(op.rename ?? {})) move(from, to === null ? [] : [to])
    if (op.merge) for (const id of op.merge[1]) move(id, [op.merge[0]])
    if (op.split) move(op.split[0], op.split[1])
  }
  return moves
}

/**
 * The ops of the save step a changeset needs, in order. before, after: { levels: [{ id, requires }], builds(id) →
 * [part] } (before null when the content before did not fit its vocabulary: only the ops' own and the domain's are
 * given); idOps: the operations' own save ops; placed: the levels (new ids) the changeset put somewhere in the course;
 * stale: levels (new ids) whose kept state no longer applies; drop: the domain's ops dropping those.
 */
export function saveOps({ before, after, idOps, placed = new Set(), stale = [], drop = null }) {
  const out = [...idOps]
  if (stale.length) {
    if (!drop) throw new Error(`${stale.join(', ')}: what players kept no longer applies, and the domain has no way to drop it`)
    out.push(...drop(stale))
  }
  if (!before) return out
  const moves = idMoves(before.levels.map((l) => l.id), idOps)
  const now = (old) => moves.get(old) ?? []
  const was = new Map()
  for (const [old, ids] of moves) for (const id of ids) was.set(id, [...(was.get(id) ?? []), old])
  const order = new Map(after.levels.map((l, k) => [l.id, k]))
  const byOrder = (a, b) => order.get(a) - order.get(b)

  // New prerequisites: P now before Q, and Q could be solved without P.
  const old = ancestors(before.levels)
  const anc = ancestors(after.levels)
  const had = new Map()
  const newFor = new Map() // P → [Q]
  for (const { id } of after.levels) {
    const olds = was.get(id)
    if (!olds) continue
    const set = new Set(olds.flatMap((o) => [...(old.get(o) ?? [])].flatMap(now)))
    had.set(id, set)
    for (const p of anc.get(id)) if (placed.has(p) && !set.has(p) && p !== id) newFor.set(p, [...(newFor.get(p) ?? []), id])
  }
  const solve = new Map() // Q → [P]
  for (const [p, qs] of newFor) {
    // Whoever solved a later one of these solved the earliest ones too: they carry it.
    for (const q of qs.filter((q) => !qs.some((r) => r !== q && had.get(q).has(r)))) solve.set(q, [...(solve.get(q) ?? []), p])
  }
  for (const q of [...solve.keys()].sort(byOrder)) out.push({ solve: [q, solve.get(q).sort(byOrder)] })

  // New builds.
  const built = after.levels.map((l) => l.id).filter((id) => {
    const olds = was.get(id)
    if (!olds) return false
    const made = new Set(olds.flatMap((o) => before.builds(o)))
    return after.builds(id).some((p) => !made.has(p))
  })
  if (built.length) out.push({ built })
  return out
}
