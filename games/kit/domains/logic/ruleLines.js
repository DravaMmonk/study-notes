// Declarations once saved as lines (《证明完毕》 saves of versions 71 to 73): each line an intro rule, the premises it
// needs, and the things it takes. The save step of version 74 (qed/spec.js) makes each such save the board it stands
// for, as the rule board wires it (iso.js).
//
//   line   { binds: [name], needs: [need] }      need   sentence | { need: sentence | null, under: [need] }
import { DECL, hypCard, settle, startIso, thingCard } from './iso.js'

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
