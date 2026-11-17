import { useMemo } from 'react'
import { SettingsContext } from 'kernel/view'
import { CircuitLevel, partsFor, iconOf, PartFace, circuitSettings } from 'circuit/view'
import { boardContext, busPlay } from '../core/index.js'
import { CARDS } from './catalog.js'
import define from './game.js'
export { displays } from './displays.js'
export { default } from './game.js'

export function BusBoard({ context, work, onChange, phone }) {
  const { task, works, view } = useMemo(() => boardContext(context), [context])
  const defined = { of: type => works.defs[type], defaults: works.defaultsOf, ops: {}, value: () => null }
  const cards = { ...CARDS, ...Object.fromEntries(Object.entries(works.defs).map(([type, def]) => [type, { ...def, icon: iconOf(def.icon) }])) }
  const parts = partsFor(task, view, { cards, portLabels: {}, defined })
  const offered = works.offerIn(task, new Set(context.progress?.flags ?? []))
  const item = ({ type, fresh }) => ({ type, label: cards[type]?.name ?? type, desc: cards[type]?.desc, icon: cards[type]?.icon, fresh })
  const face = (node, ctx, mode) => {
    const def = defined.of(node.type)
    return def ? <PartFace def={def} face={mode} node={node} ctx={ctx} defined={defined} set={ctx.setParams && ((params, key) => ctx.setParams(node, params, key))} /> : null
  }
  const game = { id: context.content.id, settings: circuitSettings, course: works.course, textAt: text => text, isCircuitPart: type => Boolean(cards[type] || view.BUILT[type]) }
  return <SettingsContext.Provider value={game}><CircuitLevel screen={{ game, level: { ...task, source: task }, phone }}
    board={{ circuit: work ?? busPlay.initial(context), change: onChange, clear: () => onChange(busPlay.initial(context)) }}
    run={{ tests: [], states: [] }} parts={parts} defined={defined} items={offered.shown.map(item)} folded={offered.folded.map(item)} types={offered.types}
    card={{ body: (node, ctx) => face(node, ctx, 'card'), thumb: (node, ctx) => face(node, ctx, 'tile') }}
    sheet={(node, ctx) => face(node, ctx, 'detail')} tabs={false} pad={null} /></SettingsContext.Provider>
}

export function register(kernel) {
  kernel.play('tick-bus:board', { component: BusBoard, preview: BusBoard, define })
}
