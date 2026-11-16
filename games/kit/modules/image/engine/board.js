// An image board, the same object everywhere: saved in progress, drawn by the shared circuit editor
// (../../../circuit), run by graph.js, written as blueprint text in content (../../../circuit/text.js).
//
//   { nodes: [{ id, type, x, y, params }], wires: [{ from, to, port }] }
//
// The level gives every board an `input` node for each of its inputs and an `output` node for each of its outputs,
// each with its id and params.name the level's name for it ('in', 'out', 'scene'); every other node is a part, its
// settings in params. A wire runs from a node into one of the ports of another.
import { sameJson } from '../../../engine/json-value.js'
import { boardFits, wirePortRefusal } from '../../../circuit/model.js'
import { fixedCardsFit } from '../../../engine/board-cards.js'
import { printLines, readLines } from '../../../circuit/text.js'
import { parsePi, piText } from './pi.js'

/** Use the symbolic spelling only if reading it recovers the original value. */
const piWord = (v) => {
  const word = piText(v)?.replace('−', '-').replace('π', 'pi')
  return word && parsePi(word) === v ? word : v
}

/** A node's role on the shared circuit model: the level's inputs are the sources, its outputs the sinks. */
const roleOf = (node) => (node.type === 'input' ? 'source' : node.type === 'output' ? 'sink' : 'part')

// The level's terminals are the starting anchors for the shared blueprint layout.
const inputAt = (k) => ({ x: 40, y: 60 + k * 220 })
const outputAt = (k) => ({ x: 560, y: 60 + k * 220 })

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

/** The port and setting rules used by image blueprints and the circuit editors. */
export function blueprintOf({ types, inputsOf, defaultParams }) {
  const paramOf = (type, key) => types[type]?.params?.find((p) => p.key === key)
  const text = {
    settings: (node) => (types[node.type]?.params ?? []).map((p) => p.key),
    value: (node, key, v) => paramOf(node.type, key)?.pi ? piWord(v) : v,
    read: (node, key, v) => {
      const pi = paramOf(node.type, key)?.pi && typeof v === 'string' ? parsePi(v) : null
      return pi ?? v
    },
  }
  const channelOutputs = [{ key: null, label: 'Image' }, ...['r', 'g', 'b'].map((key) => ({ key, label: key.toUpperCase() }))]
  const boardParts = (example) => {
    const colour = (node, side) => !example || example[side]?.[node.params.name]?.c === 3
    return {
      role: roleOf,
      defaults: defaultParams,
      inputs: (node) => {
        if (node.type === 'output' && !colour(node, 'expected')) return ['in']
        if (!node.type) return []
        return inputsOf(node.type).filter((port) => node.type !== 'image:arith' || node.params?.constantSide !== port)
      },
      outputs: (node) => {
        if (node.type === 'input') return colour(node, 'inputs') ? channelOutputs : null
        if (node.type === 'output') return null
        const spec = types[node.type]
        const keys = typeof spec?.outputs === 'function' ? spec.outputs(node) : spec?.outputs
        return keys?.map((key) => ({ key, label: spec.outputLabels?.[key] ?? key })) ?? null
      },
      text,
    }
  }

  /**
   * A board as blueprint lines (content writes reference boards this way): each part after what it reads,
   * `id = type[settings](its inputs in order)`, with the settings that differ from the part's defaults and its main
   * choice (a choice of buttons: Shift's direction, Arithmetic's operation) always; then the wires into the outputs,
   * `out <- k`.
   */
  function toText(board) {
    const shown = (type, key, v) => {
      const param = paramOf(type, key)
      return Boolean(param?.buttons) || !sameJson(v, defaultParams(type)[key])
    }
    const nodes = board.nodes.map((n) => (roleOf(n) === 'part' ? { ...n, params: Object.fromEntries(Object.entries(n.params ?? {}).filter(([k, v]) => shown(n.type, k, v))) } : n))
    return printLines({ ...board, nodes }, boardParts())
  }

  function fromText(lines, task = {}) {
    const typesHere = Object.keys(types).filter((type) => !types[type].fixed)
    return readLines(lines, startBoard(task), boardParts(task.tests?.[0]), typesHere)
  }

  const fits = (board, task, { parts = boardParts(task.tests?.[0]), knows = (type) => Object.hasOwn(types, type) } = {}) => boardFits(board, parts, knows)
    && fixedCardsFit(board, startBoard(task).nodes, (type) => type === 'input' || type === 'output')

  return { boardParts, fits, toText, fromText }
}

// The available ports follow the currently selected operation and settings.
export function tidyImageBoard(board, parts) {
  const nodes = new Map(board.nodes.map((node) => [node.id, node]))
  return { ...board, wires: board.wires.filter((wire) => !wirePortRefusal(parts, wire, (id) => nodes.get(id))) }
}
