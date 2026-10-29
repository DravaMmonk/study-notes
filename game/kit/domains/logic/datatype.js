// Inductive types (《证明完毕》 chapter 12 on): a declaration names a type's constructors, `datatype nat = zero | s(nat)`,
// and that is all it says; everything else about the type is a rule it gives, written with metavariables
// (schematic.js) and used with the rule cards like any other: the constructors are all different (distinct), every
// value is made by one of them (exhaust), and what holds of every constructor, given that it holds of its arguments
// of the type, holds of every value (induct). That a constructor is one-to-one is not given: the course proves it
// from a function that takes it apart (chapter 12, pred).
//
//   declarations  { type: 'c1 | c2(t1, t2) | …' }   a level's `datatypes`, each constructor a name and its arguments'
//                                                    types (a type of the level, or any name for the things inside)
import { ruleOf } from './schematic.js'

const T = (zh, en) => ({ zh, en })
const VARS = ['x', 'y', 'z', 'u', 'v', 'w']

/** A declaration's constructors: [{ f, args: [type] }]. */
export function constructorsOf(text) {
  return text.split('|').map((c) => {
    const m = /^\s*([a-z][A-Za-z0-9_]*)\s*(?:\((.*)\))?\s*$/.exec(c)
    if (!m) throw new Error(`not a constructor: ${c}`)
    return { f: m[1], args: m[2] ? m[2].split(',').map((a) => a.trim()) : [] }
  })
}

// A constructor applied to variables named from `from` on (or to ?-letters): s(x), cons(x, y).
const applied = (c, names) => (c.args.length ? `${c.f}(${names.join(', ')})` : c.f)
const namesFor = (c, from = 0, meta = false) => c.args.map((_, k) => `${meta ? '?' : ''}${VARS[from + k]}`)

/** The rules a type's declaration gives, keyed `type.distinct1`, `type.exhaust`, `type.induct`. */
export function datatypeRules(type, text) {
  const cs = constructorsOf(text)
  const rules = []
  let n = 0
  for (const a of cs) for (const b of cs) {
    if (a === b) continue
    const left = applied(a, namesFor(a, 0, true))
    const right = applied(b, namesFor(b, a.args.length, true))
    rules.push(ruleOf(`${type}.distinct${++n}`, T(`${type}：${a.f} 不等于 ${b.f}`, `${type}: ${a.f} is not ${b.f}`), [`${left} = ${right}`], '?C'))
  }
  const fixes = (c) => (c.args.length ? `⋀${namesFor(c).join(' ')}. ` : '')
  rules.push(ruleOf(`${type}.exhaust`, T(`${type} 按情况分`, `${type} by cases`), cs.map((c) => `${fixes(c)}⟦?t = ${applied(c, namesFor(c))}⟧ ⟹ ?C`), '?C'))
  const step = (c) => {
    const own = namesFor(c).filter((_, k) => c.args[k] === type)
    const body = `?P(${applied(c, namesFor(c))})`
    return `${fixes(c)}${own.length ? `⟦${own.map((x) => `?P(${x})`).join('; ')}⟧ ⟹ ` : ''}${body}`
  }
  rules.push(ruleOf(`${type}.induct`, T(`${type} 的归纳`, `${type} induction`), cs.map(step), '∀x. ?P(x)'))
  return rules.map((r) => ({ ...r, datatype: type }))
}

/** Every rule a level's declarations give. */
export const datatypesRules = (decls = {}) => Object.entries(decls).flatMap(([type, text]) => datatypeRules(type, text))
