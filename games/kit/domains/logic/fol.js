// First-order meaning (《证明完毕》 chapter 5 on): whether two formulas say the same thing, which elements of a world a
// formula with a free variable picks out, worlds written out by name (models.js evaluates them), and the counterexample
// boards: someone's wrong inference wired as a board, for the player to build a world against.
//
//   world  { things: [name], preds: { P: [name] | [[name, name]] }, consts?: { c: name } }   a level's own world
import { countermodelSearch, holds } from './models.js'
import { parse, signature } from './formula.js'
import { needSentence, needUnder, waysIn } from './iso.js'

/**
 * Do two formulas agree in every world of 1 to 3 things? null when they do, or a world where they differ:
 * { model, first } (first: true when `f` holds there and `g` does not).
 */
export function difference(f, g) {
  const a = countermodelSearch([f], g, { limit: 1 << 16 })
  if (a.model) return { model: a.model, first: true }
  const b = countermodelSearch([g], f, { limit: 1 << 16 })
  return b.model ? { model: b.model, first: false } : null
}

/** A named world as a structure models.js evaluates: things are 0 … n-1 in the order named. */
export function structureOf(world, formulas = []) {
  const index = new Map(world.things.map((name, k) => [name, k]))
  const sig = signature(formulas)
  const preds = {}
  for (const [p, n] of sig.preds) preds[p] = n === 0 ? false : new Set()
  for (const [p, list] of Object.entries(world.preds ?? {})) preds[p] = new Set(list.map((x) => [x].flat().map((name) => index.get(name)).join(',')))
  // A thing is named by its own id too (the family's 'ann'), and the world may name others (consts).
  const fns = Object.fromEntries(world.things.map((name, k) => [name, new Map([['', k]])]))
  for (const [c, name] of Object.entries(world.consts ?? {})) fns[c] = new Map([['', index.get(name)]])
  return { domain: world.things.map((_, k) => k), preds, fns }
}

/** The things a formula picks out in a structure, through its free variable `v`. */
export const extent = (f, model, v = 'x') => model.domain.filter((d) => holds(f, model, { [v]: d }))

/** The predicates (with their arities) and constants of some formulas. */
export function vocabulary(formulas) {
  const { preds, fns } = signature(formulas)
  return { preds: [...preds].filter(([p]) => p !== '='), consts: [...fns].filter(([, n]) => n === 0).map(([c]) => c) }
}

/**
 * A world as a model level builds it ({ size, preds: { P: ['0', '0,1'] | true }, consts: { c: k } }), as a structure,
 * for a vocabulary ({ preds: [[P, arity]], consts: [c] }); what lies beyond its size is ignored.
 */
export function builtWorld(w, vocab) {
  const domain = Array.from({ length: w.size }, (_, k) => k)
  const inside = (key) => key.split(',').every((x) => Number(x) < w.size)
  const preds = Object.fromEntries(vocab.preds.map(([p, n]) => [p, n === 0 ? Boolean(w.preds?.[p]) : new Set((w.preds?.[p] ?? []).filter(inside))]))
  const fns = Object.fromEntries(vocab.consts.map((c) => [c, new Map([['', Math.min(w.consts?.[c] ?? 0, w.size - 1)]])]))
  return { domain, preds, fns }
}

// A counterexample level (kind 'model', ui/WorldScreens.jsx) is someone's wrong declaration of a first-order sentence
// (the level's `target`), on the declaration board (iso.js, `board`): its intro rules are all the ways the sentence
// comes about, so in a world it holds just when every premise of one of them does (a rule taking a thing, ⋀x, for some
// thing; a premise needed under premises of its own, ⟦⟦A⟧ ⟹ B⟧, when they give it). The requirement is what the
// sentence itself says there. The player builds a world where the two differ: a rule that makes it where it is false
// (too strong), or none that makes it where it is true (too weak).

const read = (level) => (f) => parse(f, { consts: level.vocab.names })

/** In a world: whether each intro rule of the board makes the sentence, whether the declaration does, and whether the
 * sentence itself holds. */
export function declaredIn(level, world, board = level.board) {
  const model = builtWorld(world, level.vocab)
  const f = read(level)
  const need = (n, env) => !needUnder(n).every((u) => need(u, env)) || holds(f(needSentence(n)), model, env)
  const envs = (binds) => binds.reduce((all, v) => all.flatMap((env) => model.domain.map((d) => ({ ...env, [v]: d }))), [{}])
  const ways = waysIn(board).map((way) => envs(way.binds).some((env) => way.needs.every((n) => need(n, env))))
  return { ways, declared: ways.some(Boolean), meant: holds(f(level.target), model) }
}

/** Whether a world is a counterexample to the level's declaration. */
export function counters(level, world) {
  const { declared, meant } = declaredIn(level, world)
  return world.size <= (level.maxSize ?? 3) && declared !== meant
}

/** The sentences on the board's premise cards (for the level's vocabulary). */
export const boardSentences = (board) => board.nodes.filter((n) => n.type === 'hyp').map((n) => n.params.name)
