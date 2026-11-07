// Gradients through a board (games/DESIGN.md 6): a run with a tape on ctx records every engine resource it calls, so
// a domain can train the parameters a board holds by working back from a loss.
//
// The tape numbers values, not by what they are (two equal numbers are not the same value) but by where they came
// from: a board's run (circuit.js) passes each card the numbers of the values on its inputs (`tape.ins`), a part's
// expression (parts/expr.js evaluateTaped) numbers each resource it calls, and the card's value takes the number of
// what its expression returns (`tape.last`). A packed part runs its circuit with its inputs' numbers bound to its
// sources, so a gradient flows through the player's own circuit inside.
//
//   new Tape()                      a fresh tape; put it on a run's ctx (ctx.tape)
//   tape.leaf(key, value) → id      a parameter: a value the training may change, under the key it is saved by
//   tape.record(entry) → id         a resource's call: { op, args, ids, named, out } (ids: each argument's number or null)
//   backward(tape, id, seed, rules) → Map(id → gradient)
//       rules: { grad(op, g, entry) → [gradient for each argument, or null], add(a, b), zero?(value) }
//       Every entry reached from `id` gets its gradient; a parameter's is read by its leaf id (tape.leaves).
//
// A resource without a rule passes no gradient: a board that trains through one learns nothing there, which the
// domain's training reports rather than hides.

export class Tape {
  constructor() {
    this.entries = []
    this.leaves = new Map()
    this.ins = {}
    this.last = null
    this.node = null
  }

  /** A parameter: one leaf per key (a card's id), the same number each time the run reaches it. */
  leaf(key, value) {
    if (this.leaves.has(key)) return this.leaves.get(key).id
    const id = this.entries.length
    this.entries.push({ leaf: key, out: value, ids: [] })
    this.leaves.set(key, { id, value })
    return id
  }

  record(entry) {
    this.entries.push(entry)
    return this.entries.length - 1
  }
}

/** Gradients of the value numbered `id` (seeded with `seed`, its own gradient) with respect to every value before it. */
export function backward(tape, id, seed, rules) {
  const grads = new Map([[id, seed]])
  for (let k = id; k >= 0; k--) {
    const g = grads.get(k)
    if (g === undefined) continue
    const entry = tape.entries[k]
    if (entry.leaf !== undefined || !entry.ids.some((x) => x !== null)) continue
    const parts = rules.grad(entry.op, g, entry)
    if (!parts) continue
    entry.ids.forEach((from, i) => {
      if (from === null || parts[i] === null || parts[i] === undefined) return
      grads.set(from, grads.has(from) ? rules.add(grads.get(from), parts[i]) : parts[i])
    })
  }
  return grads
}
