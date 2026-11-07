// An image board, the same object everywhere: saved in progress, drawn by the shared circuit editor
// (../../../circuit), run by graph.js, written as blueprint text in content (../../../circuit/text.js).
//
//   { nodes: [{ id, type, x, y, params }], wires: [{ from, to, port }] }
//
// The level gives every board an `input` node for each of its inputs and an `output` node for each of its outputs,
// each with its id and params.name the level's name for it ('in', 'out', 'scene'); every other node is a part, its
// settings in params. A wire runs from a node into one of the ports of another.
import { parse, print } from '../../../circuit/text.js'
import { parsePi, piText } from './pi.js'

/** A setting that takes π, as the blueprint spells it ('pi/2', '-3pi/4'), or null when the value is no multiple of π. */
const piWord = (v) => piText(v)?.replace('−', '-').replace('π', 'pi') ?? null

/** A node's role on the shared circuit model: the level's inputs are the sources, its outputs the sinks. */
const roleOf = (node) => (node.type === 'input' ? 'source' : node.type === 'output' ? 'sink' : 'part')

// Where a board's nodes sit when the level lays it out: inputs down the left, outputs down the right; a board read from
// text has each part in a column by how many parts lie between it and the inputs, its outputs in the column after.
const inputAt = (k) => ({ x: 40, y: 60 + k * 220 })
const outputAt = (k, x = 560) => ({ x, y: 60 + k * 220 })
const columnX = (column) => 200 + (column - 1) * 170

function arrange(board) {
  const depth = new Map()
  const of = (id, path = new Set()) => {
    if (depth.has(id)) return depth.get(id)
    const node = board.nodes.find((n) => n.id === id)
    if (!node || node.type === 'input' || path.has(id)) return 0
    path.add(id)
    const d = 1 + Math.max(0, ...board.wires.filter((w) => w.to === id).map((w) => of(w.from, path)))
    depth.set(id, d)
    return d
  }
  const rows = new Map()
  let last = 0
  for (const node of board.nodes.filter((n) => roleOf(n) === 'part')) {
    const column = of(node.id)
    const row = rows.get(column) ?? 0
    rows.set(column, row + 1)
    last = Math.max(last, column)
    Object.assign(node, { x: columnX(column), y: 60 + row * 200 })
  }
  board.nodes.filter((n) => n.type === 'output').forEach((node, k) => Object.assign(node, outputAt(k, Math.max(560, columnX(last + 1)))))
  return board
}

/** The board a level starts from: only its inputs and outputs. */
export function startBoard({ inputs = ['in'], outputs = ['out'] }) {
  return {
    nodes: [
      ...inputs.map((name, k) => ({ id: name, type: 'input', ...inputAt(k), params: { name } })),
      ...outputs.map((name, k) => ({ id: name, type: 'output', ...outputAt(k), params: { name } })),
    ],
    wires: [],
  }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Boards as blueprint text over a course's parts (nodes.js specsOf): BOARD_TEXT and BOARD_PARTS, how the shared
 * editors and ../../../circuit/text.js read the board; toText(board) and fromText(lines, io).
 */
export function blueprintOf({ types, inputsOf, defaultParams, snapSetting }) {
  const takesPi = (type, key) => (types[type]?.params ?? []).some((p) => p.key === key && p.pi)
  /** How the board reads as text, for the shared editors' blueprints and for content. */
  const BOARD_TEXT = {
    value: (node, key, v) => (takesPi(node.type, key) && piWord(v) ? piWord(v) : v),
    read: (node, key, v) => (typeof v === 'string' && takesPi(node.type, key) && parsePi(v) !== null ? parsePi(v) : v),
  }
  /** The board's nodes as the shared circuit model sees them. */
  const BOARD_PARTS = { role: roleOf, inputs: (node) => (node.type ? inputsOf(node.type) : []), text: BOARD_TEXT }

  /**
   * A board as blueprint lines (content writes reference boards this way): each part after what it reads,
   * `id = type[settings](its inputs in order)`, with the settings that differ from the part's defaults and its main
   * choice (a choice of buttons: Shift's direction, Arithmetic's operation) always; then the wires into the outputs,
   * `out <- k`.
   */
  function toText(board) {
    const shown = (type, key, v) => {
      const param = (types[type]?.params ?? []).find((p) => p.key === key)
      return Boolean(param?.buttons) || !same(v, defaultParams(type)[key])
    }
    const nodes = board.nodes.map((n) => (BOARD_PARTS.role(n) === 'part' ? { ...n, params: Object.fromEntries(Object.entries(n.params ?? {}).filter(([k, v]) => shown(n.type, k, v))) } : n))
    return print({ ...board, nodes }, BOARD_PARTS).split('\n').filter((line) => line && !line.startsWith('#'))
  }

  /**
   * The board blueprint lines describe, on a level with these inputs and outputs: every part with its settings (the
   * others its defaults, each on the grid the player's controls snap to), laid out as the level lays a board out.
   * Throws { line, zh, en } at the first thing it cannot read.
   */
  function fromText(lines, { inputs = ['in'], outputs = ['out'] } = {}) {
    const { statements, wires } = parse(lines.join('\n'))
    const board = startBoard({ inputs, outputs })
    const fail = (line, zh, en) => {
      throw { line, zh: `第 ${line} 行：${zh}`, en: `Line ${line}: ${en}` }
    }
    statements.forEach((st) => {
      if (!st.type) fail(st.line, `「${st.id}」不是这一关的输入或输出，要写出它是什么元件。`, `“${st.id}” is no input or output of the level; say which part it is.`)
      if (!types[st.type] || types[st.type].fixed) fail(st.line, `没有元件「${st.type}」。`, `There is no part “${st.type}”.`)
      if (board.nodes.some((n) => n.id === st.id)) fail(st.line, `「${st.id}」写了两次。`, `“${st.id}” is written twice.`)
      const known = new Set((types[st.type].params ?? []).map((p) => p.key))
      for (const key of Object.keys(st.settings)) if (!known.has(key)) fail(st.line, `「${st.type}」没有设置「${key}」。`, `“${st.type}” has no setting “${key}”.`)
      const node = { id: st.id, type: st.type }
      const set = Object.fromEntries(Object.entries(st.settings).map(([key, v]) => [key, snapSetting(st.type, key, BOARD_TEXT.read(node, key, v))]))
      board.nodes.push({ ...node, x: 0, y: 0, params: { ...defaultParams(st.type), ...set } })
    })
    for (const w of wires) {
      const to = board.nodes.find((n) => n.id === w.to)
      if (!to) fail(w.line, `没有叫「${w.to}」的元件。`, `There is no node called “${w.to}”.`)
      if (!board.nodes.some((n) => n.id === w.from)) fail(w.line, `没有叫「${w.from}」的元件。`, `There is no node called “${w.from}”.`)
      const ports = BOARD_PARTS.inputs(to)
      const port = typeof w.port === 'number' ? ports[w.port] : w.port
      if (!ports.includes(port)) fail(w.line, `「${w.to}」没有这个输入口。`, `“${w.to}” has no such input.`)
      if (board.wires.some((x) => x.to === to.id && x.port === port)) fail(w.line, `「${w.to}」的「${port}」口接了两根线。`, `Input “${port}” of “${w.to}” takes two wires.`)
      board.wires.push({ from: w.from, to: to.id, port })
    }
    return arrange(board)
  }

  return { BOARD_TEXT, BOARD_PARTS, toText, fromText }
}
