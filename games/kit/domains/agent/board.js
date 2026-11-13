// A board of 《软件工厂》, the same object everywhere: saved in progress, drawn by the shared circuit editor
// (../../circuit), run turn by turn (run.js), written as blueprint text in content (../../circuit/text.js):
//
//   { nodes: [{ id, type, params, x?, y? }], wires: [{ from, to, port }] }
//
// The level gives the board its fixed cards (parts.js FIXED), each with its type as its id: the issue, the history and
// the code an issue comes with down the left; the repository, keep and stop down the right. Every other node is a part
// the player placed (parts.js PARTS), its settings in params ({ file } for a read card). A wire runs from a node's id
// ('t#green' for one of several outputs) into a port of a part, or `in` of a fixed card on the right.
//
// As text, a part is `id = type[settings](its inputs in order)` and a wire into a fixed card `repo <- m`:
//
//   k = concat(issue, history)
//   m = model(k)
//   r = read[file="src/cart.js"]()
//   repo <- m
import { parse, print } from '../../circuit/text.js'
import { srcKey, srcNode } from '../../circuit/model.js'
import { L, T } from '../../shell/i18n.js'
import { FIXED, KIND, PARTS, kindOf, wantsOf } from './parts.js'
import { OUT_LABELS } from './words.js'

const KIND_NAME = { [KIND.context]: T('上下文'), [KIND.action]: T('动作', 'an action'), [KIND.flag]: T('是否通过') }

/**
 * How the editor wires a level's cards (../../circuit/model.js parts, without the drawing: ui/BoardScreen.jsx adds
 * names and icons). With one call there is no action to read by, so a read card has no input there. A wire carries one
 * kind of value, and a port takes the kinds it reads.
 */
export function wiring(mode) {
  return {
    inputs: (node) => (mode === 'once' && node.type === 'read' ? [] : PARTS[node.type]?.inputs ?? []),
    role: (node) => (PARTS[node.type]?.source ? 'source' : PARTS[node.type]?.sink ? 'sink' : 'part'),
    outputs: (node) => (PARTS[node.type]?.outputs ? PARTS[node.type].outputs().map((key) => ({ key, label: OUT_LABELS[node.type][key] })) : null),
    refuse: (graph, from, to, port) => {
      const source = graph.nodes.find((n) => n.id === srcNode(from))
      const target = graph.nodes.find((n) => n.id === to)
      const kind = kindOf(source, srcKey(from))
      const wants = wantsOf(target, port)
      if (!kind || wants.includes(kind)) return null
      return T(`这个接口接收${L(KIND_NAME[wants[0]])}，这根线传来的是${L(KIND_NAME[kind])}。`, `This port takes ${L(KIND_NAME[wants[0]])}; this wire carries ${L(KIND_NAME[kind])}.`)
    },
  }
}

const SOURCES = ['issue', 'history', 'code']

/** The fixed cards a level's machine gives: the issue and the repository in one call (and the code card when its tests
 *  bring code); the issue, the history, the repository, keep and stop in a loop. */
export const fixedOf = (mode, tests) => (mode === 'loop' ? ['issue', 'history', 'repo', 'out', 'stop'] : ['issue', ...(tests.some((t) => t.code) ? ['code'] : []), 'repo'])

// The fixed cards down the left (sources) and right (sinks) edges; the parts in rows of three between them.
function place(fixed, parts) {
  const cards = FIXED.filter((t) => fixed.includes(t))
  const left = cards.filter((t) => SOURCES.includes(t))
  const right = cards.filter((t) => !SOURCES.includes(t))
  return [
    ...left.map((t, k) => ({ id: t, type: t, params: { name: t }, x: 20, y: 40 + k * 150 })),
    ...right.map((t, k) => ({ id: t, type: t, params: { name: t }, x: 980, y: 40 + k * 150 })),
    ...parts.map((n, k) => ({ ...n, x: 260 + (k % 3) * 230, y: 40 + Math.floor(k / 3) * 190 })),
  ]
}

/** The board a level opens on: its fixed cards. */
export const startBoard = (level) => ({ nodes: place(level.fixed, []), wires: [] })

/**
 * The board blueprint lines describe on a level (its `fixed` cards): a statement with a type is a part, its settings
 * its params and its inputs by position or by name; a wire into a fixed card is written `repo <- m`. Throws a
 * { line, zh, en } on text it cannot read, a part the domain does not know, or a node the level does not give.
 */
export function fromText(lines, level) {
  const { statements, wires } = parse(lines.join('\n'))
  const fail = (line, zh, en) => { throw { line, zh: `第 ${line} 行：${zh}`, en: `Line ${line}: ${en}` } }
  const parts = []
  for (const st of statements) {
    if (st.type === undefined || FIXED.includes(st.type) || !PARTS[st.type]) fail(st.line, `「${st.type ?? st.id}」不是能放上板的元件。`, `“${st.type ?? st.id}” is no part to place on a board.`)
    if (level.fixed.includes(st.id) || parts.some((n) => n.id === st.id)) fail(st.line, `「${st.id}」写了两次。`, `“${st.id}” is written twice.`)
    parts.push({ id: st.id, type: st.type, params: { ...st.settings } })
  }
  const nodes = place(level.fixed, parts)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const out = wires.map((w) => {
    const from = byId.get(w.from.split('#')[0])
    const to = byId.get(w.to)
    if (!from) fail(w.line, `这一关没有叫「${w.from.split('#')[0]}」的元件。`, `This level has no node called “${w.from.split('#')[0]}”.`)
    if (!to) fail(w.line, `这一关没有叫「${w.to}」的元件。`, `This level has no node called “${w.to}”.`)
    const ports = PARTS[to.type].inputs
    const port = typeof w.port === 'number' ? ports[w.port] : w.port
    if (!ports.includes(port)) fail(w.line, `「${w.to}」没有这个输入口。`, `“${w.to}” has no such input.`)
    return { from: w.from, to: w.to, port }
  })
  return { nodes, wires: out }
}

// The shape of a board's cards for the blueprint printer (../../circuit/text.js): each card's ports, and which are the
// level's own.
const SHAPE = { inputs: (n) => PARTS[n.type].inputs, role: (n) => (PARTS[n.type].source ? 'source' : PARTS[n.type].sink ? 'sink' : 'part') }

/** A board as blueprint lines, as content writes it (no header): what fromText reads back. */
export const toText = (board) => print(board, SHAPE).split('\n').filter((line) => line && !line.startsWith('#'))
