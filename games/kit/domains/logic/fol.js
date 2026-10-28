// First-order meaning (《证明完毕》 chapter 6 on): whether two formulas say the same thing, which elements of a world a
// formula with a free variable picks out, and worlds written out by name (models.js evaluates them).
//
//   world  { things: [name], preds: { P: [name] | [[name, name]] }, consts?: { c: name } }   a level's own world
import { countermodelSearch, holds } from './models.js'
import { signature } from './formula.js'

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
