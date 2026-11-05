// The save migration a changeset needs (games/DIRECTION.md decision 4), generated rather than written by hand. Saves
// keep, per level id, whether it is solved, and per task key what the player left on it (../../shell/progress.js,
// saves.js); a changeset can break that in four ways, and each gets its save op:
//
//   ids         a level renamed or removed, a task renamed or removed: the operation says so itself (operations.js
//               `saves`), first in the step, so everything after it speaks of the new ids
//   kept state  a level whose puzzle changed, so the boards players kept on its tasks answer the old one: by default
//               a field of its puzzle or its tests (schema.js sectionOf) changed — the level's own, which drops every
//               task's boards, or one task's, which drops that task's (staleKeys); a domain may say instead which
//               changes do that (domain.js `changes.stale`). They are dropped ({ drop })
//   new prerequisites  a level put in the course (added, or moved) where it is now required, all the way back, by a
//               level a player solved without it: counted solved for them ({ solve }), from the first such level they
//               solved, so nobody is sent back. Only the level put there: a level moved later now comes after the
//               levels it passed over, and they are not handed to whoever solved it early. Which levels were put
//               somewhere is read off the course before and after, whatever operation did it (placedBy)
//   new builds  a level that now builds a part: for whoever solved it, the board they kept on its last task becomes the
//               part's ({ built })
//
// A course is read through its spec (domain.js spec(content)): its levels with what each requires, and the course's
// builds(level); the task keys of a level come from the content (keys(id), its last task's last).

import { sectionOf, shapeAt } from '../schema.js'

const PUZZLE = ['puzzle', 'tests']
// The fields of a level or a task (its tasks aside) that make its puzzle, read by the shape the schema gives it.
const puzzleOf = (schema, value, vocabulary) => {
  const shape = shapeAt(schema, value, [], { vocabulary })
  if (shape?.type !== 'obj') return value
  return Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'tasks' && shape.fields[k] && PUZZLE.includes(sectionOf(shape.fields[k]))))
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * The task keys of a level whose kept boards no longer apply, its file having gone from `before` to `after` (a level
 * of the `schema`): every task's when the puzzle fields the level says once changed, else the tasks whose puzzle did.
 * A task new to the level has nothing kept.
 */
export function staleKeys(schema, before, after, { vocabulary = null } = {}) {
  if (!same(puzzleOf(schema, before, vocabulary), puzzleOf(schema, after, vocabulary))) return after.tasks.map((task) => task.id)
  const task = shapeAt(schema, after, ['tasks', 0], { vocabulary })
  const was = new Map(before.tasks.map((x) => [x.id, x]))
  return after.tasks.filter((x) => was.has(x.id) && !same(puzzleOf(task, was.get(x.id), vocabulary), puzzleOf(task, x, vocabulary))).map((x) => x.id)
}

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

/** Where each level id of before went: Map old id → [new id] (none: removed), from a step's id ops. */
export function idMoves(oldIds, ops) {
  const moves = new Map(oldIds.map((id) => [id, [id]]))
  const move = (from, to) => { for (const [old, now] of moves) if (now.includes(from)) moves.set(old, now.flatMap((x) => (x === from ? to : [x]))) }
  for (const op of ops) for (const [from, to] of Object.entries(op.rename ?? {})) move(from, to === null ? [] : [to])
  return moves
}

/**
 * The levels a change put somewhere (new ids): the new ones, and those off a longest run of levels the play orders
 * before and after share — the fewest levels whose moving explains the new order. Where two runs are as long (two
 * levels swapped), the one that keeps the earlier level of the old order wins, so the level now first is the one put
 * there.
 */
export function placedBy(oldOrder, newOrder) {
  const n = oldOrder.length
  const m = newOrder.length
  const len = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) len[i][j] = oldOrder[i] === newOrder[j] ? len[i + 1][j + 1] + 1 : Math.max(len[i + 1][j], len[i][j + 1])
  const kept = new Set()
  for (let i = 0, j = 0; i < n && j < m;) {
    if (oldOrder[i] === newOrder[j]) { kept.add(oldOrder[i]); i++; j++ } else if (len[i][j + 1] >= len[i + 1][j]) j++
    else i++
  }
  return new Set(newOrder.filter((id) => !kept.has(id)))
}

/**
 * The ops of the save step a changeset needs, in order. before, after: { levels: [{ id, requires }], builds(id) →
 * [part] } (before null when the content before did not fit its vocabulary: only the ops' own and the stale boards
 * are given); idOps: the operations' own save ops; stale: the task keys (new) whose kept boards no longer apply;
 * keys(id): a level's task keys, now.
 */
export function saveOps({ before, after, idOps, stale = [], keys = (id) => [id] }) {
  const out = [...idOps]
  if (stale.length) out.push({ drop: stale })
  if (!before) return out
  const moves = idMoves(before.levels.map((l) => l.id), idOps)
  const now = (old) => moves.get(old) ?? []
  const was = new Map()
  for (const [old, ids] of moves) for (const id of ids) was.set(id, [...(was.get(id) ?? []), old])
  const order = new Map(after.levels.map((l, k) => [l.id, k]))
  const placed = placedBy(before.levels.flatMap((l) => now(l.id)), after.levels.map((l) => l.id))
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
  if (built.length) out.push({ built: built.map((id) => [id, keys(id).at(-1)]) })
  return out
}
