// A formula built from chips (《证明完毕》 chapter 4's translations and queries), shown on the shared strip
// (games/kit/strip): the formula is the usual tree (formula.js) with holes left as null; a chip is one piece of it, a
// predicate with a hole per place, a name, a variable, a quantifier with its variable, or a connective with a hole
// per side. Putting a chip in a hole fills it; taking a piece out empties its hole, with everything inside it.
//
//   chip   { key, kind: 'formula' | 'term', group, text, make() }
//   path   the child indices from the root to a node: [] is the root, [1, 0] the first child of its second child
import { all, atom, bin, ex, fn, not, tvar } from './formula.js'
import { holeTree } from '../../strip/tree.js'

const CONNECTIVES = ['¬', '∧', '∨', '→']
const QUANTIFIERS = ['∀', '∃']

/** The children of a node, each with the kind of thing its hole takes. */
export function kidsOf(node) {
  if (!node || node.t) return []
  switch (node.op) {
    case 'atom': return node.args.map((a) => ({ kind: 'term', value: a }))
    case '¬': return [{ kind: 'formula', value: node.a }]
    case '∀': case '∃': return [{ kind: 'formula', value: node.body }]
    default: return [{ kind: 'formula', value: node.a }, { kind: 'formula', value: node.b }]
  }
}
// The node with its child k replaced.
function withKid(node, k, value) {
  switch (node.op) {
    case 'atom': return { ...node, args: node.args.map((a, i) => (i === k ? value : a)) }
    case '¬': return { ...node, a: value }
    case '∀': case '∃': return { ...node, body: value }
    default: return k === 0 ? { ...node, a: value } : { ...node, b: value }
  }
}

const tree = holeTree({ kids: kidsOf, withKid, root: 'formula' })
export const { nodeAt, setAt, holesOf, kindAt, complete } = tree

const PREC = { '→': 1, '∨': 2, '∧': 3 }
/**
 * What a connective `op` put after a whole sentence takes as its first side: the last whole sentence, widened as the
 * written formula would read (¬ and a tighter connective are taken in; → groups to the right, ∧ and ∨ to the left; a
 * quantifier reaches to the end, so it is never climbed out of). Null when the line ends with a box.
 */
export function joinsOnto(root, op) {
  const last = tree.trailing(root, 'formula')
  if (!last) return null
  return tree.outward(root, last, (parent) => parent.op === '¬' || (PREC[parent.op] !== undefined && (PREC[parent.op] > PREC[op] || (parent.op === op && op !== '→'))))
}

/**
 * The chips a sentence is built from: the level's predicates and names, the quantifiers the course has introduced
 * (`notation.symbols`) with each variable, those variables, and the connectives. A query keeps x free, so it has
 * variables even before a quantifier is in hand.
 */
export function chipsOf(level) {
  // In a fixed order, the same for every task of a level, so the order gives nothing away.
  const preds = [...level.vocab.preds].sort(([a], [b]) => (a < b ? -1 : 1))
  const order = level.consts ?? []
  const consts = [...level.vocab.consts].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  const quantifiers = QUANTIFIERS.filter((q) => level.notation.symbols.includes(q))
  const vars = level.kind === 'query' ? ['x', 'y', 'z'] : quantifiers.length ? ['x', 'y'] : []
  return [
    ...preds.map(([p, n]) => ({ key: `P:${p}`, kind: 'formula', group: 'pred', pred: p, places: n, make: () => atom(p, Array(n).fill(null)) })),
    ...consts.map((c) => ({ key: `c:${c}`, kind: 'term', group: 'name', name: c, make: () => fn(c) })),
    ...vars.map((v) => ({ key: `v:${v}`, kind: 'term', group: 'var', text: v, make: () => tvar(v) })),
    ...quantifiers.flatMap((q) => vars.filter((v) => level.kind !== 'query' || v !== 'x').map((v) => ({ key: `${q}${v}`, kind: 'formula', group: 'quant', text: `${q}${v}.`, make: () => (q === '∀' ? all : ex)(v, null) }))),
    // A connective between two sentences (`leads`) can take the sentence the line ends with as its first.
    ...CONNECTIVES.map((c) => ({ key: c, kind: 'formula', group: 'conn', text: c, leads: c !== '¬', make: () => (c === '¬' ? not(null) : bin(c, null, null)) })),
  ]
}

/** The chip a node was made from. */
export function chipKeyOf(node) {
  if (node.t === 'var') return `v:${node.name}`
  if (node.t === 'fn') return `c:${node.f}`
  if (node.op === 'atom') return `P:${node.pred}`
  if (node.op === '∀' || node.op === '∃') return `${node.op}${node.v}`
  return node.op
}

/** The chips a whole formula needs that are not on offer (none: it can be built). */
export function missingChips(formula, chips) {
  const offered = new Set(chips.map((c) => c.key))
  const walk = (node) => [chipKeyOf(node), ...kidsOf(node).flatMap((k) => walk(k.value))]
  return [...new Set(walk(formula))].filter((k) => !offered.has(k))
}
