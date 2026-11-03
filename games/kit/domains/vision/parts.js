// The parts of a vision board, for the shared engine (../../engine/circuit.js): the values on its wires are numbers,
// images (image.js) and 「—」 (null). A part handed 「—」 gives 「—」; one handed what it cannot work on stops with why
// (a PartError, shown on its card).
//
// Per-pixel work is done a whole image at a time (games/DESIGN.md 6.8): grid gives an image's coordinates as two
// images, arithmetic acts value by value on numbers and images alike, and lookup reads an image at every coordinate of
// a coordinate image at once. Courses can combine these operations or supply semantic image operators, according
// to whether low-level implementation or visual reasoning is the learning objective.
//
// Fixed cards (the task puts them on the board): in (one of the task's inputs, params.name) and out (an output).
import { sink, source } from '../../engine/boards.js'
import { PartError } from '../../engine/circuit.js'
import { isImage, make } from './image.js'
import { IMAGE_OPERATORS } from './operators.js'
import { CONSTRUCTION_PARTS } from './construction.js'

const T = (zh, en) => ({ zh, en })
const fail = (zh, en) => { throw new PartError(T(zh, en)) }

// A part that gives 「—」 when any input is 「—」.
const strict = (f) => (ins, node, ctx, key) => (Object.values(ins).some((v) => v === null || v === undefined) ? null : f(ins, node, ctx, key))

/**
 * f applied value by value over its arguments: numbers give a number; images (with numbers spread over them) give an
 * image of their size. Two images must be the same size; a grey one goes with each channel of a colour one.
 */
export function zip(args, f) {
  const images = args.filter(isImage)
  if (!images.length) return f(...args)
  const [{ w, h }] = images
  if (images.some((i) => i.w !== w || i.h !== h)) fail(`图的尺寸不一样：${images.map((i) => `${i.w} × ${i.h}`).join('、')}`, `the images differ in size: ${images.map((i) => `${i.w} × ${i.h}`).join(', ')}`)
  const c = Math.max(...images.map((i) => i.c))
  if (images.some((i) => i.c !== 1 && i.c !== c)) fail('通道数对不上', 'the channels do not match')
  const at = (a, x, y, ch) => (isImage(a) ? a.data[(y * w + x) * a.c + (a.c === 1 ? 0 : ch)] : a)
  return make(w, h, c, (x, y, ch) => f(...args.map((a) => at(a, x, y, ch))))
}

const isInt = (v) => Number.isInteger(v)
const wholeSize = (n, name) => {
  if (typeof n !== 'number' || !isInt(n) || n < 1) fail(`${name} 应当是正整数，得到 ${n}`, `${name} should be a positive whole number, got ${n}`)
  return n
}

/** Where a coordinate outside the image reads, by the lookup's `outside` setting: null for 0, or a clamped index. */
const OUTSIDE = ['error', 'zero', 'clamp']
const CHANNELS = ['0', '1', '2']

/** image at (x, y): x and y numbers (a value; a colour image gives a 1 × 1 colour image) or coordinate images. */
function lookup({ image, x, y }, node) {
  if (!isImage(image)) fail('image 应当是一张图', 'image should be an image')
  const outside = node.params?.outside ?? 'error'
  const read = (cx, cy, ch) => {
    if (!isInt(cx) || !isInt(cy)) fail(`坐标应当是整数，得到 (${cx}, ${cy})`, `coordinates should be whole numbers, got (${cx}, ${cy})`)
    let [px, py] = [cx, cy]
    if (px < 0 || py < 0 || px >= image.w || py >= image.h) {
      if (outside === 'zero') return 0
      if (outside === 'clamp') [px, py] = [Math.min(image.w - 1, Math.max(0, px)), Math.min(image.h - 1, Math.max(0, py))]
      else fail(`(${cx}, ${cy}) 在 ${image.w} × ${image.h} 的图外面`, `(${cx}, ${cy}) is outside the ${image.w} × ${image.h} image`)
    }
    return image.data[(py * image.w + px) * image.c + ch]
  }
  const coords = [x, y].filter(isImage)
  if (!coords.length) return image.c === 1 ? read(x, y, 0) : make(1, 1, image.c, (_, __, ch) => read(x, y, ch))
  const [{ w, h }] = coords
  if (coords.some((i) => i.w !== w || i.h !== h || i.c !== 1)) fail('两张坐标图应当一样大，而且是灰度图', 'the two coordinate images should be grey and the same size')
  const at = (a, px, py) => (isImage(a) ? a.data[py * w + px] : a)
  return make(w, h, image.c, (px, py, ch) => read(at(x, px, py), at(y, px, py), ch))
}

export const FIXED = ['in', 'out']

