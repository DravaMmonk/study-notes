import { useMemo, useState } from 'react'
import { CircuitBoard } from 'lucide-react'
import { boardFits } from '../circuit/model.js'
import { partsFor, packedView } from '../circuit/board-parts.js'
import { openedWorkshop, workshopView } from '../circuit/workshop-view.js'
import { trayMembers } from '../engine/trays.js'
import { captureWorkshop, publishWorkshop, trayKey, workshopAvailable, workshopEntries, workshopIdentity } from '../engine/workshop.js'
import { srcNode } from '../engine/wire-source.js'
import { L, tr } from './i18n.js'
import { useWorkshop } from './useWorkshop.js'

/** Project the independent player library onto the current task and its board rules. */
export function useCircuitWorkshop({ screen, course, base, cards, portLabels, defined, defaults, settings, ready }) {
  const { game, level: entry, flags, workshop: profile } = screen
  const level = entry.source
  const { board: kind } = base
  const { library, update } = useWorkshop()
  const [notice, setWorkshopNotice] = useState('')
  const offers = useMemo(() => base.offerIn(level, flags), [base, level, flags])
  const has = useMemo(() => base.holdsIn(level, flags), [base, level, flags])
  const identity = (type) => workshopIdentity(profile?.domain, game.partDefs, type)
  const runtime = base.runtime ?? (typeof level.parts === 'function' ? level.parts : level.parts ? (type) => level.parts[type] : base.partOf)
  const taskConstraints = (type, params) => {
    const controls = settings?.({ type, params }, { task: level }) ?? []
    return controls.every(({ key, options }) => !Object.hasOwn(params, key) || options.some(([value]) => Object.is(value, params[key])))
  }
  const offeredTypes = new Set(offers.types)
  const available = (piece) => Boolean(profile && workshopAvailable(piece, {
    domain: profile.domain, identity, types: offeredTypes, has, allows: taskConstraints, resolve: runtime,
  }))
  const { known, view: circuit, resolve } = workshopView(base, library, available, runtime)
  const normalParts = partsFor(level, circuit, { cards, portLabels })
  const parts = {
    ...normalParts,
    label: (node) => known(node.type) ? resolve.definition(node.type).name : normalParts.label(node),
    family: (node) => known(node.type) ? 'built' : normalParts.family(node),
    icon: (node) => known(node.type) ? CircuitBoard : normalParts.icon(node),
    portLabel: (node, port) => known(node.type) ? port : normalParts.portLabel(node, port),
  }
  const originalPacked = useMemo(() => packedView(course, { cards, portLabels }), [course, cards, portLabels])
  const packed = {
    ...originalPacked,
    open: (node, at) => known(node.type) ? openedWorkshop(resolve.definition(node.type), parts, level) : originalPacked.open(node, at),
    edit: (node, at) => { if (!known(node.type)) originalPacked.edit(node, at) },
  }
  const personal = workshopEntries(library).filter((piece) => available(piece)
    && !(piece.tray && JSON.parse(piece.tray)[0] === game.id && offers.types.includes(piece.rewardType)))
  const pickedTrays = game.course?.tray(level) ?? []
  const main = new Set((pickedTrays.length ? pickedTrays : ['']).flatMap((tray) => library.featured[trayKey(game.id, tray)] ?? []))
  const palette = [...offers.shown, ...personal.filter(({ id }) => main.has(id)).map(({ id }) => id)]
  const folded = [...offers.folded, ...personal.filter(({ id }) => !main.has(id)).map(({ id }) => id)]
  const types = [...palette, ...folded]
  const held = new Set(types)
  const isPersonal = (node) => Object.hasOwn(library.pieces, node.type)
  const hasPersonal = (graph) => Boolean(graph?.nodes?.some(isPersonal))
  const baseOnly = (graph) => {
    const ids = new Set(graph.nodes.filter(isPersonal).map(({ id }) => id))
    return { ...graph, nodes: graph.nodes.filter((node) => !ids.has(node.id)), wires: graph.wires.filter((wire) => !ids.has(srcNode(wire.from)) && !ids.has(wire.to)) }
  }
  const fits = (graph) => !hasPersonal(graph) ? kind.fits(graph, level, base)
    : kind.fits(baseOnly(graph), level, base) && boardFits(graph, parts, (type) => Boolean(circuit.partOf(type)))
  const hold = (graph) => {
    if (!ready) return graph
    if (!hasPersonal(graph)) return ready(graph, held, level)
    // The domain's own corrections still run on its primitives. The workshop ports follow the shared wiring rules.
    const cleaned = ready(baseOnly(graph), held, level)
    const ids = new Set([...cleaned.nodes, ...graph.nodes.filter(isPersonal)].map(({ id }) => id))
    const custom = new Set(graph.nodes.filter(isPersonal).map(({ id }) => id))
    return { ...cleaned, nodes: [...cleaned.nodes, ...graph.nodes.filter(isPersonal)], wires: [
      ...cleaned.wires,
      ...graph.wires.filter(({ from, to }) => (custom.has(srcNode(from)) || custom.has(to)) && ids.has(srcNode(from)) && ids.has(to)),
    ] }
  }
  function openForCapture(node, at) {
    const opened = packed.open(node, at)
    return opened && { ...opened, open: (part) => openForCapture(part, opened) }
  }
  const capture = (graph, details) => captureWorkshop(graph, {
    scope: `user_${crypto.randomUUID().replaceAll('-', '')}`,
    open: (node) => openForCapture(node, { level, circuit: graph, parts }),
    needsSnapshot: (type) => Boolean(game.partDefs?.parts?.[type]?.inside),
    ...details, domain: profile.domain, parts, resolve: runtime, identity,
    defaults: (type) => defined?.of(type) ? defined.defaults(type) : defaults?.(type),
    book: library,
  })
  const put = (piece, lineage, rank, replaces) => update((current) => publishWorkshop(current, piece, {
    id: piece.id, lineage, rank, replaces,
  }))
  const publish = (graph) => {
    if (!profile) return
    const lineage = (type) => JSON.stringify([game.id, type])
    for (const { piece: type, variant } of profile.publications[entry.key] ?? []) {
      const piece = game.partDefs.parts[type]
      const listed = Object.entries(game.course?.trays ?? {}).find(([, entries]) => trayMembers(entries).includes(type))?.[0]
      const tray = trayKey(game.id, listed ?? pickedTrays[0] ?? '')
      const reward = capture(graph, { name: L(piece.name), description: L(piece.desc), tray, rewardType: type })
      const rank = piece.inside.findIndex(({ id }) => id === variant)
      const replaced = (profile.replaces[type] ?? []).map(lineage)
      if (!reward || !put(reward, lineage(type), rank, replaced)) {
        setWorkshopNotice(tr('这次通关未能写入工坊。', 'This pass could not be published to the workshop.'))
      }
    }
  }
  return { offers, has, known, circuit, resolve, parts, packed, palette, folded, types, held, hasPersonal,
    fits, hold, capture, put, publish, library, update, available, pickedTrays, notice }
}
