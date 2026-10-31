// Formulas and terms of the logic domain (《证明完毕》), as plain trees:
//
//   formula  { op: 'atom', pred, args: [term] }   P, Q(x), R(x, f(y)); a proposition letter is an atom with no args
//            { op: '⊥' }
//            { op: '¬', a }                        ¬A, shown as itself but meaning A → ⊥ to the rules
//            { op: '∧' | '∨' | '→' | '↔', a, b }
//            { op: '∀' | '∃', v, body }            v: a variable's name
//            { op: '∀', v, prop: true, body }      ∀R. …: for every sentence R (v upper-case), R an atom in the body
//            { op: 'meta', name, args? }           a schematic letter in a lemma (A, B, C…), bound by matching; or a
//                                                  rule's metavariable ?A, ?P(x) (schematic.js), with the things it
//                                                  is about
//   term     { t: 'var', name } | { t: 'fn', f, args: [term] }   a constant is a function with no args; a variable
//            named ?t is a rule's metavariable for a thing
//            { t: '=', … } does not exist: equality is the atom '='(s, t), shown s = t
//
// parse() reads the notation the game shows (and ASCII: -> & | ~ forall exists false, <->); show() writes it back.

const BIN = { '→': 1, '↔': 0, '∨': 2, '∧': 3 }
const ASCII = [['<->', '↔'], ['->', '→'], ['&', '∧'], ['|', '∨'], ['~', '¬'], ['!', '¬'], ['forall', '∀'], ['exists', '∃'], ['false', '⊥'], ['_|_', '⊥']]

// A formula in plain ASCII and back, for a board written as text (../../circuit/text.js): the symbols by the ASCII
// spellings parse() reads, a quantifier as `forall x.` (its symbol takes no space after it).
const TO_ASCII = [['↔', '<->'], ['→', '->'], ['∧', '&'], ['∨', '|'], ['¬', '~'], ['∀', 'forall '], ['∃', 'exists '], ['⊥', 'false']]
const FROM_ASCII = [['_|_', '⊥'], ...ASCII.filter(([a]) => a !== '_|_')]
export const asciiOf = (text) => TO_ASCII.reduce((s, [a, b]) => s.split(a).join(b), text)
export const unasciiOf = (text) => FROM_ASCII.reduce((s, [a, b]) => s.split(a).join(b), text).replace(/([∀∃])\s+/g, '$1')
/** A board's text form (circuit/text.js): every setting that is a formula, written in ASCII. */
export const FORMULA_TEXT = {
  value: (_node, _key, v) => (typeof v === 'string' ? asciiOf(v) : v),
  read: (_node, _key, v) => (typeof v === 'string' ? unasciiOf(v) : v),
}

export const atom = (pred, args = []) => ({ op: 'atom', pred, args })
export const not = (a) => ({ op: '¬', a })
export const bin = (op, a, b) => ({ op, a, b })
export const imp = (a, b) => bin('→', a, b)
export const and = (a, b) => bin('∧', a, b)
export const or = (a, b) => bin('∨', a, b)
export const iff = (a, b) => bin('↔', a, b)
export const all = (v, body) => ({ op: '∀', v, body })
export const ex = (v, body) => ({ op: '∃', v, body })
export const meta = (name) => ({ op: 'meta', name })
export const BOT = { op: '⊥' }
export const tvar = (name) => ({ t: 'var', name })
export const fn = (f, args = []) => ({ t: 'fn', f, args })
export const eq = (s, t) => atom('=', [s, t])

/** Read a formula. Upper-case names are atoms (or, in `metas`, schematic letters); a lower-case name is a function
 *  when it takes arguments, a constant when it is in `consts`, and otherwise a variable. A name written with ? is a
 *  metavariable: ?A a sentence (?P(x) one about x), ?t a thing. */
