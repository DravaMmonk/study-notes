import { useMemo } from 'react'
import { boardContext, boardPlay } from '../core/board-play.js'
import { OPS } from '../core/mechanism/ops.js'
import CircuitLevel from './CircuitLevel.jsx'
import { partsFor } from './board/board-parts.js'
import { iconOf } from './parts/icons.js'
import PartFace from './parts/PartFace.jsx'

/** The package play mounts the same board editor used by the remaining native modules. */
export default function BoardPlay({ context, work, onChange, phone }) {
  const { task, works, view } = useMemo(() => boardContext(context), [context])
  const defined = { of: type => works.defs[type], defaults: works.defaultsOf, ops: OPS, value: () => null }
  const cards = Object.fromEntries(Object.entries(works.defs).map(([type, def]) => [type, { ...def, icon: iconOf(def.icon) }]))
  const parts = partsFor(task, view, { cards, portLabels: {}, defined })
  const flags = new Set(context.progress?.flags ?? [])
  const offered = works.offerIn(task, flags)
  const item = ({ type, fresh }) => ({ type, label: cards[type]?.name ?? type, desc: cards[type]?.desc, icon: cards[type]?.icon, fresh })
  const face = (node, ctx, mode) => {
    const def = defined.of(node.type)
    return def ? <PartFace def={def} face={mode} node={node} ctx={ctx} defined={defined} set={ctx.setParams && ((params, key) => ctx.setParams(node, params, key))} /> : null
  }
  const game = { course: works.course, textAt: text => text, isCircuitPart: type => Boolean(cards[type] || view.BUILT[type]) }
  return <CircuitLevel screen={{ game, level: { ...task, source: task }, phone }}
    board={{ circuit: work, change: onChange, clear: () => onChange(boardPlay.initial(context)) }}
    parts={parts} defined={defined} items={offered.shown.map(item)} folded={offered.folded.map(item)} types={offered.types}
    card={{ body: (node, ctx) => face(node, ctx, 'card'), thumb: (node, ctx) => face(node, ctx, 'tile') }}
    sheet={(node, ctx) => face(node, ctx, 'detail')} tabs={false} pad={null} />
}
