import { useState } from 'react'
import { tr } from '../../../shell/i18n.js'
import { Rich } from '../../../shell/bench/Rich.jsx'
import { fromRows } from '../image.js'
import { pinholeView } from '../benches/pinhole.js'
import CameraScene from './benches/CameraScene.jsx'
import ImageView from './ImageView.jsx'
import FilterWindow from './FilterWindow.jsx'
import SamplingRuler from './SamplingRuler.jsx'
import TheoryFigure from './TheoryFigure.jsx'
import ConstructionFigure from './ConstructionFigure.jsx'
import OutsideFigure from './OutsideFigure.jsx'

/** Prerequisite observations use independent examples, never the task's target or wiring. */
export default function IntroFigure({ fig }) {
  if (fig.startsWith('outside-')) return <OutsideFigure fig={fig} />
  if (['inspection','inspection-samples','weighted-line','window-table','separable','directional-change','frequency-wave','frequency-probe','frequency-table','frequency-filter'].includes(fig)) return <ConstructionFigure fig={fig} />
  if (['sampling-material', 'smoothing', 'separable', 'directional-change'].includes(fig)) return <TheoryFigure fig={fig} />
  if (fig === 'lab' || fig === 'projection') {
    const setup = { object: fig === 'lab' ? 'lighthouse' : 'point' }
    const q = pinholeView(setup, { H: 2, X: 2, Z: 4, f: 1 })
    return <div className="vi-intro-figure"><CameraScene setup={setup} q={q} bounds={{ height: 3, depth: 5 }} revealed /></div>
  }
  if (fig === 'samples') return <figure className="vi-intro-figure vi-intro-samples">
    <ImageView value={fromRows([[0.1, 0.8, 0.3], [0.6, 0.2, 0.9]])} cell={56} numbers axes mark={{ x: 1, y: 0 }} />
    <figcaption><Rich text={tr('同一格有两种信息：位置 (1, 0)，读数 0.8。<wiki-ref to="pixel-coordinate-convention"></wiki-ref>', 'One cell has two kinds of information: position (1, 0), reading 0.8. <wiki-ref to="pixel-coordinate-convention"></wiki-ref>')} /></figcaption>
  </figure>
  if (fig === 'pixel-units') return <figure className="vi-intro-figure">
    <svg className="vi-primer" viewBox="0 0 400 150" role="img" aria-label={tr('同一段长度用物理单位和像素间距计量', 'The same length measured in physical units and pixel pitches')}>
      <path d="M 40 38 H 360 M 40 30 V 46 M 360 30 V 46" />
      <text x="200" y="23" textAnchor="middle">{tr('同一段长度：1 mm', 'One length: 1 mm')}</text>
      {[0, 1, 2, 3].map((k) => <g key={k}><rect x={40 + k * 80} y="66" width="80" height="34" /><text x={80 + k * 80} y="88" textAnchor="middle">{k + 1}</text></g>)}
      <text x="200" y="127" textAnchor="middle">{tr('每格 0.25 mm → 跨过 4 个像素间距', '0.25 mm per step → 4 pixel steps')}</text>
    </svg>
    <figcaption><Rich text={'<wiki-ref to="pixel-pitch"></wiki-ref> · <wiki-ref to="pixel-focal-length"></wiki-ref>'} /></figcaption>
  </figure>
  if (fig === 'pixel-origin') return <PixelOrigin />
  if (fig === 'nearest-sampling') return <SamplingRuler />
  if (fig === 'filter-window') return <FilterWindow task={{ image: [[2, 6, 3, 8, 1]], window: { weights: [1, 2, 1], axis: 'row', padding: 'valid' } }} note={tr('这是独立示例。移动窗口，比较采到的读数与跟随位置的权重。', 'This is an independent example. Move the window to compare the readings and their positional weights.')} />
  return null
}

/** A ruler distinguishes a signed displacement from an absolute column; no circuit is supplied. */
function PixelOrigin() {
  const [offset, setOffset] = useState(-2)
  const centre = 4
  const x = (column) => 35 + column * 40
  return <figure className="vi-intro-figure">
    <svg className="vi-primer" viewBox="0 0 400 165" role="img" aria-label={tr(`光轴在列 4，偏移 ${offset} 格，标记落在列 ${centre + offset}`, `Axis at column 4, offset ${offset} cells, marker at column ${centre + offset}`)}>
      <path d="M 35 90 H 370" />
      {Array.from({ length: 9 }, (_, k) => <g key={k}><path d={`M ${x(k)} 84 V 97`} /><text x={x(k)} y="118" textAnchor="middle">{k}</text></g>)}
      <path className="vi-primer-axis" d={`M ${x(centre)} 25 V 96`} />
      <text x={x(centre)} y="17" textAnchor="middle">c_x = 4</text>
      <path className="vi-primer-offset" d={`M ${x(centre)} 55 H ${x(centre + offset)} l ${offset < 0 ? 7 : -7} -5 m ${offset < 0 ? -7 : 7} 5 l ${offset < 0 ? 7 : -7} 5`} />
      <circle className="vi-primer-point" cx={x(centre + offset)} cy="90" r="6" />
      <text x="200" y="148" textAnchor="middle">{tr(`相对光轴：${offset > 0 ? '+' : ''}${offset} 格`, `From the axis: ${offset > 0 ? '+' : ''}${offset} cells`)}</text>
    </svg>
    <button type="button" className="vi-primer-switch" onClick={() => setOffset(-offset)}>{tr('换到光轴另一侧', 'Move to the other side of the axis')}</button>
    <figcaption><Rich text={'<wiki-ref to="principal-point"></wiki-ref> · <wiki-ref to="pixel-coordinate-convention"></wiki-ref>'} /></figcaption>
  </figure>
}
