import { useState } from 'react'
import { flowLayout } from './layout.js'
import { L } from '../shell/i18n.js'

// Read-only miniatures retain the real node ids. Selecting one opens its stage; inspection never edits the graph.
export function diagramOf(nodes, wires) {
  return flowLayout(nodes, wires, { sizeOf: () => ({ w: 132, h: 46 }), gapX: 24, gapY: 12 })
}
export default function StageDiagram({ nodes, wires, mini, value, label, active, onPick }) {
  const [hover, setHover] = useState(null)
  const layout = diagramOf(nodes, wires)
  const scale = Math.min(1, 440 / Math.max(1, layout.w))
  const chain = scale < 9 / 11
  return <div className="stage-diagram" onMouseLeave={() => setHover(null)}>
    {chain ? <div className="stage-name-chain">{nodes.map((n, k) => <span key={n.id}>{k > 0 && <i aria-hidden="true">→</i>}<button type="button" className={active === n.id ? 'is-active' : ''} onMouseEnter={() => setHover(n.id)} onFocus={() => setHover(n.id)} onClick={() => onPick(n.id)}>{L(label(n))}</button></span>)}</div> :
      <div className="stage-diagram-window" style={{ width: layout.w * scale, height: layout.h * scale }}>
        <div className="stage-diagram-layer" style={{ width: layout.w, height: layout.h, transform: `scale(${scale})` }}>
          <svg width={layout.w} height={layout.h} aria-hidden="true">{wires.map((w) => {
            const a = layout.positions.get(w.from.split('#')[0]), b = layout.positions.get(w.to)
            return a && b ? <path key={`${w.to}.${w.port}`} d={`M${a.x + a.w},${a.y + a.h / 2} C${a.x + a.w + 12},${a.y + a.h / 2} ${b.x - 12},${b.y + b.h / 2} ${b.x},${b.y + b.h / 2}`} /> : null
          })}</svg>
          {nodes.map((n) => { const p = layout.positions.get(n.id); return <button key={n.id} type="button" data-mini-node={n.id} className={`stage-mini ${active === n.id ? 'is-active' : ''}`} style={{ left: p.x, top: p.y }} onMouseEnter={() => setHover(n.id)} onFocus={() => setHover(n.id)} onClick={() => onPick(n.id)}>{mini(n)}</button> })}
        </div>
      </div>}
    {hover && <aside className="stage-inspect" role="tooltip"><b>{L(label(nodes.find((n) => n.id === hover)))}</b>{value?.(hover, 'detail')}</aside>}
  </div>
}
