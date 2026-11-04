export const imageNumber = (value) => Number.isFinite(value) ? String(Number(value.toFixed(2))) : String(value)

export const AXIS = 18
export const inspectorCell = (image) => image.c===3 ? 56 : image.data.reduce((width,value)=>Math.max(width,Math.min(64,8+imageNumber(value).length*7)),36)
// Dense cells for a desktop result row, read by pointer rather than touch: just wide enough for their numbers.
export const denseCell = (image) => image.c===3 ? 46 : image.data.reduce((width,value)=>Math.max(width,Math.min(56,6+imageNumber(value).length*6)),26)

/**
 * The frame an image needs, at most `max` ({ w, h } px, border included): in information view its numbered cells and
 * axes, in overview the whole image scaled to fit the maximum; a small image's frame shrinks to it.
 */
// A frame never narrower than its caption needs.
const MIN_FRAME_W = 88

export function fitFrame(image, info, max, cellOf = inspectorCell) {
  const inner = { w: max.w - 2, h: max.h - 2 }
  const cell = info ? cellOf(image) : Math.min(inner.w / image.w, inner.h / image.h)
  const off = info ? AXIS : 0
  return { w: Math.min(max.w, Math.max(MIN_FRAME_W, Math.ceil(off + image.w * cell) + 2)), h: Math.min(max.h, Math.ceil(off + image.h * cell) + 2) }
}
