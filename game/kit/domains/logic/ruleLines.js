// A declaration as the player writes it on the rule table (《证明完毕》, ui/RuleTable.jsx): its intro rules, each the
// things it takes (any thing, chapter 6 on) and its premises, every premise a whole sentence built on the strip. Only
// this one layer of ⟹ is written: a premise that needs premises of its own says so inside the sentence, with → and ∀.
// The elimination rule made from them keeps the kernel's own form (iso.js declaredRules).
//
//   rule   { binds: [name], needs: [sentence] }   sentence: formulaTree.js (null: nothing yet)
//   line   { binds: [name], needs: [need] }        need: sentence text | { need, under: [need] } (a premise with
//                                                   premises of its own: a reference declaration, or an old save's)
import { DECL, hypCard, sentenceOf, settle, startIso, thingCard } from './iso.js'
import { freeVars, show } from './formula.js'
import { vocabulary } from './fol.js'
import { chipKeysOf, chipsOf, complete, straysOf } from './formulaTree.js'

/** A new rule: one that needs nothing yet. */
export const blankRule = () => ({ binds: [], needs: [] })

/** The chips a premise is built from: the pieces of the level's sentences (its predicates, names, ∀ ∃ x, connectives). */
export function premiseChips(level) {
  const formulas = level.sentences.map((s) => sentenceOf(level, s))
  const needed = new Set(formulas.flatMap(chipKeysOf))
  const v = vocabulary(formulas)
  const pieces = { kind: 'translate', consts: level.things ?? [], vocab: v, notation: { ...level.notation, symbols: ['∀', '∃'] }, connectives: ['¬', '∧', '∨', '→', '↔', '⊥'] }
  return chipsOf(pieces).filter((c) => needed.has(c.key))
}

/**
 * What keeps the rules from being a declaration: a premise not yet a whole sentence ('empty'), or one that mentions a
 * thing its rule does not take ('stray'). [{ rule, need, why }]
 */
export function problemsOf(level, rules) {
  const binder = level.binder ?? 'x'
  return rules.flatMap((rule, k) => rule.needs.flatMap((need, j) => {
    if (!need || !complete(need) || straysOf(need).length) return [{ rule: k, need: j, why: 'empty' }]
    const loose = [...freeVars(need)].filter((v) => !(v === binder && rule.binds.includes(binder)))
    return loose.length ? [{ rule: k, need: j, why: 'stray' }] : []
  }))
}

/** The lines the rules write (each premise as text), to make the board the kernel's checks read (boardOf). */
export const linesOf = (rules) => rules.map((rule) => ({ binds: rule.binds, needs: rule.needs.map((need) => show(need)) }))

/** The board of some lines, as the kernel's checks read it (a premise whose conclusion is empty is left out). */
export function boardOf(lines) {
  if (!lines.length) return startIso()
  const nodes = []
  const wires = []
  let n = 0
  const id = (kind) => `${kind}-${(n += 1)}`
  // Cards stand left of the declared card on the desktop board, one under another (iso.js isoBoard does the same).
  const at = (x) => ({ x, y: 40 + nodes.filter((m) => m.x === x).length * 170 })
  // The cards of a list of premises joined in order, or null for none; returns the id that carries them.
  const list = (items, binds = []) => {
    const ids = [...binds.map((b) => { const k = id('thing'); nodes.push(thingCard(k, b, at(20))); return k }), ...items.filter((m) => typeof m === 'string' || m.need).map(premise)]
    if (!ids.length) return null
    return ids.reduce((a, b) => {
      const j = id('join')
      nodes.push({ id: j, type: 'join', params: {}, ...at(280) })
      wires.push({ from: a, to: j, port: 'a' }, { from: b, to: j, port: 'b' })
      return j
    })
  }
  const premise = (item) => {
    const k = id('hyp')
    nodes.push(hypCard(k, typeof item === 'string' ? item : item.need, at(20)))
    const under = typeof item === 'string' ? null : list(item.under)
    if (under) wires.push({ from: under, to: k, port: 'under' })
    return k
  }
  lines.forEach((line, k) => {
    let from = list(line.needs, line.binds)
    if (!from) {
      from = id('none')
      nodes.push({ id: from, type: 'none', params: {}, ...at(20) })
    }
    wires.push({ from, to: DECL, port: `c${k + 1}` })
  })
  const [decl] = startIso().nodes
  return settle({ nodes: [{ ...decl, x: nodes.some((m) => m.type === 'join') ? 540 : 280 }, ...nodes], wires })
}
