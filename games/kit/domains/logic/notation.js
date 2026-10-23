// How a level writes its formulas for the player (《证明完毕》). A level may give its proposition letters everyday
// sentences (`words`: { Rain: { zh: '下雨', en: 'it rains' } }), so early proofs are about rain and wet ground rather
// than A and B; and a connective is written as its symbol only once the course has introduced it (`symbols`), in
// words before that ("如果下雨，那么地湿"). Formulas themselves stay letters underneath (formula.js).
//
//   notation  { words: { letter: { zh, en } } | null, symbols: [connective] }
import { show } from './formula.js'

const BIN = { '→': 1, '↔': 0, '∨': 2, '∧': 3 }
const WORDS = {
  '→': { zh: (a, b) => `如果${a}，那么${b}`, en: (a, b) => `if ${a} then ${b}` },
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
      const word = !f.args.length && notation.words?.[f.pred]
      return word ? word[lang] : show(f)
    }
    case 'meta': return f.name
    case '⊥': return known('⊥') ? '⊥' : lang === 'zh' ? '矛盾' : 'contradiction'
    case '¬': return known('¬') ? `¬${render(f.a, notation, lang, 9)}` : `${lang === 'zh' ? '并非' : 'not '}${part(f.a)}`
    case '∀': case '∃': return wrap(`${f.op}${f.v}. ${render(f.body, notation, lang, -1)}`, -1)
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

