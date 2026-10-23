// How a level writes its formulas for the player (《证明完毕》). A level may give its proposition letters everyday
// sentences (`words`: { Rain: { zh: '下雨', en: 'it rains' } }), so early proofs are about rain and wet ground rather
// than A and B; and a connective is written as its symbol only once the course has introduced it (`symbols`), in
// words before that ("若下雨，则地湿"). Formulas themselves stay letters underneath (formula.js).
//
//   notation  { words: { letter: { zh, en } } | null, symbols: [connective] }
//
// First-order words (chapter 5 on): a predicate's words are a template, its arguments as {0}, {1}
// (Human: { zh: '{0}是人' }), and a constant's words are its name (ann: { zh: '安' }); a variable stays itself.
import { show, showTerm } from './formula.js'

const BIN = { '→': 1, '↔': 0, '∨': 2, '∧': 3 }
const QUANT = {
  '∀': { zh: (v, b) => `对所有 ${v}，${b}`, en: (v, b) => `for every ${v}, ${b}` },
  '∃': { zh: (v, b) => `有一个 ${v}，${b}`, en: (v, b) => `there is some ${v} such that ${b}` },
}
// A term in words: a name by its words, a function by its template (mul: '{0}·{1}'), a variable as written.
function termWords(t, notation, lang) {
  if (t.t !== 'fn') return t.name === 'hole' ? '□' : showTerm(t)
  const word = notation.words?.[t.f]?.[lang]
  if (!word) return t.args.length ? `${t.f}(${t.args.map((a) => termWords(a, notation, lang)).join(', ')})` : t.f
  // An argument that is itself an operation keeps brackets: (a·b)⁻¹.
  const arg = (a) => (a.t === 'fn' && a.args.length > 1 ? `(${termWords(a, notation, lang)})` : termWords(a, notation, lang))
  return t.args.length ? word.replace(/\{(\d)\}/g, (_, k) => arg(t.args[Number(k)])) : word
}
const WORDS = {
  '→': { zh: (a, b) => `若${a}，则${b}`, en: (a, b) => `if ${a} then ${b}` },
  '∧': { zh: (a, b) => `${a}并且${b}`, en: (a, b) => `${a} and ${b}` },
  '∨': { zh: (a, b) => `${a}或者${b}`, en: (a, b) => `${a} or ${b}` },
  '↔': { zh: (a, b) => `${a}等价于${b}`, en: (a, b) => `${a} is equivalent to ${b}` },
}

/** A formula in a level's notation, in one language ('zh' | 'en'). */
export function render(f, notation, lang, outer = -1) {
  const known = (op) => notation.symbols.includes(op)
  const wrap = (s, level) => (level < outer ? `(${s})` : s)
  // In words a part that is itself compound goes in brackets, so the sentence reads one way only.
  const part = (g) => (g.op === 'atom' || g.op === '⊥' ? render(g, notation, lang) : `(${render(g, notation, lang)})`)
  switch (f.op) {
    case 'atom': {
      const word = notation.words?.[f.pred]?.[lang]
      if (word && f.args.length) return word.replace(/\{(\d)\}/g, (_, k) => termWords(f.args[Number(k)], notation, lang))
      if (f.pred === '=') return `${termWords(f.args[0], notation, lang)} = ${termWords(f.args[1], notation, lang)}`
      // A predicate named on its own (a test case's P := Human) reads with its places left open.
      return word && !f.args.length ? word.replace(/\{\d\}/g, '…') : show(f)
    }
    case 'meta': return f.name
    case '⊥': return known('⊥') ? '⊥' : lang === 'zh' ? '矛盾' : 'contradiction'
    case '¬': return known('¬') ? `¬${render(f.a, notation, lang, 9)}` : `${lang === 'zh' ? '并非' : 'not '}${part(f.a)}`
    case '∀': case '∃': return known(f.op) ? wrap(`${f.op}${f.v}. ${render(f.body, notation, lang, -1)}`, -1) : wrap(QUANT[f.op][lang](f.v, render(f.body, notation, lang, -1)), -1)
    default: {
      const p = BIN[f.op]
      // An → or ↔ inside another connective always keeps its brackets: A → (B → A), never A → B → A.
      const side = (g, level) => (g.op === '→' || g.op === '↔' ? `(${render(g, notation, lang)})` : render(g, notation, lang, level))
      if (known(f.op)) return wrap(`${side(f.a, f.op === '→' ? p + 1 : p)} ${f.op} ${side(f.b, f.op === '→' ? p : p + 1)}`, p)
      return WORDS[f.op][lang](part(f.a), part(f.b))
    }
  }
}

/** A formula as a { zh, en } pair, in `notation` (plain letters and symbols without one). */
export const say = (f, notation) => (notation ? { zh: render(f, notation, 'zh'), en: render(f, notation, 'en') } : { zh: show(f), en: show(f) })

/** Every formula inside some formulas (themselves included), each once, in the order they appear. */
export function subformulas(formulas) {
  const out = new Map()
  const walk = (f) => {
    if (f.op === '⊥' || f.op === 'meta') return
    out.set(show(f), out.get(show(f)) ?? f)
    if (f.op === '¬') walk(f.a)
    else if (f.body) walk(f.body)
    else if (f.a) { walk(f.a); walk(f.b) }
  }
  formulas.forEach(walk)
  return [...out.values()]
}


const termKey = (t) => showTerm(t)
// Every term in a formula, outermost first, each occurrence once in order.
function termsIn(f, out = []) {
  const walk = (t) => { out.push(t); if (t.t === 'fn') t.args.forEach(walk) }
  if (f.op === 'atom') f.args.forEach(walk)
  else if (f.op === '¬') termsIn(f.a, out)
  else if (f.body) termsIn(f.body, out)
  else if (f.a) { termsIn(f.a, out); termsIn(f.b, out) }
  return out
}
// f with the occurrences of term `t` that `pick(k)` chooses (k counts them in order) replaced by `by`.
function replaceTerm(f, t, by, pick) {
  let k = 0
  const term = (u) => {
    if (termKey(u) === termKey(t)) return pick(k++) ? by : u
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

/**
 * The patterns a rewrite card offers: each of these sentences with a term's occurrences, all of them or one at a time,
 * marked by the hole (the variable 'hole', shown □), each once.
 */
export function patternsOf(formulas) {
  const out = new Map()
  const hole = { t: 'var', name: 'hole' }
  for (const g of subformulas(formulas)) {
    const terms = termsIn(g)
    for (const t of new Map(terms.map((u) => [termKey(u), u])).values()) {
      const n = terms.filter((u) => termKey(u) === termKey(t)).length
      const variants = [replaceTerm(g, t, hole, () => true), ...(n > 1 ? Array.from({ length: n }, (_, i) => replaceTerm(g, t, hole, (k) => k === i)) : [])]
      for (const v of variants) out.set(show(v), v)
    }
  }
  return [...out.values()]
}

/** The compound terms (a function of something) in a formula, as written. */
export const compoundTerms = (f) => termsIn(f).filter((t) => t.t === 'fn' && t.args.length).map(termKey)

/** A term as a { zh, en } pair, in a level's notation. */
export const sayTerm = (t, notation) => ({ zh: termWords(t, notation ?? {}, 'zh'), en: termWords(t, notation ?? {}, 'en') })
