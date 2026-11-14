// The board of a circuit task (games/DESIGN.md 6.3): the cards the task gives it, where they stand, how a saved board
// still fits the task, and the board as blueprint text. A domain says which cards its tasks give:
//
//   circuitBoard({ cards, ticks, right, gap }) → { ticks, FIXED, FIXED_PARTS, isFixed, portsIn, portsOut, labelOf,
//     sourceOf, fixedOf, startBoard, fits, carriedOnto, wiring, fromText, toText }
//       cards  [{ type, side: 'left' | 'right', of(task) → [{ name, label }], params?(port), part?, group?(task) }]
//              in board order: the cards a level gives (its inputs, outputs, wires…), each a source on the left or a sink
//              on the right unless it gives its own part (a line heard, a line driven); group(task) → [{ name, label,
//              members: [port name] }] ports of a left card that stand on one card together, one output a member (a
//              board reads it as `group.member`), while the task's ports, and a part its board becomes, stay one each
//       ticks  the board runs tick by tick (./ticks.js), so its wires may feed back
//     A task that gives the board it opens on (`starter`, blueprint text read like its answer) starts on a copy of it.
//   INPUTS, OUTPUTS   the cards most boards are given: a task's inputs down the left, its outputs down the right
//   flowBoard()       the board of a domain whose levels give just those, run once
//   primitivesOnly(board, parts)   a course of the game's primitives alone
//
// A board is { nodes: [{ id, type, params, x?, y? }], wires: [{ from, to, port }] }; as text it is the kernel's
// blueprint (../circuit/text.js), read and checked there.
import { print, read } from '../circuit/text.js'
import { sink, source } from './boards.js'
import { portsOf } from './circuit.js'

