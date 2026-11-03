import { useState } from 'react'
import { tr } from '../../../shell/i18n.js'
import { Rich } from '../../../shell/bench/Rich.jsx'
import { fmt, fromRows } from '../image.js'
import ImageView from './ImageView.jsx'

const ROW = [0.15, 0.7, 0.35, 0.9]
const xAt = (x) => 24 + (x + 1) * 70

/** Compare switching boundaries without supplying a rounding expression or a circuit. */
function Bands({ position }) {
  const chosen = Math.floor(position + 0.5)
  return <section className="vi-sample-band">
    <h3><span>{tr('最近整数坐标', 'Nearest integer coordinate')}</span><output>{chosen}</output></h3>
    <svg viewBox="0 0 400 90" role="img" aria-label={tr(`取样位置 ${fmt(position)}，最近整数为 ${chosen}`, `At ${fmt(position)}, nearest integer is ${chosen}`)}>
      {[-1, 0, 1, 2, 3, 4].map((k) => {
        const lo = Math.max(-1, k - 0.5)
        const hi = Math.min(4, k + 0.5)
        return hi > lo && <g key={k} className={chosen === k ? 'is-active' : ''}>
          <rect x={xAt(lo)} y="30" width={xAt(hi) - xAt(lo)} height="24" />
          <text x={(xAt(lo) + xAt(hi)) / 2} y="47" textAnchor="middle">{k}</text>
        </g>
      })}
      {Array.from({ length: 11 }, (_, k) => -1 + k / 2).map((v) => <g key={v} className="vi-sample-tick"><path d={`M ${xAt(v)} 58 v ${Number.isInteger(v) ? 7 : 4}`} />{Number.isInteger(v) && <text x={xAt(v)} y="80" textAnchor="middle">{v}</text>}</g>)}
      <path className="vi-sample-marker" d={`M ${xAt(position)} 16 V 55`} />
      <circle className="vi-sample-marker" cx={xAt(position)} cy="16" r="4" />
    </svg>
    <p>{tr('相邻整数的中点是切换位置；正好在中点时，取较大的整数。', 'Selection switches at the midpoint between integers; a tie takes the larger integer.')}</p>
  </section>
}

export default function SamplingRuler() {
  const [position, setPosition] = useState(1.7)
  const nearest = Math.floor(position + 0.5)
  const column = Math.max(0, Math.min(ROW.length - 1, nearest))
  return <figure className="vi-intro-figure vi-sampling-ruler">
    <ImageView value={fromRows([ROW])} numbers axes cell={64} mark={{ x: column, y: 0 }} /><p className="vi-sample-boundary">{tr(`原图只有列号 0–3；读取列号 ${column}，值为 ${ROW[column]}。`, `The source has columns 0–3; read column ${column}, value ${ROW[column]}.`)}</p>
    <label className="vi-sample-position"><span>{tr('取样位置 x', 'Sample position x')}</span><output>{fmt(position)}</output><input type="range" aria-label={tr('示例取样位置 x', 'Example sample position x')} min="-0.8" max="3.8" step="0.1" value={position} onChange={(e) => setPosition(Number(e.target.value))} /></label>
    <Bands {...{ position }} />
    <p className="vi-sample-boundary">{nearest !== column ? tr(`最近整数为 ${nearest}，已在图外；按约定读取边界列号 ${column}。`, `The nearest integer ${nearest} is outside; by convention read boundary column ${column}.`) : tr('先选最近的整数坐标；它若落在图外，再读取最近的边界。', 'Select the nearest integer coordinate first; if it lies outside, read the nearest boundary.')}</p>
    <figcaption><Rich text={'<wiki-ref to="nearest-neighbour-interpolation"></wiki-ref>'} /></figcaption>
  </figure>
}
