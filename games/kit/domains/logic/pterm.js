// Proof terms (《证明完毕》 chapter 7, Curry–Howard): every proof on the proof board is also a term, the program Lean
// would check. An assumption box is a λ, Apply is application, joining ∧ makes a pair and splitting it projects, the
// sides of ∨ are tagged, a case split eliminates them, ∀ is a function of a thing and ∃ a pair of a witness and a
// proof. This module builds, prints, reads and compares such terms; proof.js gives every
// judgment its term.
//
//   term  { k: 'var', name } | { k: 'lam', x, body } | { k: 'app', f, a } | { k: 'obj', term }   (a thing: a formula's term)
//       | { k: 'pair', a, b } | { k: 'fst', p } | { k: 'snd', p } | { k: 'inl', a } | { k: 'inr', a }
//       | { k: 'cases', p, x, l, y, r }   p.elim (fun x => l) (fun y => r)        (∨ elimination)
//       | { k: 'open', p, x, h, body }    p.elim (fun x h => body)                (∃ elimination)
//       | { k: 'absurd', p }              False.elim p
//       | { k: 'raa', p }                 byContradiction p                       (classical: from ¬¬A, A)
//       | { k: 'rfl' } | { k: 'subst', h, p }   h ▸ p | { k: 'const', name }   (a lemma, by its card's name)
//
// Written terms follow Lean: `fun h => …`, `f a`, `⟨a, b⟩`, `p.1`, `p.2`, `Or.inl a`, `Or.inr b`, `p.elim f g`,
// `False.elim p`, `byContradiction p`, `rfl`, `h ▸ p`.
import { showTerm } from './formula.js'

export const pvar = (name) => ({ k: 'var', name })
export const lam = (x, body) => ({ k: 'lam', x, body })
export const papp = (f, a) => ({ k: 'app', f, a })
export const obj = (term) => ({ k: 'obj', term })
export const pair = (a, b) => ({ k: 'pair', a, b })
export const fst = (p) => ({ k: 'fst', p })
export const snd = (p) => ({ k: 'snd', p })
export const inl = (a) => ({ k: 'inl', a })
export const inr = (a) => ({ k: 'inr', a })
export const cases = (p, x, l, y, r) => ({ k: 'cases', p, x, l, y, r })
export const open = (p, x, h, body) => ({ k: 'open', p, x, h, body })
export const absurd = (p) => ({ k: 'absurd', p })
export const raa = (p) => ({ k: 'raa', p })
export const rfl = { k: 'rfl' }
export const psubst = (h, p) => ({ k: 'subst', h, p })
export const pconst = (name) => ({ k: 'const', name })

/* ---------- printing ---------- */

// Precedence: 0 a λ or ▸ (runs to the end), 1 an application, 2 an atom (a name, a pair, a projection).
function show(t, outer = 0) {
  const wrap = (s, level) => (level < outer ? `(${s})` : s)
  switch (t.k) {
    case 'var': return t.name
    case 'obj': return showTerm(t.term).includes('(') && outer > 1 ? `(${showTerm(t.term)})` : showTerm(t.term)
    case 'const': return t.name
    case 'rfl': return 'rfl'
    case 'lam': {
      // fun a b => …: consecutive λs share one fun.
      const xs = []
      let b = t
      while (b.k === 'lam') { xs.push(b.x); b = b.body }
      return wrap(`fun ${xs.join(' ')} => ${show(b, 0)}`, 0)
    }
    case 'app': return wrap(`${show(t.f, 1)} ${show(t.a, 2)}`, 1)
    case 'pair': return `⟨${show(t.a, 0)}, ${show(t.b, 0)}⟩`
    case 'fst': return `${show(t.p, 2)}.1`
    case 'snd': return `${show(t.p, 2)}.2`
    case 'inl': return wrap(`Or.inl ${show(t.a, 2)}`, 1)
    case 'inr': return wrap(`Or.inr ${show(t.a, 2)}`, 1)
    case 'cases': return wrap(`${show(t.p, 2)}.elim (fun ${t.x} => ${show(t.l, 0)}) (fun ${t.y} => ${show(t.r, 0)})`, 1)
    case 'open': return wrap(`${show(t.p, 2)}.elim (fun ${t.x} ${t.h} => ${show(t.body, 0)})`, 1)
    case 'absurd': return wrap(`False.elim ${show(t.p, 2)}`, 1)
    case 'raa': return wrap(`byContradiction ${show(t.p, 2)}`, 1)
    case 'subst': return wrap(`${show(t.h, 1)} ▸ ${show(t.p, 0)}`, 0)
    default: return '?'
  }
}
/** A term written as Lean would. */
export const printTerm = (t) => (t ? show(t) : '')

/* ---------- reading ---------- */

