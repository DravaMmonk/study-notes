// Runs: the syntax domain's replayable mode. A run is one submission of a paper, from first reviews to the programme
// committee, along a route that is new each time. On the way the player answers reviewers' comments with the phrasings
// they hold; a wrong one costs credibility, and at none the paper is rejected. Every comment is a situation from the
// game's templates, said by the machine; the run picks them at random but leans on what the player has got wrong
// before, in this run and in earlier ones, so the practice is spaced without looking like it.
//
// What a game writes (its spec's `run`):
//
//   { credibility, start: [time key], rewards: [time key], rows,
//     stops: { reviews: { comments, weight }, strict: { comments, weight, twists }, committee: { … }, night: {} },
//     templates: [{ id, answer, twist?, why: { time key: { zh, en } }, fills: [{ context: { zh, en }, words }] }] }
//
// A phrasing is a time (grammar.js TIMES): what the player holds is the ways of saying a verb they can reach for. A
// template is one situation in several fills (different things done, said the same way); `twist` marks the ones that
// look like another situation, which strict reviewers favour. A wrong phrasing gets the template's reason, or a plain
// one from the time question it answers differently.
//
// The state is plain data (it is saved as it is), and every step below returns a new one:
//
//   newRun(spec, seed) → state                  enter(spec, state, k, history) → state (stop k of the next row)
//   play(spec, state, comment, phrasing) → { state, right, key }
//   take(spec, state, phrasing | null) → state  night(spec, state, 'rest' | 'revise', history) → state

import { timeStep } from './grammar.js'

const PRACTISED = 3 // right uses after which a phrasing is practised: it then restores a point of credibility
const REST = 4 // credibility a quiet night restores

/** A seeded generator as plain data: next(r) → [number in [0, 1), r']. */
function next(r) {
  let t = (r + 0x6d2b79f5) >>> 0
  const out = t
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, out]
}

/** Every situation of a spec, flat: { key, answer, twist, why, context, clause }. */
export function situations(spec) {
  return spec.templates.flatMap((t) => t.fills.map((f, k) => ({ key: `${t.id}.${k}`, template: t.id, answer: t.answer, twist: Boolean(t.twist), why: t.why ?? {}, context: f.context, clause: f.words })))
}

/** Why a phrasing is wrong for a situation. */
export const reason = (situation, phrasing) => situation.why[phrasing] ?? timeStep(phrasing, situation.answer).why

// Draw `n` of `pool` without repeats, each with chance in proportion to `weight(item)`.
function draw(r, pool, n, weight) {
  const left = [...pool]
  const out = []
  while (out.length < n && left.length) {
    const total = left.reduce((sum, s) => sum + weight(s), 0)
    let x
    ;[x, r] = next(r)
    let at = x * total
    let k = 0
    while (k < left.length - 1 && at >= weight(left[k])) at -= weight(left[k++])
    out.push(left.splice(k, 1)[0])
  }
  return [out, r]
}

// The route: a first stop of reviews, rows of two or three stops to choose from, the committee at the end. Somewhere
// on the way there is always a strict reviewer and a quiet night.
function route(spec, r) {
  const rows = [['reviews']]
  const kinds = [['reviews', 3], ['night', 1], ['strict', 1]]
  for (let row = 1; row < spec.rows - 1; row++) {
    let x
    ;[x, r] = next(r)
    const width = x < 0.5 ? 2 : 3
    const here = []
    for (let k = 0; k < width; k++) {
      const allowed = kinds.filter(([kind]) => !(kind === 'strict' && row < 2))
      let pick
      ;[[pick], r] = draw(r, allowed, 1, ([, w]) => w)
      here.push(pick[0])
    }
    rows.push(here)
  }
  for (const kind of ['strict', 'night']) {
    if (rows.some((row) => row.includes(kind))) continue
    const row = kind === 'strict' ? Math.min(3, rows.length - 1) : rows.length - 1
    rows[row][rows[row].length - 1] = kind
  }
  rows.push(['committee'])
  return [rows, r]
}

/** A new run from a seed. (`history`, given to `enter` and `night`, is { situation key: times got wrong } so far.) */
export function newRun(spec, seed) {
  const [rows, r] = route(spec, seed >>> 0)
  return {
    r,
    credibility: spec.credibility,
    max: spec.credibility,
    held: Object.fromEntries(spec.start.map((p) => [p, 0])),
    route: rows,
    row: -1,
    path: [],
    phase: 'route',
    stop: null,
    comments: [],
    offer: [],
    used: [],
    missed: [],
    wrongs: 0,
  }
}