export const PARTS = {
  in: source({
    outputs: (node) => (node.params?.kind === 'point' ? ['x', 'y'] : null),
    eval: (_, node, ctx, key) => (node.params?.kind === 'point' ? ctx.bind?.[node.params.name]?.[key] : ctx.bind?.[node.params.name]),
  }),
  out: sink(),
  ...Object.fromEntries(Object.entries(IMAGE_OPERATORS).map(([key, part]) => [key, { ...part, eval: strict(part.eval) }])),
  ...Object.fromEntries(Object.entries(CONSTRUCTION_PARTS).map(([key, part]) => [key, { ...part, eval: strict(part.eval) }])),
  abs: { inputs: ['a'], eval: strict(({ a }) => zip([a], Math.abs)) },
  cosine: { inputs: ['a'], eval: strict(({ a }) => zip([a], (v) => Math.cos(2 * Math.PI * v))) },
  arithmetic: { inputs: ['a', 'b'], settings: { op: ['add', 'sub', 'mul', 'div'] }, eval: strict(({ a, b }, node) => zip([a, b], (p, q) => {
    switch (node.params?.op ?? 'add') {
      case 'sub': return p - q
      case 'mul': return p * q
      case 'div': return q === 0 ? fail('除以 0', 'divided by 0') : p / q
      case 'add': return p + q
      default: return fail('未知四则运算设置', 'Unknown arithmetic operation')
    }
  })) },
  magnitude: { inputs: ['x', 'y'], eval: strict(({ x, y }) => zip([x, y], Math.hypot)) },
  const: { inputs: [], eval: (_, node) => Number(node.params?.value ?? 0) },
  add: { inputs: ['a', 'b'], eval: strict(({ a, b }) => zip([a, b], (p, q) => p + q)) },
  sub: { inputs: ['a', 'b'], eval: strict(({ a, b }) => zip([a, b], (p, q) => p - q)) },
  mul: { inputs: ['a', 'b'], eval: strict(({ a, b }) => zip([a, b], (p, q) => p * q)) },
  div: { inputs: ['a', 'b'], eval: strict(({ a, b }) => zip([a, b], (p, q) => (q === 0 ? fail('除以 0', 'divided by 0') : p / q))) },
  floor: { inputs: ['a'], eval: strict(({ a }) => zip([a], Math.floor)) },
  sqrt: { inputs: ['a'], eval: strict(({ a }) => zip([a], (p) => (p < 0 ? fail('负数没有平方根', 'a negative number has no square root') : Math.sqrt(p)))) },
  min: { inputs: ['a', 'b'], eval: strict(({ a, b }) => zip([a, b], Math.min)) },
  max: { inputs: ['a', 'b'], eval: strict(({ a, b }) => zip([a, b], Math.max)) },
  less: { inputs: ['a', 'b'], eval: strict(({ a, b }) => zip([a, b], (p, q) => (p < q ? 1 : 0))) },
  select: { inputs: ['if', 'yes', 'no'], eval: strict((ins) => zip([ins.if, ins.yes, ins.no], (c, p, q) => (c !== 0 ? p : q))) },
  size: {
    inputs: ['image'],
    outputs: () => ['w', 'h'],
    eval: strict(({ image }, _node, _ctx, key) => (isImage(image) ? image[key] : fail('size 要一张图', 'size needs an image'))),
  },
  grid: {
    inputs: ['w', 'h'],
    outputs: () => ['x', 'y'],
    eval: strict(({ w, h }, _node, _ctx, key) => {
      const [W, H] = [wholeSize(w, 'w'), wholeSize(h, 'h')]
      return make(W, H, 1, (x, y) => (key === 'x' ? x : y))
    }),
  },
  lookup: { inputs: ['image', 'x', 'y'], settings: { outside: OUTSIDE }, eval: strict(lookup) },
  // The channel is a setting, its position in the pixel (0, 1, 2), not a wire. It is a position, not a colour: which
  // colour sits there is the image's channel order (RGB, or BGR as OpenCV reads it).
  channel: {
    inputs: ['image'],
    settings: { c: CHANNELS },
    eval: strict(({ image }, node) => {
      if (!isImage(image) || image.c !== 3) fail('channel 要一张彩色图', 'channel needs a colour image')
      const c = CHANNELS.indexOf(String(node.params?.c ?? '0'))
      return make(image.w, image.h, 1, (x, y) => image.data[(y * image.w + x) * 3 + c])
    }),
  },
  compose: {
    inputs: ['r', 'g', 'b'],
    eval: strict(({ r, g, b }) => {
      const planes = [r, g, b]
      if (!planes.every((p) => isImage(p) && p.c === 1)) fail('compose 要三张灰度图', 'compose needs three grey images')
      if (planes.some((p) => p.w !== r.w || p.h !== r.h)) fail(`三张图的尺寸不一样：${planes.map((p) => `${p.w} × ${p.h}`).join('、')}`, `the three planes differ in size: ${planes.map((p) => `${p.w} × ${p.h}`).join(', ')}`)
      return make(r.w, r.h, 3, (x, y, ch) => planes[ch].data[y * r.w + x])
    }),
  },
}

/** The parts a course may start from (the vocabulary's part kind): every part but the fixed cards. */
export const PRIMITIVES = Object.keys(PARTS).filter((k) => !FIXED.includes(k))