export function circuitBoard({ cards, ticks = false, right = 980, gap = 140 }) {
  const FIXED = cards.map((c) => c.type)
  // A left card that groups ports gives each member as an output of its own.
  const grouping = source({ outputs: (node) => node.params?.members?.split(',') ?? null, eval: (_, node, ctx, key) => ctx.bind?.[node.params.members ? key : node.params.name] })
  const FIXED_PARTS = Object.fromEntries(cards.map((c) => [c.type, c.part ?? (c.side === 'left' ? (c.group ? grouping : source()) : sink())]))
  const side = (task, s) => cards.filter((c) => c.side === s).flatMap((c) => c.of(task).map((p) => ({ card: c, port: p })))
  const portsIn = (task) => side(task, 'left').map((x) => x.port)
  const portsOut = (task) => side(task, 'right').map((x) => x.port)
  const groupsOf = (task) => cards.flatMap((c) => c.group?.(task) ?? [])
  const groupOf = (task, name) => groupsOf(task).find((g) => g.members.includes(name))
  /** What a task's port, or a group of its ports, is called. */
  const labelOf = (task, name) => [...portsIn(task), ...portsOut(task), ...groupsOf(task)].find((p) => p.name === name)?.label ?? name
  /** Where a wire from one of a task's ports on the left starts: its card, or its output on its group's card. */
  const sourceOf = (task, name) => (groupOf(task, name) ? `${groupOf(task, name).name}#${name}` : name)
  // A side's cards: a port's own, or its group's, where the group's first member stands.
  const placed = (task, s) => side(task, s).flatMap(({ card, port }) => {
    const group = card.group && groupOf(task, port.name)
    if (!group) return [{ id: port.name, type: card.type, params: card.params ? card.params(port) : { name: port.name } }]
    return group.members[0] === port.name ? [{ id: group.name, type: card.type, params: { name: group.name, members: group.members.join(',') } }] : []
  })
  const fixedOf = (task) => [...placed(task, 'left').map((n, k) => ({ ...n, x: 20, y: 40 + k * gap })), ...placed(task, 'right').map((n, k) => ({ ...n, x: right, y: 40 + k * gap }))]
  const copy = (b) => ({ nodes: b.nodes.map((n) => ({ ...n, params: { ...n.params } })), wires: b.wires.map((w) => ({ ...w })) })
  const startBoard = (task) => (task.starter ? copy(task.starter) : { nodes: fixedOf(task), wires: [] })
  const isFixed = (type) => FIXED.includes(type)
  const sinks = new Set(cards.filter((c) => c.side === 'right').map((c) => c.type))

  /** Whether a saved board still fits its task: the task's fixed cards as they are set, and every card one the domain knows. */
  const fits = (board, task, partOf) => {
    const given = (nodes) => nodes.filter((n) => isFixed(n.type)).map((n) => JSON.stringify([n.id, n.type, Object.entries(n.params ?? {}).sort()])).sort().join()
    return given(board.nodes) === given(fixedOf(task)) && board.nodes.every((n) => partOf(n.type))
  }

  /** A board from another level brought onto `task`: its placed parts and their wires, and its wires to the fixed cards this task has too. */
  const carriedOnto = (task, board) => {
    const fixed = fixedOf(task)
    const placed = board.nodes.filter((n) => !isFixed(n.type))
    const own = new Map(fixed.map((n) => [n.id, n]))
    const ids = new Set([...fixed, ...placed].map((n) => n.id))
    const from = (w) => w.from.split('#')[0]
    const keeps = (w) => ids.has(from(w)) && ids.has(w.to) && (!own.has(w.to) || w.port === 'in') && (!own.has(from(w)) || board.nodes.find((n) => n.id === from(w))?.type === own.get(from(w)).type)
    return { ...board, nodes: [...fixed, ...placed], wires: board.wires.filter(keeps) }
  }

  /** How the editor and the blueprint reader wire a task's cards (../circuit/model.js parts): `circuit` is the course read. */
  const wiring = (task, circuit) => ({
    loops: ticks,
    // What keeps a value for the next tick: a card that stores a register, or a built part that holds its own.
    holds: (n) => Boolean(circuit.partOf(n.type)?.store || circuit.partOf(n.type)?.holds),
    // A setting is kept as the words it is written in ({ reg: 'A', start: '1' }); the parts read them.
    text: { read: (_node, _key, v) => String(v) },
    inputs: (n) => {
      if (sinks.has(n.type)) return ['in']
      if (isFixed(n.type)) return []
      // A built part's inputs are its own ports (by default its board's inputs, in the shape the node's form picks).
      if (circuit.BUILT[n.type]) return portsOf(circuit.BUILT[n.type], n)
      const part = circuit.partOf(n.type)
      return part ? portsOf(part, n) : []
    },
    role: (n) => (sinks.has(n.type) ? 'sink' : isFixed(n.type) ? 'source' : 'part'),
    packed: (n) => Boolean(circuit.BUILT[n.type]),
    // A built part's outputs are its board's; a part's (a group card's members, a game's part of several), its own.
    outputs: (n) => {
      if (circuit.BUILT[n.type]) {
        const outs = portsOut(circuit.builtBy(n.type, n.params))
        return outs.length > 1 ? outs.map((o) => ({ key: o.name, label: o.label })) : null
      }
      return circuit.partOf(n.type)?.outputs?.(n)?.map((key) => ({ key, label: isFixed(n.type) ? labelOf(task, key) : key })) ?? null
    },
  })

  /** The board blueprint lines describe on `task` (the kernel's reader); throws the first { line, zh, en } it cannot read. */
  const fromText = (lines, task, circuit) => {
    const got = read(lines.join('\n'), { nodes: fixedOf(task), wires: [] }, wiring(task, circuit), circuit.types())
    if (got.errors) throw got.errors[0]
    return got.graph
  }
  /** A board as blueprint lines, as content writes it (no header): what fromText reads back on the task. */
  const toText = (board, task, circuit) => print(board, wiring(task, circuit)).split('\n').filter((line) => line && !line.startsWith('#'))

  return { ticks, FIXED, FIXED_PARTS, isFixed, portsIn, portsOut, labelOf, sourceOf, fixedOf, startBoard, fits, carriedOnto, wiring, fromText, toText }
}

/** A task's inputs down the left of its board, and its outputs down the right. */
export const INPUTS = { type: 'in', side: 'left', of: (task) => task.inputs ?? [] }
export const OUTPUTS = { type: 'out', side: 'right', of: (task) => task.outputs ?? [] }

/** The board of a domain whose levels give it only inputs and outputs, and that runs once. */
export const flowBoard = () => circuitBoard({ cards: [INPUTS, OUTPUTS], right: 900, gap: 120 })

/** A circuit of the game's primitives alone, no part built: what a board reads on outside a course (a test, a tool). */
export const primitivesOnly = (board, parts) => ({ BUILT: {}, partOf: (t) => board.FIXED_PARTS[t] ?? parts[t], types: () => Object.keys(parts).filter((t) => !board.isFixed(t)), builtBy: () => null })
