// How to map values to grey: plain 0…1 images as they are, signed images around mid-grey,
// larger values (like disparities) scaled by their maximum.
import { display } from '../../../engine/grid.js'
import { finiteExtent } from '../../../engine/number.js'

export function rangeOf(img) {
  const { lo: min, hi: max } = finiteExtent([img?.data]) ?? { lo: 0, hi: 1 }
  if (min >= -0.02 && max <= 1.02) return { lo: 0, hi: 1 }
  if (min < -0.02) {
    const m = Math.max(Math.abs(min), Math.abs(max), 1e-6)
    return { lo: -m, hi: m }
  }
  return { lo: 0, hi: Math.max(max, 1e-6) }
}

// CSS grey for annotations on a bench's artwork.
export const grey = (v) => {
  const byte = Math.round(display(v) * 255)
  return `rgb(${byte}, ${byte}, ${byte})`
}