// The comments for a stop: situations the player holds a phrasing for, more often the ones got wrong before, not
// repeated within a run while others are left; strict stops and the committee take some twists first.
function comments(spec, state, kind, history = {}) {
  const stop = spec.stops[kind]
  const all = situations(spec).filter((s) => s.answer in state.held)
  const fresh = all.filter((s) => !state.used.includes(s.key))
  const pool = fresh.length >= stop.comments ? fresh : all
  const weight = (s) => 1 + 2 * (history[s.key] ?? 0) + (state.missed.includes(s.key) ? 2 : 0)
  let r = state.r
  let twists = []
  if (stop.twists) [twists, r] = draw(r, pool.filter((s) => s.twist), stop.twists, weight)
  let rest
  ;[rest, r] = draw(r, pool.filter((s) => !twists.includes(s)), stop.comments - twists.length, weight)
  let order
  ;[order, r] = draw(r, [...twists, ...rest], stop.comments, () => 1)
  return [order.map((s) => ({ key: s.key, weight: stop.weight, picked: null })), r]
}

/** Go to stop `k` of the next row. A night waits for its choice; anything else deals its comments. */
export function enter(spec, state, k, history) {
  const row = state.row + 1
  const kind = state.route[row][k]
  const moved = { ...state, row, path: [...state.path, k], stop: kind }
  if (kind === 'night') return { ...moved, phase: 'night', comments: [] }
  const [list, r] = comments(spec, moved, kind, history)
  return { ...moved, r, phase: 'comments', comments: list, used: [...moved.used, ...list.map((c) => c.key)] }
}

/** Answer comment `c` with `phrasing`. */
export function play(spec, state, c, phrasing) {
  const comment = state.comments[c]
  if (!comment || comment.picked) return { state, right: null, key: null }
  const situation = situations(spec).find((s) => s.key === comment.key)
  const right = phrasing === situation.answer
  const practice = state.held[phrasing] ?? 0
  let credibility = state.credibility
  if (right && practice >= PRACTISED) credibility = Math.min(state.max, credibility + 1)
  if (right && comment.weight === 0) credibility = Math.min(state.max, credibility + 1) // a revision answered
  if (!right) credibility -= comment.weight
  const list = state.comments.map((x, k) => (k === c ? { ...x, picked: phrasing } : x))
  let out = {
    ...state,
    credibility,
    comments: list,
    held: right ? { ...state.held, [phrasing]: practice + 1 } : state.held,
    missed: right ? state.missed.filter((k) => !(comment.weight === 0 && k === comment.key)) : [...new Set([...state.missed, comment.key])],
    wrongs: state.wrongs + (right ? 0 : 1),
  }
  if (credibility <= 0) out = { ...out, credibility: 0, phase: 'lost' }
  else if (list.every((x) => x.picked)) out = finish(spec, out)
  return { state: out, right, key: comment.key }
}

// A stop answered in full: the committee ends the run; reviews offer a new phrasing; a revision goes back to the route.
function finish(spec, state) {
  if (state.stop === 'committee') return { ...state, phase: 'won' }
  if (state.stop === 'night') return { ...state, phase: 'route', comments: [] }
  const left = spec.rewards.filter((p) => !(p in state.held))
  const [offer, r] = draw(state.r, left, 3, () => 1)
  return { ...state, r, phase: 'offer', offer }
}

/** Take a phrasing from the offer, or none for a little credibility instead. */
export function take(spec, state, phrasing) {
  const held = phrasing ? { ...state.held, [phrasing]: 0 } : state.held
  const credibility = phrasing ? state.credibility : Math.min(state.max, state.credibility + 2)
  return { ...state, held, credibility, offer: [], comments: [], phase: 'route' }
}

/** A quiet night: rest (credibility back) or revise (the comments got wrong, again, for credibility each). */
export function night(spec, state, choice, history = {}) {
  if (choice === 'rest') return { ...state, credibility: Math.min(state.max, state.credibility + REST), phase: 'route' }
  const known = situations(spec).filter((s) => s.answer in state.held)
  const wrong = known.filter((s) => state.missed.includes(s.key) || history[s.key])
  const pool = wrong.length ? wrong : known
  const [picked, r] = draw(state.r, pool, 3, (s) => 1 + (history[s.key] ?? 0))
  return { ...state, r, phase: 'comments', comments: picked.map((s) => ({ key: s.key, weight: 0, picked: null })) }
}

export const practised = (count) => count >= PRACTISED
