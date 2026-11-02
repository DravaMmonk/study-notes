// A board of 《从一根线开始》, the same object everywhere: saved in progress, drawn by the shared circuit editor
// (../../circuit), run tick by tick (run.js), written as blueprint text in content (../../circuit/text.js):
//
//   { nodes: [{ id, type, params, x?, y? }], wires: [{ from, to, port }] }
//
// The level gives the board its fixed cards, each named by what it stands for: its wires in and its inputs down the
// left, its wires out and its outputs down the right. Every other node is a part the player placed (parts.js PARTS, or
// a part a level builds), its settings in params as strings ({ reg: 'A', start: '1' }).
//
// As text, a part is `id = type[settings](its inputs in order)` and a wire into an output or a wire out `right <- r`:
//
//   r = reg[reg=A, start=0]()
//   k = keep[reg=A](left)
//   right <- r
import { parse, print } from '../../circuit/text.js'
import { portsOf } from '../../engine/circuit.js'
import { FIXED, PARTS } from './parts.js'

/** A level's ports: its wires in and inputs (the left), its wires out and outputs (the right), as { name, label }. */
export const portsIn = (level) => [...(level.wires?.in ?? []), ...(level.inputs ?? [])]
export const portsOut = (level) => [...(level.wires?.out ?? []), ...(level.outputs ?? [])]

/** The fixed cards of a level: its wires in and inputs down the left, its wires out and outputs down the right. */
export function fixedOf(level) {
  const left = [...(level.wires?.in ?? []).map((w) => ({ id: w.name, type: 'rx', params: { name: w.name } })), ...(level.inputs ?? []).map((i) => ({ id: i.name, type: 'in', params: { name: i.name } }))]
  const right = [...(level.wires?.out ?? []).map((w) => ({ id: w.name, type: 'tx', params: { name: w.name } })), ...(level.outputs ?? []).map((o) => ({ id: o.name, type: 'out', params: { name: o.name } }))]
  return [...left.map((n, k) => ({ ...n, x: 20, y: 40 + k * 140 })), ...right.map((n, k) => ({ ...n, x: 980, y: 40 + k * 140 }))]
}

/**
 * How the editor wires a level's cards (../../circuit/model.js parts, without the drawing: ui/Screen.jsx adds names
 * and icons): the ports of each card, which are given, and a built part's outputs by name when it has several.
 */
export function wiring(level, net) {
  return {
    inputs: (node) => {
      if (net.BUILT[node.type]) return portsIn(net.builtBy(node.type)).map((i) => i.name)
      return PARTS[node.type] ? portsOf(PARTS[node.type], node) : []
    },
    role: (node) => (node.type === 'rx' || node.type === 'in' ? 'source' : node.type === 'out' || node.type === 'tx' ? 'sink' : 'part'),
    packed: (node) => Boolean(net.BUILT[node.type]),
    outputs: (node) => {
      const outs = net.BUILT[node.type] && portsOut(net.builtBy(node.type))
      return outs && outs.length > 1 ? outs.map((o) => ({ key: o.name, label: o.label })) : null
    },
  }
}

/** The board a level opens on: its fixed cards. */
export const startBoard = (level) => ({ nodes: fixedOf(level), wires: [] })

/**
 * A board from another level brought onto `level` (a level that carries on from it): its placed parts and the wires
 * between them kept, its fixed cards swapped for this level's, and every wire to or from a fixed card this level has
 * too (by name, onto a port it has) kept.
 */
export function carriedOnto(level, board) {
  const fixed = fixedOf(level)
  const placed = board.nodes.filter((n) => !FIXED.includes(n.type))
  const ids = new Set([...fixed, ...placed].map((n) => n.id))
  const own = new Map(fixed.map((n) => [n.id, n]))
  const fits = (w) => ids.has(w.from.split('#')[0]) && ids.has(w.to) && (!own.has(w.to) || w.port === 'in') && (!own.has(w.from.split('#')[0]) || board.nodes.find((n) => n.id === w.from.split('#')[0])?.type === own.get(w.from.split('#')[0]).type)
  return { nodes: [...fixed, ...placed], wires: board.wires.filter(fits) }
}

/** Whether a saved board still fits its level: the level's fixed cards, and every card one the domain knows. */
export function fits(circuit, level, partOf) {
  const fixed = (c) => c.nodes.filter((n) => FIXED.includes(n.type)).map((n) => n.id).sort().join()
  return fixed(circuit) === fixed(startBoard(level)) && circuit.nodes.every((n) => partOf(n.type))
}

/**
 * The board blueprint lines describe on a level: a statement with a type is a part (`partOf` gives a type's part, a
 * built part's too), its settings its params and its inputs by position or by name; a wire into an output is written
 * `bit <- r`. Throws a { line, zh, en } on text it cannot read, a part the domain does not know, or a node the level
 * does not give.
 */
export function fromText(lines, level, partOf) {
  const { statements, wires } = parse(lines.join('\n'))
  const fail = (line, zh, en) => { throw { line, zh: `第 ${line} 行：${zh}`, en: `Line ${line}: ${en}` } }
  const fixed = fixedOf(level)
  const all = [...fixed]
  for (const st of statements) {
    if (st.type === undefined || FIXED.includes(st.type) || !partOf(st.type)) fail(st.line, `「${st.type ?? st.id}」不是能放上板的元件。`, `“${st.type ?? st.id}” is no part to place on a board.`)
    if (all.some((n) => n.id === st.id)) fail(st.line, `「${st.id}」写了两次。`, `“${st.id}” is written twice.`)
    const k = all.length - fixed.length
    all.push({ id: st.id, type: st.type, params: Object.fromEntries(Object.entries(st.settings).map(([key, v]) => [key, String(v)])), x: 240 + (k % 3) * 230, y: 40 + Math.floor(k / 3) * 170 })
  }
  const out = wires.map((w) => {
    const from = all.find((n) => n.id === w.from.split('#')[0])
    const to = all.find((n) => n.id === w.to)
    if (!from) fail(w.line, `这一关没有叫「${w.from.split('#')[0]}」的元件。`, `This level has no node called “${w.from.split('#')[0]}”.`)
    if (!to) fail(w.line, `这一关没有叫「${w.to}」的元件。`, `This level has no node called “${w.to}”.`)
    const ports = portsOf(partOf(to.type), to)
    const port = typeof w.port === 'number' ? ports[w.port] : w.port
    if (!ports.includes(port)) fail(w.line, `「${w.to}」没有这个输入口。`, `“${w.to}” has no such input.`)
    return { from: w.from, to: w.to, port }
  })
  return { nodes: all, wires: out }
}

/** A board as blueprint lines, as content writes it (no header): what fromText reads back on the level. */
export function toText(board, partOf) {
  const shape = {
    inputs: (n) => (n.type === 'out' || n.type === 'tx' ? ['in'] : FIXED.includes(n.type) ? [] : portsOf(partOf(n.type), n)),
    role: (n) => (n.type === 'out' || n.type === 'tx' ? 'sink' : FIXED.includes(n.type) ? 'source' : 'part'),
  }
  return print(board, shape).split('\n').filter((line) => line && !line.startsWith('#'))
}
