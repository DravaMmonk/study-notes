// Player-owned circuit artifacts. Versions are immutable; the visible library points at the latest publication.
import { packed, source } from './boards.js'
import { canonicalJson } from './json-value.js'
import { defaultOf } from './parts/define.js'
import { resolveSettings } from './pieces.js'
import { sourceOf, splitSource } from './wire-source.js'
import { trayMembers } from './trays.js'

export const WORKSHOP_KEY = 'games.workshop.v1'
const INPUT = '$workshopInput'
const isPersonal = (type) => type.startsWith('user_')
const empty = () => ({ pieces: {}, published: {}, featured: {} })

export function loadWorkshop(storage) {
  try {
    const value = JSON.parse(storage.getItem(WORKSHOP_KEY))
    return value?.pieces && value?.published && value?.featured ? value : empty()
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
  const featured = new Set(library.featured[tray])
  if (enabled) featured.add(id)
  else featured.delete(id)
  return { ...library, featured: { ...library.featured, [tray]: [...featured] } }
}

export const workshopEntries = (library) => Object.values(library.pieces)
  .filter(({ id, lineage }) => !lineage || library.published[lineage] === id)

export const trayTypes = (trays, name) => new Set(trayMembers(trays[name] ?? []))
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

/** Snapshot the board's executable interface, including nested implementations and their base requirements. */
export function captureWorkshop(graph, options) {
  let nextChild = 0
  const gather = (board, parts, open, portNames, ancestry) => {
    const sourcePins = new Map()
    const nodes = [], requirements = [], children = {}, nestedTerminals = new Set()
    const inputSignals = {}
    const sourceNodes = new Map(board.nodes.filter((node) => parts.role(node) === 'source').map((node) => [node.id, node]))
    const taken = new Set(board.nodes.map(({ id }) => id))
    const labels = new Set()
    const wires = board.wires.map((wire) => {
      const [id, key] = splitSource(wire.from)
      const from = sourceNodes.get(id)
      if (!from) return wire
      if (!sourcePins.has(wire.from)) {
        const base = key == null ? from.params?.name ?? id : key
        let port = portNames?.(base) ?? base
        const prefix = port
        for (let suffix = 2; labels.has(port); suffix += 1) port = `${prefix}_${suffix}`
        labels.add(port)
        if (parts.signalOf) inputSignals[port] = parts.signalOf(board, wire.from)
        let pin = `pin_${sourcePins.size + 1}`
        while (taken.has(pin)) pin += '_'
        taken.add(pin)
        sourcePins.set(wire.from, { id: pin, type: INPUT, x: from.x, y: (from.y ?? 40) + sourcePins.size * 35, params: { name: port } })
      }
      return { ...wire, from: sourceOf(sourcePins.get(wire.from).id) }
    })
    for (const node of board.nodes) {
      if (parts.role(node) === 'source') continue
      if (parts.role(node) === 'sink') {
        nodes.push({ ...node, params: { ...node.params, name: node.params?.name ?? node.id } })
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
        const child = gather(opened.circuit, opened.parts, opened.open, named, new Set([...ancestry, node.type]))
        if (!child || child.inputs.some((name) => !inputs.includes(name))
          || (outputs?.length ? outputs.join() !== child.outputs.join() : child.outputs.length !== 1)) return null
        const id = `${options.scope}_${++nextChild}`
        children[id] = { ...child, inputs, name: parts.label(node), description: '' }
        requirements.push(...child.requirements)
        nodes.push({ ...node, type: id, params: {} })
      } else {
        if (isPersonal(node.type) || !options.resolve(node.type)) return null
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
  const captured = gather(graph, options.parts, options.open, null, new Set())
  if (!captured) return null
  return JSON.parse(JSON.stringify({ ...captured, id: options.scope, domain: options.domain, name: options.name, description: options.description, tray: options.tray, rewardType: options.rewardType }))
}

export function workshopAvailable(piece, { domain, identity, types, has, allows, resolve }) {
  return piece.domain === domain && piece.requirements.every(({ type, identity: signature, settings }) =>
    types.has(type) && identity(type) === signature && allows(type, settings)
    && Object.entries(settings).every(([key, value]) => has(type, key) && has(type, key, String(value))))
    && piece.terminals.every((type) => Boolean(resolve(type)))
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
        circuit: graph, inputs, outputs, parts: partOf, holds: ticks,
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
