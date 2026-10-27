// Proof terms (《证明完毕》 chapter 6, Curry–Howard): every proof on the proof board is also a term, the program Lean
// would check. An assumption box is a λ, Apply is application, joining ∧ makes a pair and splitting it projects, the
// sides of ∨ are tagged, a case split eliminates them, ∀ is a function of a thing and ∃ a pair of a witness and a
// proof. This module builds, prints, reads, compares, reduces and type-checks such terms; proof.js gives every
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
import { PartError } from '../../engine/circuit.js'
import { BOT, bin, freeVars, same, showTerm, subst, tvar } from './formula.js'
import { say } from './notation.js'

const T = (zh, en) => ({ zh, en })
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

/* ---------- comparing and reducing ---------- */

let fresh = 0
const freshName = (x) => `${x.replace(/'+$/, '')}'${++fresh}`

// The names a term uses free (things and hypotheses alike).
export function freeIn(t, out = new Set(), bound = new Set()) {
  const go = (u, b) => freeIn(u, out, b)
  switch (t.k) {
    case 'var': if (!bound.has(t.name)) out.add(t.name); break
    case 'obj': for (const v of freeVars({ op: 'atom', pred: '_', args: [t.term] })) if (!bound.has(v)) out.add(v); break
    case 'lam': go(t.body, new Set([...bound, t.x])); break
    case 'app': go(t.f, bound); go(t.a, bound); break
    case 'pair': go(t.a, bound); go(t.b, bound); break
    case 'fst': case 'snd': case 'absurd': case 'raa': go(t.p, bound); break
    case 'inl': case 'inr': go(t.a, bound); break
    case 'cases': go(t.p, bound); go(t.l, new Set([...bound, t.x])); go(t.r, new Set([...bound, t.y])); break
    case 'open': go(t.p, bound); go(t.body, new Set([...bound, t.x, t.h])); break
    case 'subst': go(t.h, bound); go(t.p, bound); break
    default:
  }
  return out
}

// t with the name x replaced by the term s (a thing for x, as an obj, also reaches inside formulas' terms).
function substT(t, x, s) {
  const avoid = freeIn(s)
  // A binder that would capture a name of s is renamed first.
  const under = (y, body) => {
    if (y === x) return [y, body, false]
    if (avoid.has(y)) { const z = freshName(y); return [z, rename(body, y, z), true] }
    return [y, body, true]
  }
  switch (t.k) {
    case 'var': return t.name === x ? s : t
    case 'obj': return s.k === 'obj' ? obj(termSubst(t.term, x, s.term)) : s.k === 'var' ? obj(termSubst(t.term, x, tvar(s.name))) : t
    case 'lam': { const [y, b, go] = under(t.x, t.body); return lam(y, go ? substT(b, x, s) : b) }
    case 'app': return papp(substT(t.f, x, s), substT(t.a, x, s))
    case 'pair': return pair(substT(t.a, x, s), substT(t.b, x, s))
    case 'fst': return fst(substT(t.p, x, s))
    case 'snd': return snd(substT(t.p, x, s))
    case 'inl': return inl(substT(t.a, x, s))
    case 'inr': return inr(substT(t.a, x, s))
    case 'absurd': return absurd(substT(t.p, x, s))
    case 'raa': return raa(substT(t.p, x, s))
    case 'subst': return psubst(substT(t.h, x, s), substT(t.p, x, s))
    case 'cases': {
      const [y1, l, g1] = under(t.x, t.l)
      const [y2, r, g2] = under(t.y, t.r)
      return cases(substT(t.p, x, s), y1, g1 ? substT(l, x, s) : l, y2, g2 ? substT(r, x, s) : r)
    }
    case 'open': {
      const [y, b1, g1] = under(t.x, t.body)
      const [h, b2, g2] = g1 ? under(t.h, b1) : [t.h, b1, false]
      return open(substT(t.p, x, s), y, h, g1 && g2 ? substT(b2, x, s) : b2)
    }
    default: return t
  }
}
const rename = (t, y, z) => substT(t, y, pvar(z))
// A formula's term with the variable x replaced by the term u.
const termSubst = (term, x, u) => subst({ op: 'atom', pred: '_', args: [term] }, x, u).args[0]

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

/**
 * A term with its detours taken out: a λ applied (β), a projection of a pair, a case split of a tagged side, an ∃ opened
 * on a pair; `unfold(name)` may give a lemma's own term, so a lemma used is unfolded too. Stops after `limit` steps.
 */
