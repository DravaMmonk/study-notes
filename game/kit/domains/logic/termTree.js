// A proof term built from chips (《证明完毕》 chapter 7's term writing), shown on the shared strip (games/kit/strip):
// the term is the usual tree (pterm.js) with holes left as null. A chip is one piece of it: a name (a premise, or one
// a fun or a case split has bound), or a form with holes: fun _ => □, □ □ (application), ⟨□, □⟩, □.1, □.2, Or.inl □,
// Or.inr □, □.elim (fun _ => □) (fun _ => □), False.elim □, □.elim (fun _ _ => □) (∃ taken out). A name is a premise's, a
// thing's (the level's names of things), a lemma's (used as a function of its premises) or one a form bound. A form that binds a name takes the first letter free in
// the term, so a name is never bound twice.
import { holeTree } from '../../strip/tree.js'
import { absurd, cases, fst, inl, inr, lam, open, pair, papp, psubst, pvar, rfl, snd } from './pterm.js'

const T = (zh, en) => ({ zh, en })
const LETTERS = 'abcdefgjk'.split('')
const KID = { lam: ['body'], app: ['f', 'a'], pair: ['a', 'b'], fst: ['p'], snd: ['p'], inl: ['a'], inr: ['a'], cases: ['p', 'l', 'r'], absurd: ['p'], open: ['p', 'body'], subst: ['h', 'p'] }

const kids = (node) => (KID[node.k] ?? []).map((field) => ({ kind: 'term', value: node[field] }))
const withKid = (node, k, value) => ({ ...node, [KID[node.k][k]]: value })
const tree = holeTree({ kids, withKid, root: 'term' })
export const { nodeAt, setAt, holesOf, complete } = tree

/**
 * What a form that starts with its box takes when put after a whole term: the last term, and for an application the
 * whole application it ends (p q then □ □ is p q □, application groups to the left). Null when the line ends with a box.
 */
export function joinsOnto(root, key) {
  const last = tree.trailing(root, 'term')
  if (!last) return null
  return key === 'app' ? tree.outward(root, last, (parent, k) => parent.k === 'app' && k === 1) : last
}

/** Every name the term binds. */
export function boundIn(node, out = []) {
  if (!node) return out
  if (node.k === 'lam') out.push(node.x)
  if (node.k === 'cases') out.push(node.x, node.y)
  if (node.k === 'open') out.push(node.x, node.h)
  for (const kid of kids(node)) boundIn(kid.value, out)
  return out
}
const fresh = (tree, n = 1) => LETTERS.filter((x) => !boundIn(tree).includes(x)).slice(0, n)

/** The forms a term is built from, in the order the chapter brings them in; one that starts with its first box (`leads`) can take the term the line ends with. */
export const FORMS = [
  { key: 'fun', text: 'fun _ => □', sub: T('造一个函数（框）', 'make a function (a box)'), make: (tree) => lam(fresh(tree)[0], null) },
  { key: 'app', leads: true, text: '□ □', sub: T('应用（套用）', 'apply'), make: () => papp(null, null) },
  { key: 'pair', text: '⟨□, □⟩', sub: T('一对', 'a pair'), make: () => pair(null, null) },
  { key: 'fst', leads: true, text: '□.1', sub: T('左一半', 'left half'), make: () => fst(null) },
  { key: 'snd', leads: true, text: '□.2', sub: T('右一半', 'right half'), make: () => snd(null) },
  { key: 'inl', text: 'Or.inl □', sub: T('是左边', 'the left one'), make: () => inl(null) },
  { key: 'inr', text: 'Or.inr □', sub: T('是右边', 'the right one'), make: () => inr(null) },
  { key: 'elim', leads: true, text: '□.elim (fun _ => □) (fun _ => □)', sub: T('分情况', 'cases'), make: (tree) => { const [x, y] = fresh(tree, 2); return cases(null, x, null, y, null) } },
  { key: 'absurd', text: 'False.elim □', sub: T('矛盾推出一切', 'from ⊥, anything'), make: () => absurd(null) },
  { key: 'open', leads: true, text: '□.elim (fun _ _ => □)', sub: T('存在实例化', 'take the one there is'), make: (tree) => { const [x, h] = fresh(tree, 2); return open(null, x, h, null) } },
  { key: 'rfl', text: 'rfl', sub: T('两边一样', 'both sides alike'), make: () => rfl },
  { key: 'subst', leads: true, text: '□ ▸ □', sub: T('等量代换', 'substitute'), make: () => psubst(null, null) },
]
// The forms a strip offers unless its level says (the equality chapter adds rfl and ▸).
export const BASIC = ['fun', 'app', 'pair', 'fst', 'snd', 'inl', 'inr', 'elim', 'absurd', 'open']

