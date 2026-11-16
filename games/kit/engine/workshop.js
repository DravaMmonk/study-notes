// Player-owned circuit artifacts. Versions are immutable; the visible library points at the latest publication.
import { packed, source, withBoardRuntime } from './boards.js'
import { canonicalJson } from './json-value.js'
import { defaultOf } from './parts/define.js'
import { resolveSettings } from './pieces.js'
import { sourceOf, splitSource } from './wire-source.js'
import { trayMembers } from './trays.js'

export const WORKSHOP_KEY = 'games.workshop.v1'
const INPUT = '$workshopInput'
export const isWorkshopType = (type) => typeof type === 'string' && type.startsWith('user_')
export const usesWorkshop = (board) => Array.isArray(board?.nodes) && board.nodes.some(({ type }) => isWorkshopType(type))
const empty = () => ({ pieces: {}, published: {}, featured: {}, drafts: {} })

export function loadWorkshop(storage) {
  try {
    const value = JSON.parse(storage.getItem(WORKSHOP_KEY))
    return value?.pieces && value?.published && value?.featured ? { ...value, drafts: value.drafts ?? {} } : empty()
  } catch {
    return empty()
  }
}

/** Publish a snapshot. Auto upgrades use an explicit, stable lineage, never the displayed name. */
export function publishWorkshop(library, piece, { id, lineage = null, rank = 0, replaces = [] }) {
  if (lineage && library.published[lineage] === null) return library
  const previous = lineage && library.pieces[library.published[lineage]]
  if (previous && (previous.rank > rank || (previous.rank === rank
    && JSON.stringify(previous.graph) === JSON.stringify(piece.graph)))) return library
  return {
    ...library,
    pieces: { ...library.pieces, [id]: { ...piece, id, lineage, rank } },
    published: lineage ? {
      ...library.published, ...Object.fromEntries(replaces.map((old) => [old, null])), [lineage]: id,
    } : library.published,
  }
}

export function featureWorkshop(library, tray, id, enabled) {
  if (library.pieces[id]?.deleted) return library
  const featured = new Set(library.featured[tray])
  if (enabled) featured.add(id)
  else featured.delete(id)
  return { ...library, featured: { ...library.featured, [tray]: [...featured] } }
}

/** Remove a hand-built piece from the catalogue while retaining its immutable version for existing boards. */
export function removeWorkshopPart(library, id) {
  if (!Object.hasOwn(library.pieces, id)) return library
  const piece = library.pieces[id]
  if (piece.lineage || piece.deleted) return library
  const featured = Object.fromEntries(Object.entries(library.featured)
    .map(([tray, ids]) => [tray, ids.filter((featuredId) => featuredId !== id)])
    .filter(([, ids]) => ids.length))
  return { ...library, pieces: { ...library.pieces, [id]: { ...piece, deleted: true } }, featured }
}

/** Keep a tray's unfinished board: { graph, names }, or nothing once it is cleared. */
export function draftWorkshop(library, tray, draft) {
  const { [tray]: _gone, ...drafts } = library.drafts
  return { ...library, drafts: draft ? { ...drafts, [tray]: draft } : drafts }
}

export const workshopEntries = (library) => Object.values(library.pieces)
  .filter(({ id, lineage, deleted }) => !deleted && (!lineage || library.published[lineage] === id))

export const trayTypes = (trays, name) => new Set(trayMembers(trays[name]))
export const trayKey = (game, name) => JSON.stringify([game, name])
export const workshopInTray = (piece, tray, types) => piece.tray === tray
  || ((!piece.tray || JSON.parse(piece.tray)[0] !== JSON.parse(tray)[0]) && piece.requirements.every(({ type }) => types.has(type)))

/** Include the domain's operations and the piece's executable declaration in its identity. */
export function workshopIdentity(domain, definitions, type) {
  const definition = definitions?.parts?.[type]
  if (!definition) return canonicalJson([domain, type, null])
  const { compute, keeps, nulls, inputs, outputs, regions, checks } = definition
  // Resolve catalog references before comparing the settings used by the circuit.
  const settings = resolveSettings(definitions, definition).map((setting) => {
    const { key, control, optional, integer, min, max, options, from } = setting
    return { key, control, default: defaultOf(setting), optional, integer, min, max,
      options: options?.map(({ value }) => value), from }
  })
  return canonicalJson([domain, type, {
    compute, keeps, nulls, settings,
    inputs: inputs?.map(({ name, optional }) => [name, optional]),
    outputs: outputs?.map(({ name }) => name),
    regions: regions?.map(({ name, opens, closes, gives, when }) => [name, opens, closes, gives, when]),
    checks: checks?.map(({ holds }) => holds),
  }])
}

const NAME_LENGTH = 24
const plain = (parts, node) => !parts.outputs?.(node)
const endsOf = (graph, parts, side) => graph.nodes.filter((node) => parts.role(node) === (side === 'inputs' ? 'source' : 'sink'))

/**
 * The interface a board would be packaged with, in board order: { inputs, outputs }, each port
 * { ref, node, name, wired, plain }. A terminal of its own (`plain`) is one port, wired or not; a source that gives
 * several outputs is a port for each output a wire reads. `names` renames ports by side and ref.
 */
