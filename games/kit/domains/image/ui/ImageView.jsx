import { useEffect, useRef, useState } from 'react'
import { rangeOf } from './display.js'

// Draw a bench or probe image pixel for pixel.
export default function ImageView({ img, range, size = 112, onHover, selected, label, theme, grid }) {
  const canvas = useRef(null)
  const [ownSelection, setOwnSelection] = useState(null)

  useEffect(() => {
    const node = canvas.current
    if (!node || !img) return
    node.width = img.w
    node.height = img.h
    const context = node.getContext('2d')
    const pixels = context.createImageData(img.w, img.h)
    const { lo, hi } = range ?? rangeOf(img)
    const channels = img.c ?? 1
    for (let i = 0; i < img.w * img.h; i++) {
      let rgb
      if (channels === 3) {
        rgb = Array.from({ length: 3 }, (_, c) => Math.round(255 * Math.min(1, Math.max(0, img.data[i * 3 + c]))))
      } else {
        const g = Math.round(255 * Math.min(1, Math.max(0, (img.data[i] - lo) / (hi - lo))))
        rgb = [g, g, g]
      }
      pixels.data.set([...rgb, 255], i * 4)
    }
    context.putImageData(pixels, 0, 0)
  }, [img, range, theme])

  if (!img) return <div className="image-empty" style={{ width: size, height: size }}>{label ?? '—'}</div>

  const hover = (event) => {
    if (!onHover) return
    const box = event.currentTarget.getBoundingClientRect()
    const x = Math.floor(((event.clientX - box.left) / box.width) * img.w)
    const y = Math.floor(((event.clientY - box.top) / box.height) * img.h)
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) return
    if (selected === undefined) setOwnSelection({ x, y, w: img.w, h: img.h })
    onHover({ x, y, w: img.w, h: img.h, value: img.c === 3 ? Array.from(img.data.slice((y * img.w + x) * 3, (y * img.w + x) * 3 + 3)) : img.data[y * img.w + x] })
  }

  const canvasEl = (
    <canvas
      ref={canvas}
      className={`image-view ${onHover ? 'is-readable' : ''}`}
      style={{ width: size, height: size * (img.h / img.w) }}
      onContextMenu={onHover ? (event) => event.preventDefault() : undefined}
      onDragStart={onHover ? (event) => event.preventDefault() : undefined}
      onPointerMove={hover}
      onPointerDown={hover}
      onPointerLeave={(event) => { if (event.pointerType !== 'touch') { setOwnSelection(null); onHover?.(null) } }}
      aria-label={label}
    />
  )
  // The selection is shared with other previews when provided by the parent.
  const point = selected === undefined ? ownSelection : selected
  const x = point && !point.frequency ? Math.min(img.w - 1, Math.max(0, Math.floor(((point.x + 0.5) * img.w) / (point.w ?? img.w)))) : null
  const y = point && !point.frequency ? Math.min(img.h - 1, Math.max(0, Math.floor(((point.y + 0.5) * img.h) / (point.h ?? img.h)))) : null
  const showGrid = grid && size / img.w >= 6
  if (!showGrid && !onHover && !point) return canvasEl
  return (
    <span className={`image-frame ${showGrid ? 'image-grid' : ''} ${onHover ? 'is-readable' : ''}`} style={{ '--cells': img.w, '--rows': img.h }}>
      {canvasEl}
      {x !== null && y !== null && <span className="pixel-selection" aria-hidden="true" style={{ left: `${(x / img.w) * 100}%`, top: `${(y / img.h) * 100}%`, width: `${100 / img.w}%`, height: `${100 / img.h}%` }} />}
    </span>
  )
}