export function parse(text, { metas = [], consts = [] } = {}) {
  let src = text
  for (const [a, b] of ASCII) src = src.split(a).join(b)
  const tokens = src.match(/\??[A-Za-z][A-Za-z0-9_']*|[()∀∃¬∧∨→↔⊥,.=]|\S/g) ?? []
  let i = 0
  const peek = () => tokens[i]
  const eat = (t) => {
    if (tokens[i] !== t) throw new Error(`expected ${t} at ${tokens[i] ?? 'the end'} in ${text}`)
    i++
  }
  const term = () => {
    const name = tokens[i++]
    if (!name || !/^\??[a-z]/.test(name)) throw new Error(`expected a term at ${name ?? 'the end'} in ${text}`)
    if (name.startsWith('?')) return tvar(name)
    if (peek() === '(') {
      eat('(')
      const args = [term()]
      while (peek() === ',') { eat(','); args.push(term()) }
      eat(')')
      return fn(name, args)
    }
    return consts.includes(name) ? fn(name) : tvar(name)
  }
  const unary = () => {
    const t = peek()
    if (t === '¬') { i++; return not(unary()) }
    if (t === '⊥') { i++; return BOT }
    if (t === '∀' || t === '∃') {
      i++
      const v = tokens[i++]
      if (peek() === '.') i++
      // An upper-case name is a sentence: ∀R. … is for every sentence R.
      return /^[A-Z]/.test(v) && t === '∀' ? { op: t, v, prop: true, body: formula(0) } : { op: t, v, body: formula(0) }
    }
    if (t === '(') { i++; const f = formula(0); eat(')'); return f }
    if (t && /^\??[A-Z]/.test(t)) {
      i++
      const args = []
      if (peek() === '(') {
        eat('(')
        args.push(term())
        while (peek() === ',') { eat(','); args.push(term()) }
        eat(')')
      }
      if (t.startsWith('?')) return args.length ? { op: 'meta', name: t, args } : meta(t)
      if (metas.includes(t)) return meta(t)
      return atom(t, args)
    }
    if (t && /^\??[a-z]/.test(t)) {
      const s = term()
      eat('=')
      return eq(s, term())
    }
    throw new Error(`unexpected ${t ?? 'end'} in ${text}`)
  }
  // Precedence climbing; → is right-associative, the others left.
  function formula(min) {
    let left = unary()
    while (peek() in BIN && BIN[peek()] >= min) {
      const op = tokens[i++]
      const right = formula(op === '→' ? BIN[op] : BIN[op] + 1)
      left = bin(op, left, right)
    }
    return left
  }
  const f = formula(0)
  if (i < tokens.length) throw new Error(`unexpected ${tokens[i]} in ${text}`)
  return f
}

export const showTerm = (t) => (t.t === 'var' || !t.args.length ? (t.name ?? t.f) : `${t.f}(${t.args.map(showTerm).join(', ')})`)

/** Write a formula with as few brackets as the precedence allows. */
export function show(f, outer = -1) {
  const wrap = (s, level) => (level < outer ? `(${s})` : s)
  switch (f.op) {
    case 'atom': return f.pred === '=' ? `${showTerm(f.args[0])} = ${showTerm(f.args[1])}` : f.args.length ? `${f.pred}(${f.args.map(showTerm).join(', ')})` : f.pred
    case 'meta': return f.args?.length ? `${f.name}(${f.args.map(showTerm).join(', ')})` : f.name
    case '⊥': return '⊥'
    case '¬': return `¬${show(f.a, 9)}`
    case '∀': case '∃': return wrap(`${f.op}${f.v}. ${show(f.body, -1)}`, -1)
    default: {
      const p = BIN[f.op]
      return wrap(`${show(f.a, f.op === '→' ? p + 1 : p)} ${f.op} ${show(f.b, f.op === '→' ? p : p + 1)}`, p)
    }
  }
}

/* ---------- variables and substitution ---------- */

/**
 * f with each proposition letter in `map` replaced by its formula (a level's test case: A := it rains), and each
 * predicate letter mapped to a bare name renamed (P := Human makes P(x) into Human(x)).
 */
export function replaceAtoms(f, map) {
  if (f.op === 'atom') {
    const to = map[f.pred]
    if (!to) return f
    if (!f.args.length) return to
    return to.op === 'atom' && !to.args.length ? atom(to.pred, f.args) : f
  }
  if (f.op === '¬') return not(replaceAtoms(f.a, map))
  if (f.op === '∀' || f.op === '∃') {
    // A sentence the quantifier binds is its own, not the case's letter.
    if (f.prop && f.v in map) {
      const { [f.v]: _, ...rest } = map
      return { ...f, body: replaceAtoms(f.body, rest) }
    }
    return { ...f, body: replaceAtoms(f.body, map) }
  }
  if (f.a) return bin(f.op, replaceAtoms(f.a, map), replaceAtoms(f.b, map))
  return f
}

/**
 * f with the sentence letter R replaced by `by` where it is free (not under another ∀R). R may take things too (∀P. P(a)
 * → …, a property): then `by` is a sentence about x, and each R(t) becomes it with t in x's place.
 */
export function substSentence(f, R, by) {
  if (f.op === 'atom') return f.pred !== R ? f : f.args.length ? subst(by, 'x', f.args[0]) : by
  if (f.op === '¬') return not(substSentence(f.a, R, by))
  if (f.op === '∀' || f.op === '∃') return f.prop && f.v === R ? f : { ...f, body: substSentence(f.body, R, by) }
  if (f.a) return bin(f.op, substSentence(f.a, R, by), substSentence(f.b, R, by))
  return f
}

/** f with the free sentence or property letter R renamed S. */
const renameSentence = (f, R, S) => {
  if (f.op === 'atom') return f.pred === R ? atom(S, f.args) : f
  if (f.op === '¬') return not(renameSentence(f.a, R, S))
  if (f.op === '∀' || f.op === '∃') return f.prop && f.v === R ? f : { ...f, body: renameSentence(f.body, R, S) }
  if (f.a) return bin(f.op, renameSentence(f.a, R, S), renameSentence(f.b, R, S))
  return f
}

/** Whether the sentence or property letter R occurs free in f. */
export const mentionsSentence = (f, R) => {
  if (f.op === 'atom') return f.pred === R
  if (f.op === '¬') return mentionsSentence(f.a, R)
  if (f.op === '∀' || f.op === '∃') return !(f.prop && f.v === R) && mentionsSentence(f.body, R)
  if (f.a) return mentionsSentence(f.a, R) || mentionsSentence(f.b, R)
  return false
}

/** How many things the letter R a ∀ binds takes in its body (0: a sentence; 1: a property). */
export const arityIn = (f, R) => {
  if (f.op === 'atom') return f.pred === R ? f.args.length : -1
  if (f.op === '¬') return arityIn(f.a, R)
  if (f.body) return f.prop && f.v === R ? -1 : arityIn(f.body, R)
  if (f.a) return Math.max(arityIn(f.a, R), arityIn(f.b, R))
  return -1
}

const termVars = (t, out) => {
  if (t.t === 'var') out.add(t.name)
  else t.args.forEach((a) => termVars(a, out))
  return out
}
/** The variables free in a formula. */
export function freeVars(f, out = new Set()) {
  switch (f.op) {
    case 'atom': case 'meta': (f.args ?? []).forEach((t) => termVars(t, out)); break
    case '¬': freeVars(f.a, out); break
    case '∀': case '∃': { const inner = freeVars(f.body); inner.delete(f.v); inner.forEach((v) => out.add(v)); break }
    case '∧': case '∨': case '→': case '↔': freeVars(f.a, out); freeVars(f.b, out); break
  }
  return out
}

/** Every variable a formula names, bound or free. */
export function allVars(f, out = new Set()) {
  switch (f.op) {
    case 'atom': case 'meta': (f.args ?? []).forEach((t) => termVars(t, out)); break
    case '¬': allVars(f.a, out); break
    case '∀': case '∃': out.add(f.v); allVars(f.body, out); break
    case '∧': case '∨': case '→': case '↔': allVars(f.a, out); allVars(f.b, out); break
  }
  return out
}

const substTerm = (t, v, by) => (t.t === 'var' ? (t.name === v ? by : t) : fn(t.f, t.args.map((a) => substTerm(a, v, by))))
const fresh = (base, taken) => {
  let k = 1
  while (taken.has(`${base}${k}`)) k++
  return `${base}${k}`
}
/** f[v := by], renaming bound variables so nothing in `by` is captured. */
export function subst(f, v, by) {
  switch (f.op) {
    case 'atom': return atom(f.pred, f.args.map((t) => substTerm(t, v, by)))
    case 'meta': return f.args?.length ? { ...f, args: f.args.map((t) => substTerm(t, v, by)) } : f
    case '¬': return not(subst(f.a, v, by))
    case '∀': case '∃': {
      if (f.v === v) return f
      const inBy = termVars(by, new Set())
      if (inBy.has(f.v) && freeVars(f.body).has(v)) {
        const w = fresh(f.v, new Set([...inBy, ...freeVars(f.body)]))
        return { op: f.op, v: w, body: subst(subst(f.body, f.v, tvar(w)), v, by) }
      }
      return { ...f, body: subst(f.body, v, by) }
    }
    case '∧': case '∨': case '→': case '↔': return bin(f.op, subst(f.a, v, by), subst(f.b, v, by))
    default: return f
  }
}

/* ---------- equality up to renaming bound variables ---------- */

const sameTerm = (s, t, env) => {
  if (s.t !== t.t) return false
  if (s.t === 'var') return (env.get(s.name) ?? s.name) === t.name
  return s.f === t.f && s.args.length === t.args.length && s.args.every((a, k) => sameTerm(a, t.args[k], env))
}
// ¬A means A → ⊥, and A ↔ B means (A → B) ∧ (B → A): each is one formula with its meaning to every comparison.
const unneg = (f) => (f.op === '¬' ? bin('→', f.a, BOT) : f.op === '↔' ? bin('∧', bin('→', f.a, f.b), bin('→', f.b, f.a)) : f)
/** Are two formulas the same, up to the names of bound variables (and ¬A being A → ⊥, A ↔ B both directions)? */
export function same(f0, g0, env = new Map()) {
  const f = unneg(f0)
  const g = unneg(g0)
  if (f.op !== g.op) return false
  switch (f.op) {
    case 'atom': return f.pred === g.pred && f.args.length === g.args.length && f.args.every((t, k) => sameTerm(t, g.args[k], env))
    case 'meta': return f.name === g.name && (f.args ?? []).length === (g.args ?? []).length && (f.args ?? []).every((t, k) => sameTerm(t, g.args[k], env))
    case '⊥': return true
    case '∀': case '∃':
      if (Boolean(f.prop) !== Boolean(g.prop)) return false
      // Two sentence letters bound alike: compare with g's renamed to f's.
      if (f.prop) return same(f.body, f.v === g.v ? g.body : renameSentence(g.body, g.v, f.v), env)
      return same(f.body, g.body, new Map([...env, [f.v, g.v]]))
    default: return same(f.a, g.a, env) && same(f.b, g.b, env)
  }
}

/** The proposition letters and predicates (with their arities) and the functions a set of formulas uses. */
export function signature(formulas) {
  const preds = new Map()
  const fns = new Map()
  const term = (t) => { if (t.t === 'fn') { fns.set(t.f, t.args.length); t.args.forEach(term) } }
  // A sentence or property letter a ∀ binds (∀R. …, ∀P. …) is no letter of the signature.
  const walk = (f, bound = new Set()) => {
    if (f.op === 'atom') { if (f.pred !== '=' && !bound.has(f.pred)) preds.set(f.pred, f.args.length); f.args.forEach(term) }
    else if (f.op === '¬') walk(f.a, bound)
    else if (f.op === '∀' || f.op === '∃') walk(f.body, f.prop ? new Set([...bound, f.v]) : bound)
    else if (f.a) { walk(f.a, bound); walk(f.b, bound) }
  }
  formulas.forEach((f) => walk(f))
  return { preds, fns }
}

/** Every term in a formula, outermost first, each occurrence once, in order. */
export function termsOf(f, out = []) {
  const walk = (t) => { out.push(t); if (t.t === 'fn') t.args.forEach(walk) }
  if (f.op === 'atom') f.args.forEach(walk)
  else if (f.op === '¬') termsOf(f.a, out)
  else if (f.body) termsOf(f.body, out)
  else if (f.a) { termsOf(f.a, out); termsOf(f.b, out) }
  return out
}

/**
 * f with the occurrences of the term t that `pick(k)` chooses replaced by `by` (a term, or (k) → term); k counts the
 * occurrences in order,
 * left to right as written, and one inside another occurrence is not counted (it goes with it).
 */
export function replaceTerm(f, t, by, pick) {
  let k = 0
  const key = showTerm(t)
  const term = (u) => {
    if (showTerm(u) === key) { const i = k++; return pick(i) ? (typeof by === 'function' ? by(i) : by) : u }
    return u.t === 'fn' ? { ...u, args: u.args.map(term) } : u
  }
  const walk = (g) => {
    if (g.op === 'atom') return { ...g, args: g.args.map(term) }
    if (g.op === '¬') return { ...g, a: walk(g.a) }
    if (g.body) return { ...g, body: walk(g.body) }
    if (g.a) return { ...g, a: walk(g.a), b: walk(g.b) }
    return g
  }
  return walk(f)
}

/** How many times the term t occurs in f, counted as replaceTerm counts them. */
export function occurrences(f, t) {
  let n = 0
  replaceTerm(f, t, t, () => { n++; return false })
  return n
}
