import { useEffect, useRef } from 'react'
import { magnitudeSpectrum } from '../../engine/fourier.js'
import { tr } from '../../../../../games/kit/shell/i18n.js'
import { css, mix, tokenRGB } from './views.js'

const CACHE = new WeakMap()
const spectrumOf = (img) => {
  if (!CACHE.has(img)) CACHE.set(img, magnitudeSpectrum(img, { dc: false }))
  return CACHE.get(img)
}

// A 2-D value as its magnitude spectrum: the centre is frequency (0, 0), the average brightness;
// a bright cell at (kx, ky) means the picture holds a strong wave going kx cycles across and ky
// down. Log-scaled, so faint waves still show.
export default function SpectrumView({ img, size = 112, theme, onHover }) {
  const canvas = useRef(null)
  const spectrum = spectrumOf(img)

  useEffect(() => {
    const node = canvas.current
    if (!node) return
    const dpr = window.devicePixelRatio || 1
    const { w, h } = spectrum
    const height = size * (h / w)
    node.width = Math.round(size * dpr)
    node.height = Math.round(height * dpr)
    const ctx = node.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const low = tokenRGB('--canvas', [243, 241, 235])
    const high = tokenRGB('--accent-ink', [143, 95, 18])
    const rule = tokenRGB('--rule', [191, 185, 172])
    const cell = size / w
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        ctx.fillStyle = css(mix(low, high, spectrum.data[y * w + x] ** 1.4))
        ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5)
      }
    }
    // Axes through zero frequency.
    ctx.strokeStyle = css(rule, 0.7)
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.moveTo((w / 2 + 0.5) * cell, 0)
    ctx.lineTo((w / 2 + 0.5) * cell, height)
    ctx.moveTo(0, (h / 2 + 0.5) * cell)
    ctx.lineTo(size, (h / 2 + 0.5) * cell)
    ctx.stroke()
  }, [spectrum, size, theme])

  const hover = (event) => {
    if (!onHover) return
    const box = event.currentTarget.getBoundingClientRect()
    const x = Math.floor(((event.clientX - box.left) / box.width) * spectrum.w)
    const y = Math.floor(((event.clientY - box.top) / box.height) * spectrum.h)
    if (x >= 0 && y >= 0 && x < spectrum.w && y < spectrum.h) onHover({ x: x - spectrum.w / 2, y: y - spectrum.h / 2, value: spectrum.data[y * spectrum.w + x], frequency: true })
  }
  return <canvas ref={canvas} className="spectrum-view" style={{ width: size, height: size * (spectrum.h / spectrum.w) }} onPointerMove={hover} onPointerDown={hover} onPointerLeave={() => onHover?.(null)} aria-label={tr('频谱：中心是平均亮度，越往外频率越高', 'Spectrum: the centre is the mean brightness; frequency rises outwards')} />
}
