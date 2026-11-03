import { useState } from 'react'
import { tr } from '../../../shell/i18n.js'
import { calculationAt } from '../calculation.js'
import { fmt } from '../image.js'
import { Rich } from '../../../shell/bench/Rich.jsx'

/** A movable neighbourhood exposes the positional factors and their automatic sum. */
export default function FilterWindow({ task, note }) {
  const { weights, axis, padding } = task.window
  const width = task.image[0].length
  const height = task.image.length
  const along = axis === 'row' ? width : height
  const across = axis === 'row' ? height : width
  const lo = padding === 'valid' ? 1 : 0
  const hi = padding === 'valid' ? along - 2 : along - 1
  const [position, setPosition] = useState(lo)
  const [line, setLine] = useState(0)
  const x = axis === 'row' ? position : line
  const y = axis === 'row' ? line : position
  const outputX = axis === 'row' ? position - lo : line
  const outputY = axis === 'column' ? position - lo : line
  const { terms: factors, value: sum } = calculationAt(task, outputX, outputY)
  return <section className="vi-window" aria-label={tr('逐项查看邻域', 'Inspect the neighbourhood')}>
    <div className="vi-window-head"><Rich text={'<wiki-ref to="linear-filter"></wiki-ref>'} /><span>{tr('输入中心', 'Input centre')} ({x}, {y}) → {tr('输出', 'output')} ({outputX}, {outputY})</span></div>
    <div className="vi-window-controls">
      <button type="button" disabled={position <= lo} onClick={() => setPosition(position - 1)} aria-label={tr('前一个位置', 'Previous position')}>←</button>
      <label>{axis === 'row' ? 'x' : 'y'}<input type="range" min={lo} max={hi} step={1} value={position} onChange={(e) => setPosition(Number(e.target.value))} /></label>
      <button type="button" disabled={position >= hi} onClick={() => setPosition(position + 1)} aria-label={tr('后一个位置', 'Next position')}>→</button>
      {across > 1 && <label>{axis === 'row' ? tr('行 y', 'Row y') : tr('列 x', 'Column x')}<select value={line} onChange={(e) => setLine(Number(e.target.value))}>{Array.from({ length: across }, (_, i) => <option key={i} value={i}>{i}</option>)}</select></label>}
    </div>
    <div className="vi-window-factors">{factors.map((f, i) => <div className={`vi-window-factor ${i === 1 ? 'is-centre' : ''}`} key={i}>
      <small>{f.outside ? tr('图外补零', 'Zero outside') : `(${f.x}, ${f.y})`}</small>
      <strong>{fmt(f.value)}</strong><span>× {fmt(f.weight)} = {fmt(f.value * f.weight)}</span>
    </div>)}</div>
    <p className="vi-calculation-expression">{factors.map((f) => fmt(f.value * f.weight)).join(' + ')} = {fmt(sum)}</p>
    <p className="vi-instrument-note">{note ?? tr('乘积和总和已自动计算。移动窗口，观察读数与位置权重如何组合。', 'Products and sum are calculated automatically. Move the window to inspect how readings combine with positional weights.')}</p>
  </section>
}
