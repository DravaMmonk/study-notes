export const imageNumber = (value) => Number.isFinite(value) ? String(Number(value.toFixed(2))) : String(value)

export const AXIS = 18
// Cells keep one width whatever their numbers; a longer number is written smaller (numberSize), never a wider cell.
export const inspectorCell = (image) => image.c===3 ? 56 : 36
// Dense cells for a desktop result row, read by pointer rather than touch.
export const denseCell = (image) => image.c===3 ? 46 : 28
// A cell number's font size: 10 px, smaller when its text would not fit the cell.
export const numberSize = (text, cell) => Math.min(10, (cell - 4) / (String(text).length * 0.62))

// An overview thumbnail's cell: about 96 px for the whole image, between 3 and 14 px a pixel.
export const thumbCell = (image) => Math.max(3, Math.min(14, Math.floor(96 / Math.max(image.w, image.h))))

// A frame never narrower than its caption needs.
const MIN_FRAME_W = 88

/**
 * The frame an image needs, at most `max` ({ w, h } px, border included): in information view its numbered cells and
 * axes, in overview a thumbnail just large enough to tell its pixels apart; a small image's frame shrinks to it.
 */
export function fitFrame(image, info, max, cellOf = inspectorCell) {
  const inner = { w: max.w - 2, h: max.h - 2 }
  const cell = info ? cellOf(image) : Math.min(thumbCell(image), inner.w / image.w, inner.h / image.h)
  const off = info ? AXIS : 0
  return { w: Math.min(max.w, Math.max(MIN_FRAME_W, Math.ceil(off + image.w * cell) + 2)), h: Math.min(max.h, Math.ceil(off + image.h * cell) + 2) }
}