export function workshopPorts(graph, parts, names = {}) {
  const read = new Set(graph.wires.map(({ from }) => from))
  const fed = new Set(graph.wires.map(({ to }) => to))
  const named = (side, ref, base) => names[side]?.[ref] ?? base
  const inputs = endsOf(graph, parts, 'inputs').flatMap((node) => plain(parts, node)
    ? [{ ref: node.id, node: node.id, name: named('inputs', node.id, node.params?.name ?? node.id), wired: read.has(node.id), plain: true }]
    : parts.outputs(node).map(({ key }) => sourceOf(node.id, key)).filter((ref) => read.has(ref))
      .map((ref) => ({ ref, node: node.id, name: named('inputs', ref, splitSource(ref)[1]), wired: true, plain: false })))
  const outputs = endsOf(graph, parts, 'outputs').map((node) => ({
    ref: node.id, node: node.id, name: named('outputs', node.id, node.params?.name ?? node.id), wired: fed.has(node.id), plain: true,
  }))
  return { inputs, outputs }
}

/** Another terminal on one side of the board, made like the last one there; null when the side has none to copy. */
export function addWorkshopPort(graph, parts, side) {
  const like = endsOf(graph, parts, side).filter((node) => plain(parts, node)).at(-1)
  if (!like) return null
  const taken = new Set(graph.nodes.map(({ id }) => id))
  const stem = side === 'inputs' ? 'in' : 'out'
  let k = 1
  while (taken.has(`${stem}${k}`)) k += 1
  const column = graph.nodes.filter((node) => parts.role(node) === parts.role(like) && Number.isFinite(node.y))
  const ys = column.map(({ y }) => y).sort((a, b) => a - b)
  const gap = ys.length > 1 ? ys.at(-1) - ys.at(-2) : 120
  const place = Number.isFinite(like.x) ? { x: like.x, y: ys.at(-1) + gap } : {}
  return { ...graph, nodes: [...graph.nodes, { id: `${stem}${k}`, type: like.type, params: { ...like.params, name: `${stem}${k}` }, ...place }] }
}

/** The board without one of its own terminals and that terminal's wires; a side keeps its last one. */
export function dropWorkshopPort(graph, parts, side, ref) {
  const own = endsOf(graph, parts, side).filter((node) => plain(parts, node))
  if (own.length < 2 || !own.some(({ id }) => id === ref)) return graph
  return {
    ...graph,
    nodes: graph.nodes.filter(({ id }) => id !== ref),
    wires: graph.wires.filter(({ from, to }) => splitSource(from)[0] !== ref && to !== ref),
  }
}

/** `names` with one port renamed, or null when the name is empty, too long, or another port's on that side. */
export function nameWorkshopPort(names, ports, side, ref, text) {
  const name = text.trim()
  if (!name || name.length > NAME_LENGTH || ports[side].some((port) => port.ref !== ref && port.name === name)) return null
  return { ...names, [side]: { ...names[side], [ref]: name } }
}

/** Snapshot the board's executable interface, including nested implementations and their base requirements.
 *  `names` ({ inputs, outputs } by ref) and `order` (input refs) are the interface the workshop page shows. */
