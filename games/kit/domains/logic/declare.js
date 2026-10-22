// Connectives declared by how they are made, the way Lean declares an inductive type: a connective lists its ways to
// be made (its constructors), each naming which of its two sides it needs, and every rule follows from that alone.
//
//   each constructor   an introduction rule: its inputs are the sides it needs; a side it does not need is chosen on
//                      the card (from the left side alone, “left ∨ anything”)
//   all of them        one elimination rule (the recursor): wire in the connective; a box per constructor assumes the
//                      sides that constructor needed, and when every box proves the same C, it gives C. With no
//                      constructor there is no box, and C is chosen on the card: from it, anything.
//
// The truth function is the connective's gate (gates.js, chapter 1): it is what a designed rule is checked against
// (rules.js), not where the rules come from.
import { framePart } from '../../circuit/frames.js'
import { BOT, and, or, same } from './formula.js'
import { T, assumed, fail, hypId, need, param, proved, sayIn, union, without } from './judgment.js'

export const SIDES = { a: T('左边', 'left side'), b: T('右边', 'right side') }

/** The connectives that can be declared: symbol, name, sides, truth function, and their constructors. */
export const CONNECTIVES = {
  and: { op: '∧', name: T('与', 'and'), sides: ['a', 'b'], value: (a, b) => a && b, ctors: [['a', 'b']], make: and },
  or: { op: '∨', name: T('或', 'or'), sides: ['a', 'b'], value: (a, b) => a || b, ctors: [['a'], ['b']], make: or },
  bot: { op: '⊥', name: T('假', 'false'), sides: [], value: () => false, ctors: [], make: () => BOT },
}

/** The rule types a connective's declaration gives: introductions (one per constructor), then its elimination. */
export const introOf = (id, k) => `${id}In${k}`
export const casesOf = (id) => `${id}Cases`
export const declaredTypes = (id) => [...CONNECTIVES[id].ctors.map((_, k) => introOf(id, k)), casesOf(id)]
const regionOf = (k) => `c${k}`

function intro(conn, fields) {
  const missing = conn.sides.filter((s) => !fields.includes(s))
  return {
    inputs: fields,
    params: missing,
    eval: (ins, node, ctx) => {
      const side = (s) => (fields.includes(s) ? ins[s].formula : param(node, s, ctx))
      return proved(conn.make(side('a'), side('b')), union(...fields.map((s) => ins[s])))
    },
  }
}

function cases(conn) {
  const shape = T(`一句「…${conn.op}…」`, `an “… ${conn.op} …”`)
  return {
    ...framePart(['major'], conn.ctors.map((fields, k) => ({ name: regionOf(k), opens: fields }))),
    params: conn.ctors.length ? [] : ['C'],
    eval: (ins, node, ctx, key) => {
      const major = ins.major
      if (major.formula.op !== conn.op) throw need(ctx, conn.ctors.length ? shape : T(`矛盾 ${conn.op}`, `a contradiction ${conn.op}`), major.formula)
      // What a box assumes: the side its constructor needed, as the connective it got has it.
      if (key) return assumed(node, key, major.formula[key.split('.')[1]])
      if (!conn.ctors.length) return proved(param(node, 'C', ctx), major.hyps)
      const bodies = conn.ctors.map((_, k) => ins[regionOf(k)])
      const other = bodies.find((b) => !same(b.formula, bodies[0].formula))
      if (other) { const [a, b] = [sayIn(ctx, bodies[0].formula), sayIn(ctx, other.formula)]; throw fail(`每个框要证出同一句话，现在是：${a.zh}；${b.zh}`, `Every box must prove the same sentence; they prove: ${a.en}; ${b.en}`) }
      const closed = bodies.map((b, k) => conn.ctors[k].reduce((hyps, s) => without(hyps, hypId(node, `${regionOf(k)}.${s}`)), b.hyps))
      return proved(bodies[0].formula, new Map([...major.hyps, ...closed.flatMap((h) => [...h])]))
    },
  }
}

/** Every declared connective's rules, by type. */
export const DECLARED = Object.fromEntries(Object.entries(CONNECTIVES).flatMap(([id, conn]) => [
  ...conn.ctors.map((fields, k) => [introOf(id, k), intro(conn, fields)]),
  [casesOf(id), cases(conn)],
]))
