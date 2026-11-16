import { useMemo, useState } from 'react'
import { partsFor, packedView } from '../circuit/board-parts.js'
import { runtimeOf, workshopView } from '../circuit/workshop-view.js'
import { trayMembers } from '../engine/trays.js'
import { captureWorkshop, publishWorkshop, trayKey, workshopAvailable, workshopEntries, workshopIdentity } from '../engine/workshop.js'
import { L, tr } from './i18n.js'
import { useWorkshop } from './useWorkshop.js'

/** Project the independent player library onto the current task and its board rules. */
export function useCircuitWorkshop({ screen, course, base, cards, portLabels, defined, defaults, settings, ready }) {
  const { game, level: entry, flags, workshop: profile } = screen
  const level = entry.source
  const definition = base.defined ?? defined
  const { library, update } = useWorkshop()
  const [notice, setWorkshopNotice] = useState('')
  const offers = useMemo(() => base.offerIn(level, flags), [base, level, flags])
  const has = useMemo(() => base.holdsIn(level, flags), [base, level, flags])
  const identity = (type) => workshopIdentity(profile?.domain, game.partDefs, type)
  const runtime = runtimeOf(level, base)
  const taskConstraints = (type, params) => {
    const controls = settings?.({ type, params }, { task: level }) ?? []
    return controls.every(({ key, options }) => !Object.hasOwn(params, key) || options.some(([value]) => Object.is(value, params[key])))
  }
  const offeredTypes = new Set(offers.types)
  const available = (piece) => Boolean(profile && workshopAvailable(piece, {
    domain: profile.domain, identity, types: offeredTypes, has, allows: taskConstraints, resolve: runtime,
  }))
  const workshop = workshopView(base, library, available, runtime)
  const { known, view: circuit, resolve } = workshop
  const parts = partsFor(level, circuit, { cards, portLabels, defined })
  const packed = packedView(course, { cards, portLabels, defined }, workshop)
  const personal = workshopEntries(library).filter((piece) => available(piece)
    && !(piece.tray && JSON.parse(piece.tray)[0] === game.id && offers.types.includes(piece.rewardType)))
  const pickedTrays = game.course?.tray(level) ?? []
  const main = new Set((pickedTrays.length ? pickedTrays : ['']).flatMap((tray) => library.featured[trayKey(game.id, tray)] ?? []))
  const palette = [...offers.shown, ...personal.filter(({ id }) => main.has(id)).map(({ id }) => id)]
  const folded = [...offers.folded, ...personal.filter(({ id }) => !main.has(id)).map(({ id }) => id)]
  const types = [...offers.types, ...personal.map(({ id }) => id)]
  const held = new Set(types)
  const hasPersonal = (graph) => graph.nodes.some((node) => Object.hasOwn(library.pieces, node.type))
  const hold = (graph) => ready ? ready(graph, level, parts) : graph
  function openForCapture(node, at) {
    const opened = packed.open(node, at)
    return opened && { ...opened, open: (part) => openForCapture(part, opened) }
  }
  const capture = (graph, details) => captureWorkshop(graph, {
    scope: `user_${crypto.randomUUID().replaceAll('-', '')}`,
    open: (node) => openForCapture(node, { level, circuit: graph, parts }),
    needsSnapshot: (type) => Boolean(game.partDefs?.parts?.[type]?.inside),
    ...details, domain: profile.domain, parts: details.parts ?? parts, resolve: runtime, identity,
    defaults: (type) => definition?.of(type) ? definition.defaults(type) : defaults?.(type),
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
    hold, capture, publish, library, update, available, notice }
}