export function captureWorkshop(graph, options) {
  let nextChild = 0
  const gather = (board, parts, open, face, ancestry) => {
    const sourcePins = new Map()
    const nodes = [], requirements = [], children = {}, nestedTerminals = new Set()
    const inputSignals = {}
    const sourceNodes = new Map(board.nodes.filter((node) => parts.role(node) === 'source').map((node) => [node.id, node]))
    const taken = new Set(board.nodes.map(({ id }) => id))
    const labels = new Set()
    const read = new Set(board.wires.map(({ from }) => from))
    for (const ref of [...(face?.order ?? []), ...read]) {
      const [id, key] = splitSource(ref)
      const from = sourceNodes.get(id)
      if (!from || !read.has(ref) || sourcePins.has(ref)) continue
      const base = key == null ? from.params?.name ?? id : key
      let port = face?.input?.(base, ref) ?? base
      const prefix = port
      for (let suffix = 2; labels.has(port); suffix += 1) port = `${prefix}_${suffix}`
      labels.add(port)
      if (parts.signalOf) inputSignals[port] = parts.signalOf(board, ref)
      let pin = `pin_${sourcePins.size + 1}`
      while (taken.has(pin)) pin += '_'
      taken.add(pin)
      sourcePins.set(ref, { id: pin, type: INPUT, x: from.x, y: (from.y ?? 40) + sourcePins.size * 35, params: { name: port } })
    }
    const wires = board.wires.map((wire) => sourcePins.has(wire.from) ? { ...wire, from: sourceOf(sourcePins.get(wire.from).id) } : wire)
    for (const node of board.nodes) {
      if (parts.role(node) === 'source') continue
      if (parts.role(node) === 'sink') {
        nodes.push({ ...node, params: { ...node.params, name: face?.output?.(node.id) ?? node.params?.name ?? node.id } })
        continue
      }
      const own = Object.hasOwn(options.book.pieces, node.type) && options.book.pieces[node.type]
      if (own) {
        requirements.push(...own.requirements)
        for (const type of own.terminals) nestedTerminals.add(type)
        nodes.push(node)
      } else if (parts.packed?.(node) || options.needsSnapshot?.(node.type)) {
        if (ancestry.has(node.type)) return null
        const opened = open?.(node)
        if (!opened) return null
        const inputs = parts.inputs(node)
        const outputs = parts.outputs(node)?.map(({ key }) => key).filter((key) => key != null)
        const index = opened.level?.ports?.map(({ sensor, input }) => sensor ?? input)
        const named = (name) => {
          if (inputs.includes(name)) return name
          const at = index?.indexOf(name) ?? -1
          return at >= 0 ? inputs[at] : inputs.length === 1 ? inputs[0] : name
        }
        const child = gather(opened.circuit, opened.parts, opened.open, { input: named }, new Set([...ancestry, node.type]))
        if (!child || child.inputs.some((name) => !inputs.includes(name))
          || (outputs?.length ? outputs.join() !== child.outputs.join() : child.outputs.length !== 1)) return null
        const id = `${options.scope}_${++nextChild}`
        children[id] = { ...child, inputs, name: parts.label(node), description: '' }
        requirements.push(...child.requirements)
        nodes.push({ ...node, type: id, params: {} })
      } else {
        if (isWorkshopType(node.type) || !options.resolve(node.type)) return null
        requirements.push({
          type: node.type,
          identity: options.identity(node.type),
          settings: { ...options.defaults(node.type), ...node.params },
        })
        nodes.push(node)
      }
    }
    const sinks = nodes.filter((node) => board.nodes.some((original) => original.id === node.id && parts.role(original) === 'sink'))
    if (!sinks.length || !sinks.every(({ id }) => wires.some(({ to }) => to === id))) return null
    const outputSignals = parts.signalOf ? Object.fromEntries(sinks.map((node) => [
      node.params.name, parts.signalOf(board, board.wires.find(({ to }) => to === node.id).from),
    ])) : {}
    const terminals = new Set([...sinks.map(({ type }) => type), ...nestedTerminals, ...Object.values(children).flatMap((child) => child.terminals)])
    return {
      inputSignals, outputSignals, children, terminals: [...terminals],
      inputs: [...sourcePins.values()].map((node) => node.params.name),
      outputs: sinks.map((node) => node.params.name),
      graph: { nodes: [...sourcePins.values(), ...nodes], wires },
      requirements: [...new Map(requirements.map((need) => [JSON.stringify(need), need])).values()],
    }
  }
  const { inputs = {}, outputs = {} } = options.names ?? {}
  const face = { order: options.order, input: (_base, ref) => inputs[ref], output: (id) => outputs[id] }
  const captured = gather(graph, options.parts, options.open, face, new Set())
  if (!captured) return null
  return JSON.parse(JSON.stringify({ ...captured, id: options.scope, domain: options.domain, name: options.name, description: options.description, tray: options.tray, rewardType: options.rewardType }))
}

export function workshopCompatible(piece, { domain, identity, resolve }) {
  return piece?.domain === domain && Array.isArray(piece?.requirements) && Array.isArray(piece.terminals)
    && piece.requirements.every(({ type, identity: signature }) =>
    Boolean(resolve(type)) && identity(type) === signature)
    && piece.terminals.every((type) => Boolean(resolve(type)))
}

export function workshopAvailable(piece, context) {
  const { types, has, allows } = context
  return workshopCompatible(piece, context) && piece.requirements.every(({ type, settings }) =>
    types.has(type) && allows(type, settings)
    && Object.entries(settings).every(([key, value]) => has(type, key) && has(type, key, String(value))))
}

export function workshopDefinitions(library) {
  const entries = new Map()
  const visit = (pieces) => {
    for (const [id, piece] of Object.entries(pieces)) {
      entries.set(id, piece)
      visit(piece.children ?? {})
    }
  }
  visit(library.pieces)
  return entries
}

/** The same packed runner is used for a manually saved board and a published reward. */
export function workshopParts(library, resolve, { ticks = false } = {}) {
  const definitions = new Map()
  const entries = workshopDefinitions(library)
  const partOf = (type) => {
    if (type === INPUT) return input
    if (!entries.has(type)) return resolve(type)
    if (!definitions.has(type)) {
      const { graph, inputs, outputs, name, description } = entries.get(type)
      definitions.set(type, packed({
        circuit: withBoardRuntime(graph, () => partOf), inputs, outputs, holds: ticks,
        name, desc: description, anySize: true,
      }))
    }
    return definitions.get(type)
  }
  return Object.assign(partOf, { definition: (type) => entries.get(type) })
}

const input = source()
export const workshopInput = (node) => node.type === INPUT

/** Count a player wrapper by its constituent nodes when a challenge scores the board. */
export function workshopNodes(graph, resolve, path = []) {
  return graph.nodes.flatMap((node) => {
    const piece = resolve?.definition(node.type)
    if (piece) return workshopNodes(piece.graph, resolve, [...path, node.id])
    return workshopInput(node) ? [] : [{ node, path }]
  })
}
