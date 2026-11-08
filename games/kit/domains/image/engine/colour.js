// RGB values use interleaved channels; greyscale images remain single-channel.
import { PartError } from '../../../engine/circuit.js'
import { image } from './image.js'

export const channelsOf = (value) => value?.c ?? 1

export function compose(r, g, b) {
  const planes = [r, g, b]
  if (planes.some((p) => !p || channelsOf(p) !== 1 || p.w !== r.w || p.h !== r.h)) throw new PartError({ zh: '需要三张大小相同的单通道图', en: 'Three single-channel images of the same size are required' })
  const out = image(r.w, r.h, 0, 3)
  for (let i = 0; i < r.w * r.h; i++) for (let c = 0; c < 3; c++) out.data[3 * i + c] = planes[c].data[i]
  return out
}

export function channel(rgb, c) {
  if (channelsOf(rgb) !== 3 || !Number.isInteger(c) || c < 0 || c > 2) throw new PartError({ zh: '需要 RGB 彩色图及有效的通道', en: 'An RGB image and a valid channel are required' })
  const out = image(rgb.w, rgb.h)
  for (let i = 0; i < rgb.w * rgb.h; i++) out.data[i] = rgb.data[3 * i + c]
  return out
}