/** The chips of a proof term: the names in scope (premises, assumptions), those the term binds so far, the forms. */
export function chipsOf(scope, tree, forms = BASIC) {
  const names = [...scope, ...boundIn(tree)]
  return [...names.map((name) => ({ key: `v:${name}`, group: 'name', text: name, make: () => pvar(name) })), ...FORMS.filter((f) => forms.includes(f.key)).map((f) => ({ ...f, group: 'form' }))]
}

/** The forms a whole term uses that no chip makes (none: it can be built). */
export function missingForms(term, forms = BASIC) {
  const kinds = { fun: 'lam', elim: 'cases' }
  const known = new Set(['var', ...forms.map((k) => kinds[k] ?? k)])
  const walk = (node) => [node.k, ...kids(node).flatMap((kid) => walk(kid.value))]
  return [...new Set(walk(term))].filter((k) => !known.has(k))
}

/**
 * The term as it reads (Lean's way), for the strip: each piece its own words, a box for every empty place. A piece
 * that is not a name, a pair or a projection keeps brackets where it is an argument or what is projected.
 */
export function segmentOf(node, path = [], bracket = false) {
  const key = ['r', ...path].join('.')
  if (!node) return { hole: key, label: T('证明项', 'proof term') }
  const piece = (family, parts) => ({ piece: key, family, parts: bracket ? ['(', ...parts, ')'] : parts })
  const atomic = (n) => !n || ['var', 'pair', 'fst', 'snd'].includes(n.k)
  const kid = (k, tight) => {
    const value = kids(node)[k].value
    return segmentOf(value, [...path, k], tight && !atomic(value))
  }
  switch (node.k) {
    case 'var': return piece('name', [node.name])
    case 'lam': return piece('fun', [`fun ${node.x} => `, kid(0)])
    // The function of an application may itself be one (p q r); anything else in it keeps its brackets.
    case 'app': return piece('app', [segmentOf(node.f, [...path, 0], Boolean(node.f) && !atomic(node.f) && node.f.k !== 'app'), ' ', kid(1, true)])
    case 'pair': return piece('pair', ['⟨', kid(0), ', ', kid(1), '⟩'])
    case 'fst': return piece('pair', [kid(0, true), '.1'])
    case 'snd': return piece('pair', [kid(0, true), '.2'])
    case 'inl': return piece('or', ['Or.inl ', kid(0, true)])
    case 'inr': return piece('or', ['Or.inr ', kid(0, true)])
    case 'cases': return piece('or', [kid(0, true), `.elim (fun ${node.x} => `, kid(1), `) (fun ${node.y} => `, kid(2), ')'])
    case 'absurd': return piece('absurd', ['False.elim ', kid(0, true)])
    case 'open': return piece('or', [kid(0, true), `.elim (fun ${node.x} ${node.h} => `, kid(1), ')'])
    case 'rfl': return piece('name', ['rfl'])
    // An application binds tighter than ▸: addZero m ▸ v.
    case 'subst': return piece('app', [segmentOf(node.h, [...path, 0], Boolean(node.h) && !atomic(node.h) && node.h.k !== 'app'), ' ▸ ', kid(1)])
    default: return piece('name', ['?'])
  }
}