/** A written term, or throws an Error saying where it stops making sense. */
export function parseTerm(text) {
  const src = text.replace(/\\/g, '').replace(/λ/g, 'fun ').replace(/↦/g, '=>').replace(/<(?![-=])/g, '⟨').replace(/([-=])?>/g, (m, arrow) => (arrow ? m : '⟩'))
  // Lean's qualified names first, then the projections and .elim written after a term, then plain names.
  const tokens = src.match(/fun\b|=>|[⟨⟩(),▸]|(?:Or\.inl|Or\.inr|False\.elim|Classical\.byContradiction)\b|\.(?:1|2|elim)\b|[A-Za-z_][A-Za-z0-9_'₀-₉]*|\S/g) ?? []
  let i = 0
  const peek = () => tokens[i]
  const eat = (t) => {
    if (tokens[i] !== t) throw new Error(`expected ${t} at ${tokens[i] ?? 'the end'}`)
    i++
  }
  const term = () => {
    if (peek() === 'fun') {
      i++
      const xs = []
      while (peek() && peek() !== '=>') xs.push(tokens[i++])
      if (!xs.length) throw new Error('fun needs a name')
      eat('=>')
      const body = term()
      return xs.reduceRight((b, x) => lam(x, b), body)
    }
    const left = application()
    if (peek() === '▸') { i++; return psubst(left, term()) }
    return left
  }
  const startsAtom = (t) => t && (t === '(' || t === '⟨' || /^[A-Za-z_]/.test(t))
  const application = () => {
    const head = postfix()
    const args = []
    while (startsAtom(peek()) && peek() !== 'fun') args.push(postfix())
    while (peek() === 'fun') args.push(term())
    return build(head, args)
  }
  const postfix = () => {
    let t = atom()
    while (/^\.(1|2|elim)$/.test(peek() ?? '')) {
      const p = tokens[i++]
      t = p === '.1' ? fst(t) : p === '.2' ? snd(t) : { k: 'elim', p: t }
    }
    return t
  }
  const atom = () => {
    const t = tokens[i++]
    if (t === '(') { const x = term(); eat(')'); return x }
    if (t === '⟨') { const a = term(); eat(','); const b = term(); eat('⟩'); return pair(a, b) }
    if (t === 'rfl') return rfl
    if (t && /^[A-Za-z_]/.test(t)) return pvar(t)
    throw new Error(`unexpected ${t ?? 'end'}`)
  }
  const out = term()
  if (i < tokens.length) throw new Error(`unexpected ${tokens[i]}`)
  return out
}
// A head and its arguments as a term: Or.inl a, False.elim p, p.elim f g and the like read as their own forms.
function build(head, args) {
  const name = head.k === 'var' ? head.name : null
  const one = (make) => {
    if (!args.length) throw new Error(`${name} needs an argument`)
    return args.slice(1).reduce(papp, make(args[0]))
  }
  if (name === 'Or.inl') return one(inl)
  if (name === 'Or.inr') return one(inr)
  if (name === 'False.elim' || name === 'absurd') return one(absurd)
  if (name === 'byContradiction' || name === 'Classical.byContradiction') return one(raa)
  if (head.k === 'elim') {
    const [f, g] = args
    if (f?.k === 'lam' && g?.k === 'lam') return args.slice(2).reduce(papp, cases(head.p, f.x, f.body, g.x, g.body))
    if (f?.k === 'lam' && f.body.k === 'lam') return args.slice(1).reduce(papp, open(head.p, f.x, f.body.x, f.body.body))
    throw new Error('.elim takes fun x => … twice (or), or fun x h => … once (exists)')
  }
  return args.reduce(papp, head)
}

/* ---------- comparing ---------- */

/** Two terms the same up to the names of what they bind. */
export function alphaEq(a, b) {
  const key = (t, env = new Map(), depth = 0) => {
    const bind = (x) => new Map([...env, [x, `#${depth}`]])
    switch (t.k) {
      case 'var': return env.get(t.name) ?? t.name
      case 'obj': {
        let s = showTerm(t.term)
        for (const [x, b] of env) s = s.replace(new RegExp(`\\b${x.replace(/'/g, "\\'")}\\b`, 'g'), b)
        return s
      }
      case 'lam': return `λ.${key(t.body, bind(t.x), depth + 1)}`
      case 'app': return `(${key(t.f, env, depth)} ${key(t.a, env, depth)})`
      case 'pair': return `<${key(t.a, env, depth)},${key(t.b, env, depth)}>`
      case 'fst': case 'snd': case 'absurd': case 'raa': return `${t.k}(${key(t.p, env, depth)})`
      case 'inl': case 'inr': return `${t.k}(${key(t.a, env, depth)})`
      case 'cases': return `cases(${key(t.p, env, depth)},${key(t.l, bind(t.x), depth + 1)},${key(t.r, bind(t.y), depth + 1)})`
      case 'open': { const e = new Map([...env, [t.x, `#${depth}`], [t.h, `#${depth + 1}`]]); return `open(${key(t.p, env, depth)},${key(t.body, e, depth + 2)})` }
      case 'subst': return `subst(${key(t.h, env, depth)},${key(t.p, env, depth)})`
      default: return t.k === 'const' ? t.name : t.k
    }
  }
  return key(a) === key(b)
}