export function normalize(t, { unfold = () => null, limit = 500 } = {}) {
  let steps = 0
  const go = (u) => {
    if (++steps > limit) return u
    switch (u.k) {
      case 'const': { const body = unfold(u.name); return body ? go(body) : u }
      case 'app': {
        const f = go(u.f)
        const a = go(u.a)
        return f.k === 'lam' ? go(substT(f.body, f.x, a)) : papp(f, a)
      }
      case 'lam': return lam(u.x, go(u.body))
      case 'pair': return pair(go(u.a), go(u.b))
      case 'fst': { const p = go(u.p); return p.k === 'pair' ? p.a : fst(p) }
      case 'snd': { const p = go(u.p); return p.k === 'pair' ? p.b : snd(p) }
      case 'inl': return inl(go(u.a))
      case 'inr': return inr(go(u.a))
      case 'cases': {
        const p = go(u.p)
        if (p.k === 'inl') return go(substT(u.l, u.x, p.a))
        if (p.k === 'inr') return go(substT(u.r, u.y, p.a))
        return cases(p, u.x, go(u.l), u.y, go(u.r))
      }
      case 'open': {
        const p = go(u.p)
        if (p.k === 'pair') return go(substT(substT(u.body, u.x, p.a), u.h, p.b))
        return open(p, u.x, u.h, go(u.body))
      }
      case 'absurd': return absurd(go(u.p))
      case 'raa': return raa(go(u.p))
      case 'subst': return psubst(go(u.h), go(u.p))
      default: return u
    }
  }
  return go(t)
}
/** Is a term free of detours? */
export const isNormal = (t, opts) => alphaEq(normalize(t, opts), t)

/* ---------- type checking ---------- */

const asImp = (f) => (f.op === '¬' ? bin('→', f.a, BOT) : f)
const asAnd = (f) => (f.op === '↔' ? bin('∧', bin('→', f.a, f.b), bin('→', f.b, f.a)) : f)

/**
 * Check a term against a formula, in a context of hypotheses (name → formula) and the level's names of things
 * (`consts`). A lemma is a name applied to proofs of its premises: `lemma(name, [their sentences])` gives what it
 * proves, or null when it is no lemma or they do not fit. Returns '' or what is wrong ({ zh, en }, in the level's
 * notation).
 */
