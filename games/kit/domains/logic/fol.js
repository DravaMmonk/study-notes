// First-order meaning (《证明完毕》 chapter 5 on): whether two formulas say the same thing, which elements of a world a
// formula with a free variable picks out, worlds written out by name (models.js evaluates them), and the counterexample
// boards: someone's wrong inference wired as a board, for the player to build a world against.
//
//   world  { things: [name], preds: { P: [name] | [[name, name]] }, consts?: { c: name } }   a level's own world
import { countermodelSearch, holds } from './models.js'
import { parse, signature } from './formula.js'

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

// A counterexample level (kind 'model', ui/WorldScreens.jsx) is someone's inference that does not hold: its premises
// (given) joined into its conclusion (goal), ⟦A; B⟧ ⟹ C, wired as a declaration's way is (iso.js cards: a premise card
// each, Join between them, a card assuming nothing when there is none). The player builds a world where every premise
// holds and the conclusion fails.
export const CLAIM = 'claim'

/** The inference's board: premise cards down the left, joined in turn, into the conclusion card; every card locked. */
export function claimBoard(given) {
  const at = (x, k) => ({ x, y: 40 + k * 150, locked: true })
  const cards = given.length
    ? given.map((f, k) => ({ id: `p${k + 1}`, type: 'hyp', params: { name: f }, ...at(20, k) }))
    : [{ id: 'none', type: 'none', params: {}, ...at(20, 0) }]
  const nodes = [...cards]
  const wires = []
  let last = cards[0].id
  cards.slice(1).forEach((card, k) => {
    const id = `j${k + 1}`
    nodes.push({ id, type: 'join', params: {}, ...at(280, k) })
    wires.push({ from: last, to: id, port: 'a' }, { from: card.id, to: id, port: 'b' })
    last = id
  })
  nodes.push({ id: CLAIM, type: CLAIM, params: { name: '' }, ...at(cards.length > 1 ? 540 : 280, 0) })
  wires.push({ from: last, to: CLAIM, port: 'p' })
  return { nodes, wires }
}

/**
 * The cards a run goes through, in order, each with its sentence and whether it is true in the world: the premises,
 * then the conclusion. A card is `right` when it is as a counterexample needs it (a premise true, the conclusion false).
 */
export function claimCards(level, world) {
  const model = builtWorld(world, level.vocab)
  const read = (f) => parse(f, { consts: level.vocab.names })
  return [...level.given.map((f, k) => ({ id: `p${k + 1}`, f, premise: true })), { id: CLAIM, f: level.goal, premise: false }].map((card) => {
    const value = holds(read(card.f), model)
    return { ...card, value, right: card.premise === value }
  })
}

/** Whether a world is a counterexample to the level's inference. */
export const counters = (level, world) => world.size <= (level.maxSize ?? 3) && claimCards(level, world).every((c) => c.right)
