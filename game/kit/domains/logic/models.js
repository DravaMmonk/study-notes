// Countermodels (《证明完毕》): when a goal does not follow, a small world where the premises hold and the goal fails.
// Propositional formulas are checked over every row of their truth table; first-order ones over every structure on a
// domain of 1, 2 or 3 elements, as long as there are not too many of them to try. A countermodel proves the goal
// unprovable (the rules are sound); finding none on small domains proves nothing, and `searched` says how far it went.
import { signature } from './formula.js'

/** The value of a formula in a structure { domain: [k], preds: { P: Set('a,b') | boolean }, fns: { f: Map('a' → k) } }. */
export function holds(f, m, env = {}) {
  const term = (t) => (t.t === 'var' ? env[t.name] : t.args.length ? m.fns[t.f].get(t.args.map(term).join(',')) : m.fns[t.f].get(''))
  switch (f.op) {
    case 'atom':
      if (f.pred === '=') return term(f.args[0]) === term(f.args[1])
      return f.args.length ? m.preds[f.pred].has(f.args.map(term).join(',')) : m.preds[f.pred]
    case '⊥': return false
    case '¬': return !holds(f.a, m, env)
    case '∧': return holds(f.a, m, env) && holds(f.b, m, env)
    case '∨': return holds(f.a, m, env) || holds(f.b, m, env)
    case '→': return !holds(f.a, m, env) || holds(f.b, m, env)
    case '↔': return holds(f.a, m, env) === holds(f.b, m, env)
    // For every sentence R: R true and R false (a sentence's value is all a structure sees of it).
    case '∀': return f.prop ? [true, false].every((b) => holds(f.body, { ...m, preds: { ...m.preds, [f.v]: b } }, env)) : m.domain.every((d) => holds(f.body, m, { ...env, [f.v]: d }))
    case '∃': return m.domain.some((d) => holds(f.body, m, { ...env, [f.v]: d }))
    default: throw new Error(`no value for ${f.op}`)
  }
}

const tuples = (domain, n) => (n === 0 ? [[]] : tuples(domain, n - 1).flatMap((t) => domain.map((d) => [...t, d])))

// Every structure on `domain` for the signature, lazily; stops after `limit`.
function* structures(domain, { preds, fns }, limit) {
  const slots = []
  for (const [p, n] of preds) slots.push({ kind: 'pred', name: p, keys: tuples(domain, n).map((t) => t.join(',')), choices: 2 })
  for (const [f, n] of fns) for (const key of tuples(domain, n).map((t) => t.join(','))) slots.push({ kind: 'fn', name: f, keys: [key], choices: domain.length })
  const sizes = slots.map((s) => (s.kind === 'pred' ? 2 ** s.keys.length : s.choices))
  const total = sizes.reduce((a, b) => a * b, 1)
  if (total > limit) return
  for (let n = 0; n < total; n++) {
    let rest = n
    const m = { domain, preds: {}, fns: {} }
    slots.forEach((s, k) => {
      const pick = rest % sizes[k]
      rest = Math.floor(rest / sizes[k])
      if (s.kind === 'pred') {
        if (!s.keys[0] && s.keys.length === 1) m.preds[s.name] = Boolean(pick)
        else m.preds[s.name] = new Set(s.keys.filter((_, i) => (pick >> i) & 1))
      } else {
        m.fns[s.name] ??= new Map()
        m.fns[s.name].set(s.keys[0], domain[pick])
      }
    })
    yield m
  }
}

/**
 * A world where every premise holds and the goal does not: { model, size } or null. `searched` (on the result's
 * absence, use countermodelSearch) lists the domain sizes tried in full.
 */
export function countermodelSearch(premises, goal, { maxSize = 3, limit = 1 << 18 } = {}) {
  const sig = signature([...premises, goal])
  const searched = []
  for (let size = 1; size <= maxSize; size++) {
    const domain = Array.from({ length: size }, (_, k) => k)
    let tried = false
    for (const m of structures(domain, sig, limit)) {
      tried = true
      if (premises.every((p) => holds(p, m)) && !holds(goal, m)) return { model: m, size, searched }
    }
    // A propositional signature has one size worth trying.
    if (tried) searched.push(size)
    if (!sig.fns.size && [...sig.preds.values()].every((n) => n === 0)) break
  }
  return { model: null, searched }
}

export const countermodel = (premises, goal, options) => countermodelSearch(premises, goal, options).model

/** A model, written for the player: the domain, each letter's truth or each predicate's extent, each function. */
export function describe(m) {
  const lines = []
  if (m.domain.length > 1 || Object.values(m.preds).some((v) => v instanceof Set)) lines.push(`{ ${m.domain.join(', ')} }`)
  for (const [p, v] of Object.entries(m.preds)) lines.push(v instanceof Set ? `${p} = { ${[...v].map((k) => (k.includes(',') ? `(${k})` : k)).join(', ')} }` : `${p} = ${v ? '真' : '假'}`)
  for (const [f, map] of Object.entries(m.fns)) lines.push([...map].map(([k, v]) => `${f}${k ? `(${k})` : ''} = ${v}`).join(', '))
  return lines
}
