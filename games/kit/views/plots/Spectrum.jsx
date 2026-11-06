import { tr } from '../../shell/i18n.js'
import { mix, rgba, token, useCanvas } from './paint.js'
import Plot from './Plot.jsx'
import { spectrumOf } from './spectrum.js'

// A grey grid's spectrum (the view `spectrum`, games/DESIGN.md 6.10): the strength of each frequency it holds, zero
// frequency in the middle. A row (or two) is drawn as a plot of each frequency's amplitude, |F| / n, the value wanted
// on the same axes where there is one; a picture as a map whose bright cell at (kx, ky) is a strong wave going kx
// cycles across and ky down — log-scaled, the mean (the centre) left out of the scale, so faint waves still show.

const frequency = (n) => (j) => j - Math.floor(n / 2)

export default function Spectrum({ value, want, size = 220, card = false }) {
  const shown = value ?? want
  if (shown.h <= 2) return <Plot value={value && spectrumOf(value)} want={want && spectrumOf(want)} tolerance={Infinity} card={card} xOf={frequency(shown.w)} />
  return <SpectrumMap value={shown} size={size} />
}

function SpectrumMap({ value, size }) {
  const { w, h } = value
  const height = Math.round(size * (h / w))
  const canvas = useCanvas((ctx) => {
    const spectrum = spectrumOf(value)
    const cell = size / w
    const [low, high, rule] = ['--canvas', '--accent-ink', '--rule'].map(token)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      ctx.fillStyle = rgba(mix(low, high, spectrum.data[y * w + x] ** 1.4))
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
  return <canvas ref={canvas} className="sp" style={{ width: size, height }} aria-label={tr('频谱：中心是平均值，越往外频率越高', 'Spectrum: the centre is the mean; frequency rises outwards')} />
}
