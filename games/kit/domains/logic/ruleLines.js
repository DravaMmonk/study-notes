// A declaration's intro rules written as lines (《证明完毕》's rule board): each line is one intro rule, built from
// blocks the way a block editor builds, shown on the shared strip (games/kit/strip) the way the book writes a rule,
// ⋀x. ⟦A; B⟧ ⟹ C. A rule's brackets are an opening that holds its premises: put a block in and it grows, the ; written
// between them; empty, the rule needs nothing. A premise is a sentence, or a premise with premises of its own,
// ⟦A⟧ ⟹ B, whose conclusion must be filled in. Taking any thing (⋀x) is a tag on the rule: the sentences that mention
// x belong only in a rule that takes it. The conclusion is the declared sentence, fixed.
//
//   line   { binds: [name], needs: [need] }      need   sentence | { need: sentence | null, under: [need] }
//
// This is the shape of a way on the board (iso.js waysIn), so a declaration's lines and its board are one thing:
// boardOf makes the board the kernel's checks read, linesOf reads lines off a board (a level's, or an old save).
import { DECL, hypCard, isoBoard, sentenceOf, settle, startIso, thingCard, waysIn } from './iso.js'
import { freeVars } from './formula.js'

/** A new line: a rule that needs nothing yet. */
export const blankLine = () => ({ binds: [], needs: [] })

/** The lines a board declares (its ways, in order). */
export const linesOf = (board) => waysIn(board).map((way) => ({ binds: way.binds, needs: way.needs }))

/** The board of some lines, as the kernel's checks read it (a premise whose conclusion is empty is left out). */
export function boardOf(lines) {
  if (!lines.length) return startIso()
  const nodes = []
  const wires = []
  let n = 0
  const id = (kind) => `${kind}-${(n += 1)}`
  // The cards of a list of premises joined in order, or null for none; returns the id that carries them.
  const list = (items, binds = []) => {
    const ids = [...binds.map((b) => { const k = id('thing'); nodes.push(thingCard(k, b, { x: 0, y: 0 })); return k }), ...items.filter((m) => typeof m === 'string' || m.need).map(premise)]
    if (!ids.length) return null
    return ids.reduce((a, b) => {
      const j = id('join')
      nodes.push({ id: j, type: 'join', params: {}, x: 0, y: 0 })
      wires.push({ from: a, to: j, port: 'a' }, { from: b, to: j, port: 'b' })
      return j
    })
  }
  const premise = (item) => {
    const k = id('hyp')
    nodes.push(hypCard(k, typeof item === 'string' ? item : item.need, { x: 0, y: 0 }))
    const under = typeof item === 'string' ? null : list(item.under)
    if (under) wires.push({ from: under, to: k, port: 'under' })
    return k
  }
  lines.forEach((line, k) => {
    let from = list(line.needs, line.binds)
    if (!from) {
      from = id('none')
      nodes.push({ id: from, type: 'none', params: {}, x: 0, y: 0 })
    }
    wires.push({ from, to: DECL, port: `c${k + 1}` })
  })
  return settle({ nodes: [...startIso().nodes, ...nodes], wires })
}

/** A board written compactly (iso.js isoBoard), as lines. */
export const linesFrom = (...args) => linesOf(isoBoard(...args))

/**
 * What keeps some lines from being a declaration: a premise whose conclusion is empty, or a sentence that mentions a
 * thing no rule around it takes. [{ line, path, why }] (path: the item's indices down from the line's premises).
 */
export function problemsOf(level, lines) {
  const binder = level.binder ?? 'x'
  const mentions = (s) => freeVars(sentenceOf(level, s)).has(binder)
  const out = []
  const walk = (items, line, path, taken) => items.forEach((item, k) => {
    const at = [...path, k]
    if (typeof item === 'string') {
      if (!taken && mentions(item)) out.push({ line, path: at, why: 'stray' })
      return
    }
    if (!item.need) out.push({ line, path: at, why: 'empty' })
    else if (!taken && mentions(item.need)) out.push({ line, path: at, why: 'stray' })
    walk(item.under, line, at, taken)
  })
  lines.forEach((line, k) => walk(line.needs, k, [], line.binds.includes(binder)))
  return out
}

