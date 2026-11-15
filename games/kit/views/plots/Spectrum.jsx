import { useRef } from 'react'
import { pixelText } from '../../engine/grid.js'
import { tr } from '../../shell/i18n.js'
import { mix, rgba, token, useCanvas } from '../canvas.js'
import { pointerCell, useInspection } from '../useInspection.js'
import Plot from './Plot.jsx'
import { centreBins, frequency, spectrumOf } from './spectrum.js'

// A grey grid's spectrum (the view `spectrum`, games/DESIGN.md 6.9): the strength of each frequency it holds, zero
// frequency in the middle. A row (or two) is drawn as a plot of each frequency's amplitude, |F| / n, the value wanted
// on the same axes where there is one; a picture as a map whose bright cell at (kx, ky) is a strong wave going kx
// cycles across and ky down — log-scaled, the mean (the centre) left out of the scale, so faint waves still show.

export function CentredBins({ value, want, card, tolerance, size = 220 }) {
  const grid = value ?? want
  if (grid.frequencyAxes === 2 || grid.h > 2) {
    const shifted = centreBins(grid)
    const centre = Math.floor(grid.h / 2) * grid.w + Math.floor(grid.w / 2)
    const peak = shifted.data.reduce((max, amplitude, index) => index === centre ? max : Math.max(max, amplitude), 1e-9)
    return <SpectrumMap value={{ ...shifted, data: shifted.data.map(amplitude => Math.max(0, Math.min(1, amplitude / peak))) }} size={size} card={card} />
  }
  return <Plot value={value && centreBins(value)} want={want && centreBins(want)}
    tolerance={tolerance} card={card} xOf={(x) => frequency(x, grid.w)} />
}

export default function Spectrum({ value, want, size = 220, card = false, inspection }) {
  const shown = value ?? want
  return shown.h <= 2
    ? <SpectrumPlot value={value && spectrumOf(value)} want={want && spectrumOf(want)} card={card} inspection={inspection} />
    : <SpectrumMap value={spectrumOf(shown)} size={size} card={card} inspection={inspection} />
}

function SpectrumPlot({ value, want, card, inspection }) {
  const root = useRef(null)
  const shown = value ?? want
  const probe = useInspection(root, shown, inspection, 'spectrum-rows')
  return <div ref={root}><Plot value={value} want={want} tolerance={Infinity} card={card}
    xOf={(x) => frequency(x, shown.w)} probe={inspection ? probe : undefined} /></div>
}

function SpectrumMap({ value, size, card, inspection }) {
  const { w, h } = value
  const root = useRef(null)
  const { active, select, leave } = useInspection(root, value, inspection, 'spectrum')
  const height = Math.round(size * (h / w))
  const canvas = useCanvas((ctx) => {
    const cell = size / w
    const [low, high, rule] = ['--canvas', '--accent-ink', '--rule'].map(token)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      ctx.fillStyle = rgba(mix(low, high, value.data[y * w + x] ** 1.4))
      ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5)
    }
    // Axes through zero frequency.
    const [zx, zy] = [(Math.floor(w / 2) + 0.5) * cell, (Math.floor(h / 2) + 0.5) * cell]
    ctx.strokeStyle = rgba(rule, 0.7)
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.moveTo(zx, 0)
    ctx.lineTo(zx, height)
    ctx.moveTo(0, zy)
    ctx.lineTo(size, zy)
    ctx.stroke()
  }, size, height, [value])
  const read = (event, pinned) => {
    const cell = pointerCell(value, event.currentTarget.getBoundingClientRect(), event)
    if (cell) select(cell.x, cell.y, pinned)
  }
  const drawing = <canvas ref={canvas} className="sp" style={{ width: size }} aria-label={tr('频谱：中心是零频，越往外频率越高')}
      onPointerMove={card ? undefined : (event) => { if (event.pointerType === 'mouse') read(event, false) }}
      onPointerDown={card ? undefined : (event) => read(event, true)} onPointerLeave={card ? undefined : leave} />
  if (card) return drawing
  return <div className="sp-view" ref={root}>
    {drawing}
    {!inspection && <p className="gv-reading" role="status">
      {active && <span>
        ({frequency(active.x, w)}, {frequency(active.y, h)}) <b>{pixelText(value.data[active.y * w + active.x])}</b>
      </span>}
    </p>}
  </div>
}