export function checkTerm(term, goal, { hyps = {}, consts = [], notation = null, lemma = () => null } = {}) {
  const sayF = (f) => say(f, notation)
  const err = (zh, en) => { throw new PartError(T(zh, en)) }
  const hypsOf = (ctx) => [...ctx.values()].filter((v) => v.f)
  // A name standing for a thing: a constant of the level, or a thing bound by a λ or a witness.
  const thingOf = (t, ctx) => {
    if (t.k === 'obj') return t.term
    if (t.k === 'var' && !ctx.get(t.name)?.f) return consts.includes(t.name) ? { t: 'fn', f: t.name, args: [] } : tvar(t.name)
    return err(`「${printTerm(t)}」应该是一样东西`, `“${printTerm(t)}” should be a thing`)
  }
  const unused = (x, ctx, ...fs) => {
    const clash = [...hypsOf(ctx).map((h) => h.f), ...fs].some((f) => freeVars(f).has(x))
    if (clash) err(`${x} 已经在别处用过了，换一个名字`, `${x} is already in use elsewhere: pick another name`)
  }
  // A lemma used: its name, not otherwise known, applied to every premise it has.
  const lemmaUse = (t, ctx) => {
    const args = []
    let head = t
    while (head.k === 'app') { args.unshift(head.a); head = head.f }
    if (head.k !== 'var' || ctx.get(head.name) || lemma(head.name, null) === null) return null
    const f = lemma(head.name, args.map((a) => infer(a, ctx)))
    if (f === null) err(`「${head.name}」用在这些证明上对不上它的前提`, `“${head.name}” used on these proofs does not fit its premises`)
    return f
  }
  const infer = (t, ctx) => {
    switch (t.k) {
      case 'var': {
        const h = ctx.get(t.name)
        if (h?.f) return h.f
        const l = lemmaUse(t, ctx)
        if (l) return l
        return err(`不认识「${t.name}」：它不是哪一条已知`, `“${t.name}” is not anything known`)
      }
      case 'app': {
        const l = lemmaUse(t, ctx)
        if (l) return l
        const F = asImp(infer(t.f, ctx))
        if (F.op === '→') { check(t.a, F.a, ctx); return F.b }
        if (F.op === '∀') return subst(F.body, F.v, thingOf(t.a, ctx))
        return err(`「${printTerm(t.f)}」证的是「${sayF(F).zh}」，不是一个能套用的东西`, `“${printTerm(t.f)}” proves “${sayF(F).en}”, not something to apply`)
      }
      case 'fst': case 'snd': {
        const F = asAnd(infer(t.p, ctx))
        if (F.op !== '∧') return err(`「${printTerm(t.p)}」证的不是一句「…并且…」，取不出 ${t.k === 'fst' ? '.1' : '.2'}`, `“${printTerm(t.p)}” does not prove an “and”, so it has no ${t.k === 'fst' ? '.1' : '.2'}`)
        return t.k === 'fst' ? F.a : F.b
      }
      default: return err(`「${printTerm(t)}」单看不出证的是什么：要放在知道要证什么的地方`, `“${printTerm(t)}” alone does not say what it proves: put it where what is to be proved is known`)
    }
  }
  const check = (t, A, ctx) => {
    const F = asImp(A)
    switch (t.k) {
      case 'lam':
        if (F.op === '→') return check(t.body, F.b, new Map([...ctx, [t.x, { f: F.a }]]))
        if (F.op === '∀') { unused(t.x, ctx, A); return check(t.body, subst(F.body, F.v, tvar(t.x)), new Map([...ctx, [t.x, { thing: true }]])) }
        return err(`fun 证的是「若…则…」或「对所有」，这里要证「${sayF(A).zh}」`, `fun proves an “if … then …” or a “for all”; here it must prove “${sayF(A).en}”`)
      case 'pair': {
        const G = asAnd(A)
        if (G.op === '∧') { check(t.a, G.a, ctx); return check(t.b, G.b, ctx) }
        if (G.op === '∃') return check(t.b, subst(G.body, G.v, thingOf(t.a, ctx)), ctx)
        return err(`⟨…, …⟩ 证的是「…并且…」或「存在」，这里要证「${sayF(A).zh}」`, `⟨…, …⟩ proves an “and” or a “there is”; here it must prove “${sayF(A).en}”`)
      }
      case 'inl': case 'inr':
        if (A.op !== '∨') return err(`${t.k === 'inl' ? 'Or.inl' : 'Or.inr'} 证的是「…或者…」，这里要证「${sayF(A).zh}」`, `${t.k === 'inl' ? 'Or.inl' : 'Or.inr'} proves an “or”; here it must prove “${sayF(A).en}”`)
        return check(t.a, t.k === 'inl' ? A.a : A.b, ctx)
      case 'cases': {
        const P = infer(t.p, ctx)
        if (P.op !== '∨') return err(`「${printTerm(t.p)}」证的不是「…或者…」，不能分情况`, `“${printTerm(t.p)}” does not prove an “or”, so there are no cases`)
        check(t.l, A, new Map([...ctx, [t.x, { f: P.a }]]))
        return check(t.r, A, new Map([...ctx, [t.y, { f: P.b }]]))
      }
      case 'open': {
        const P = infer(t.p, ctx)
        if (P.op !== '∃') return err(`「${printTerm(t.p)}」证的不是「存在…」，拿不出那一个`, `“${printTerm(t.p)}” does not prove a “there is”, so there is nothing to take out`)
        unused(t.x, ctx, A, P)
        return check(t.body, A, new Map([...ctx, [t.x, { thing: true }], [t.h, { f: subst(P.body, P.v, tvar(t.x)) }]]))
      }
      case 'absurd': return check(t.p, BOT, ctx)
      case 'raa': return check(t.p, { op: '¬', a: { op: '¬', a: A } }, ctx)
      case 'rfl':
        if (A.op === 'atom' && A.pred === '=' && showTerm(A.args[0]) === showTerm(A.args[1])) return undefined
        return err(`rfl 只证两边一样的等式，这里要证「${sayF(A).zh}」`, `rfl proves only an equation with the same on both sides; here it must prove “${sayF(A).en}”`)
      default: {
        const B = infer(t, ctx)
        if (!same(B, A)) err(`「${printTerm(t)}」证的是「${sayF(B).zh}」，这里要证「${sayF(A).zh}」`, `“${printTerm(t)}” proves “${sayF(B).en}”; here it must prove “${sayF(A).en}”`)
        return undefined
      }
    }
  }
  try {
    check(term, goal, new Map(Object.entries(hyps).map(([name, f]) => [name, { f }])))
    return ''
  } catch (e) {
    if (e instanceof PartError) return e.label
    throw e
  }
}
