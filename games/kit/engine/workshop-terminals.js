import { sourceOf, splitSource } from './wire-source.js'

export const WORKSHOP_INPUT = '$workshopInput'
export const WORKSHOP_OUTPUT = '$workshopOutput'
export const MAX_TERMINAL_PORTS = 16

export const terminalRole = (parts, node) => node.type === WORKSHOP_INPUT ? 'source' : node.type === WORKSHOP_OUTPUT ? 'sink' : parts.role(node)
const cardLabel = (parts, node) => node.type === WORKSHOP_INPUT || node.type === WORKSHOP_OUTPUT ? node.params?.name ?? node.id : parts.label(node) ?? node.id

export function terminalPorts(parts, node) {
  return node.terminal?.ports ?? (terminalRole(parts, node) === 'source'
    ? (node.type === WORKSHOP_INPUT ? null : parts.outputs?.(node))?.map(({ key, label }) => ({ key, native: key, label: label || key }))
      ?? [{ key: null, native: null, label: cardLabel(parts, node) }]
    : (node.type === WORKSHOP_OUTPUT ? ['in'] : parts.inputs(node)).map((key) => ({
      key, native: key, label: cardLabel(parts, node),
    })))
}

export function workshopTerminalParts(parts) {
  return {
    ...parts,
    role: (node) => terminalRole(parts, node),
    label: (node) => node.terminal?.text ?? cardLabel(parts, node),
    inputs: (node) => terminalRole(parts, node) === 'sink' ? terminalPorts(parts, node).map(({ key }) => key)
      : node.type === WORKSHOP_INPUT ? [] : parts.inputs(node),
    outputs: (node) => terminalRole(parts, node) === 'source'
      ? (node.terminal || node.type === WORKSHOP_INPUT ? terminalPorts(parts, node) : parts.outputs?.(node))
      : parts.outputs?.(node),
    portLabel: (node, key) => node.terminal?.ports.find((port) => port.key === key)?.label ?? parts.portLabel?.(node, key),
    refuse: parts.refuse && ((graph, wire) => {
      const normalized = flattenWorkshopTerminals(graph, parts)
      return parts.refuse(normalized.graph, normalized.graph.wires[graph.wires.indexOf(wire)])
    }),
  }
}

/** Every port label on one side of a draft, optionally leaving one card out. */
export const sideLabels = (graph, parts, role, except) => graph.nodes
  .filter((node) => terminalRole(parts, node) === role && node.id !== except)
  .flatMap((node) => terminalPorts(parts, node).map(({ label }) => label))

/** A new terminal with one port. Card and port share one name, numbered past the labels its side already has (`read` turns a label into its text). */
export function addWorkshopTerminal(graph, parts, role, label, read = String) {
  const stem = role === 'source' ? 'in' : 'out'
  const id = freeId(new Set(graph.nodes.map((node) => node.id)), stem)
  const sameSide = graph.nodes.filter((node) => terminalRole(parts, node) === role)
  const placed = sameSide.filter((node) => Number.isFinite(node.x) && Number.isFinite(node.y)).at(-1)
  const type = role === 'source' ? WORKSHOP_INPUT : WORKSHOP_OUTPUT
  const node = { id, type, params: { name: id }, ...(placed && { x: placed.x, y: placed.y + 120 }) }
  const name = freeLabel(new Set(sideLabels(graph, parts, role).map(read)), label)
  node.terminal = { text: name, ports: terminalPorts(parts, node).map((port) => ({ ...port, label: name })) }
  return { ...graph, nodes: [...graph.nodes, node] }
}

export function editWorkshopTerminal(graph, parts, id, terminal) {
  const node = graph.nodes.find((card) => card.id === id)
  const source = terminalRole(parts, node) === 'source'
  const keys = new Set(terminal?.ports.map(({ key }) => key))
  const nodes = terminal ? graph.nodes.map((card) => card.id === id ? { ...card, terminal } : card) : graph.nodes.filter((card) => card.id !== id)
  const wires = graph.wires.filter(({ from, to, port }) => {
    const [fromId, key] = splitSource(from)
    if (!terminal) return fromId !== id && to !== id
    return source ? fromId !== id || keys.has(key) : to !== id || keys.has(port)
  })
  return { ...graph, nodes, wires }
}

/** One more port after a terminal's own, named after the card and numbered past the labels in `taken`. */
export function addTerminalPort(ports, stem, taken = []) {
  const key = freeId(new Set(ports.map((port) => port.key)), '$port')
  return [...ports, { key, native: ports[0]?.native ?? null, label: freeLabel(new Set(taken), stem, ports.length + 1) }]
}

// Translate draft-only ports into ordinary domain terminals. The packed runner therefore sees a normal board.
export function flattenWorkshopTerminals(graph, parts, label = String) {
  const taken = new Set(graph.nodes.map((node) => node.id))
  const sources = new Map(), sinks = new Map()
  const names = { inputs: {}, outputs: {} }
  const missing = []
  const fed = new Map()
  for (const { to, port } of graph.wires) {
    if (!fed.has(to)) fed.set(to, new Set())
    fed.get(to).add(port)
  }
  const nodes = graph.nodes.flatMap((node) => {
    const role = terminalRole(parts, node)
    if (role === 'part') return [node]
    const { terminal, ...original } = node
    const pins = terminalPorts(parts, node)
    return pins.map(({ key, native, label: title }, index) => {
      const id = index > 0 && (terminal || role === 'sink') ? freeId(taken, node.id + '_port') : node.id
      if (role === 'source') {
        const ref = sourceOf(node.id, key)
        const target = sourceOf(id, native)
        sources.set(ref, target)
        names.inputs[target] = label(title ?? node.id)
      } else {
        if (!sinks.has(node.id)) sinks.set(node.id, new Map())
        sinks.get(node.id).set(key, { id, native: index > 0 ? 'in' : native })
        names.outputs[id] = label(title ?? node.id)
        if (!fed.get(node.id)?.has(key)) missing.push(names.outputs[id])
      }
      return id === node.id ? original : { ...original, id, ...(role === 'sink' && { type: WORKSHOP_OUTPUT }), y: (original.y ?? 0) + 40 * index }
    }).filter((card, index) => index === 0 || card.id !== node.id)
  })
  const wires = graph.wires.map((wire) => {
    const to = sinks.get(wire.to)?.get(wire.port)
    return { ...wire, from: sources.get(wire.from) ?? wire.from, ...(to && { to: to.id, port: to.native }) }
  })
  return { graph: { ...graph, nodes, wires }, names, order: [...sources.values()], missing }
}

function freeLabel(taken, stem, from = 1) {
  if (from === 1 && !taken.has(stem)) return stem
  let index = Math.max(from, 2)
  while (taken.has(`${stem} ${index}`)) index += 1
  return `${stem} ${index}`
}

function freeId(taken, stem) {
  let index = 1
  while (taken.has(stem + index)) index += 1
  const id = stem + index
  taken.add(id)
  return id
}
