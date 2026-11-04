// A vision board (a circuit task's), the same object everywhere: saved in progress, drawn by the shared circuit editor (../../circuit),
// run by the shared engine (run.js), written as blueprint text in content (../../circuit/text.js):
//
//   { nodes: [{ id, type, params, x?, y? }], wires: [{ from, to, port }] }
//
// The level gives the board its fixed cards, named by what they stand for: each of its inputs by name down the left,
// each of its outputs by name down the right. Every other node is a part the player placed (parts.js PARTS, or a part
// a level builds). As text, a part is `id = type[settings](its inputs in order)` and a wire into an output `sum <- s`:
//
//   s = add(a, b)
//   sum <- s
import { parse, print } from '../../circuit/text.js'
import { portsOf } from '../../engine/circuit.js'
import { FIXED } from './parts.js'
import { groupOf, groupedSource } from './input-groups.js'

/** The fixed cards of a level: its inputs down the left, its outputs down the right. */
export function fixedOf(level) {
  const left = level.inputs.flatMap((input) => {
    const group = groupOf(level, input.name)
    if (group && group.inputs[0] !== input.name) return []
    return [{ id: group?.name ?? input.name, type: 'in', params: group ? { name: group.name, members: group.inputs.join(',') } : { name: input.name, ...(input.type ? { kind: input.type } : {}) } }]
  }).map((node,k) => ({ ...node, x: 20, y: 40 + k*120 }))
  const right = level.outputs.map((o, k) => ({ id: o.name, type: 'out', params: { name: o.name }, x: 900, y: 40 + k * 120 }))
  return [...left, ...right]
}

/** Each opening/reset gets an independent editable starter, or just the fixed terminals. */
export const startBoard = (level) => level.starter?.nodes ? { nodes: level.starter.nodes.map((n) => ({ ...n, params: { ...n.params } })), wires: level.starter.wires.map((w) => ({ ...w })) } : { nodes: fixedOf(level), wires: [] }

/** Whether a saved board still fits its level: the level's fixed cards, and every card one the domain knows. */
export function fits(circuit, level, partOf) {
  const fixed = (c) => c.nodes.filter((n) => FIXED.includes(n.type)).map((n) => `${n.id}:${n.params?.kind ?? ''}:${n.params?.members ?? ''}`).sort().join()
  return fixed(circuit) === fixed(startBoard(level)) && circuit.nodes.every((n) => partOf(n.type))
}

/**
 * The board blueprint lines describe on a level: a statement with a type is a part (`partOf` gives a type's part, a
 * built part's too), its settings its params and its inputs by position or by name; a wire into an output is written
 * `sum <- s`. Throws a { line, zh, en } on text it cannot read, a part the domain does not know, or a node the level
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
    all.push({ id: st.id, type: st.type, params: Object.fromEntries(Object.entries(st.settings).map(([key, v]) => [key, String(v)])), x: 240 + (k % 3) * 220, y: 40 + Math.floor(k / 3) * 150 })
  }
  const out = wires.map((original) => {
    const w = { ...original, from: groupedSource(level, original.from) }
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
    inputs: (n) => (n.type === 'out' ? ['in'] : n.type === 'in' ? [] : portsOf(partOf(n.type), n)),
    role: (n) => (n.type === 'out' ? 'sink' : n.type === 'in' ? 'source' : 'part'),
  }
  return print(board, shape).split('\n').filter((line) => line && !line.startsWith('#'))
}
