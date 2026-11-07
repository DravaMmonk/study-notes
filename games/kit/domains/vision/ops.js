// The vision domain's engine resources (games/DESIGN.md 6.8, 6.9): every computation a vision game's parts.json may
// call, each with what it is, its arguments (positional) and its named parameters (a schema). A part's expression
// calls them on its inputs and settings; a resource handed what it cannot work on stops with why (a PartError, shown
// on the card). The kernel's builtins (../../engine/parts/builtins.js) come too.
//
// Values are numbers, vectors { x, y } and images (image.js). Per-pixel work is done a whole image at a time: gridX
// and gridY give an image's coordinates as two images, arithmetic acts value by value on numbers and images alike, and
// lookup reads an image at every coordinate of a coordinate image at once.
import { PartError } from '../../engine/circuit.js'
import { S } from '../../engine/schema.js'
import { isImage, isVector, make } from './image.js'
import { colourMix, filterImage, sampleImage, stencilImage } from './operators.js'
import { BORDERS, expandRows, positions, reduceRows, restoreShape, reverse, shiftRead, transpose, trim, windowSamples, windowWeights, weightedLine } from './construction.js'
import { T as t } from '../../shell/i18n.js'

const fail = (zh, en) => { throw new PartError(t(zh, en)) }
const args = (...names) => names.map((name) => ({ name }))
const named = (fields) => S.obj(fields)

/**
 * f applied value by value over its arguments: numbers give a number; vectors (with numbers spread over them) give a
 * vector, component by component; images (with numbers spread over them) give an image of their size. Two images
 * must be the same size; a grey one goes with each channel of a colour one. A vector never mixes with an image.
 */
export function zip(values, f) {
  if (values.some(isVector)) {
    if (values.some(isImage)) fail('向量不能和图逐值计算', 'a vector does not combine with an image')
    const at = (a, k) => (isVector(a) ? a[k] : a)
    return { x: f(...values.map((a) => at(a, 'x'))), y: f(...values.map((a) => at(a, 'y'))) }
  }
  const images = values.filter(isImage)
  if (!images.length) return f(...values)
  const [{ w, h }] = images
  if (images.some((i) => i.w !== w || i.h !== h)) fail(`图的尺寸不一样：${images.map((i) => `${i.w} × ${i.h}`).join('、')}`, `the images differ in size: ${images.map((i) => `${i.w} × ${i.h}`).join(', ')}`)
  const c = Math.max(...images.map((i) => i.c))
  if (images.some((i) => i.c !== 1 && i.c !== c)) fail('通道数对不上', 'the channels do not match')
  const at = (a, x, y, ch) => (isImage(a) ? a.data[(y * w + x) * a.c + (a.c === 1 ? 0 : ch)] : a)
  return make(w, h, c, (x, y, ch) => f(...values.map((a) => at(a, x, y, ch))))
}

const isInt = (v) => Number.isInteger(v)
const wholeSize = (n, name) => {
  if (typeof n !== 'number' || !isInt(n) || n < 1) fail(`${name} 应当是正整数，得到 ${n}`, `${name} should be a positive whole number, got ${n}`)
  return n
}
const imageOf = (v, what) => (isImage(v) ? v : fail(`${what} 要一张图`, `${what} needs an image`))

/** image at (x, y): x and y numbers (a value; a colour image gives a 1 × 1 colour image) or coordinate images. */
function lookup(image, x, y, outside = 'error') {
  if (!isImage(image)) fail('image 应当是一张图', 'image should be an image')
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

const OUTSIDE = S.opt(S.oneOf(['error', 'zero', 'clamp'], { about: t('图外：报错、取 0、取最近的边', 'outside: stop, read 0, read the nearest edge') }))
const BORDER = S.opt(S.oneOf(BORDERS, { about: t('图外：取 0、延续边缘、周期延续、镜像延续', 'outside: zero, replicate, periodic, reflect') }))
const AXIS = S.opt(S.oneOf(['x', 'y']))
const value2 = (about, f) => ({ about, args: args('a', 'b'), run: ([a, b]) => zip([a, b], f) })
const value1 = (about, f) => ({ about, args: args('a'), run: ([a]) => zip([a], f) })

function countProducts(ctx, count) {
  const work = ctx?.work
  if (!work) return
  work.multiplies += count
  const root = ctx.scope?.split('/')[0]
  if (root) work.byPart.set(root, (work.byPart.get(root) ?? 0) + count)
}

const finiteValues = (values) => {
  if (!values.every(Number.isFinite)) fail('向量分量需要有限数值', 'Vector components must be finite numbers')
  return values
}

export const OPS = {
  vector2: { about: t('由两个数构造方向向量 (x, y)', 'A direction vector (x, y) from two numbers'), args: args('x', 'y'), run: (values) => { const [x, y] = finiteValues(values); return { x, y } } },
  weightVector: { about: t('由前、中、后三个数构造权重向量', 'A first/centre/last weight vector from three numbers'), args: args('first', 'centre', 'last'), run: (values) => { const weights = finiteValues(values); return make(3, 1, 1, (x) => weights[x]) } },
  gaussianRow: {
    about: t('按给定尺度生成归一化的一维高斯权重', 'A normalised Gaussian row at the selected scale'),
    args: args('sigma'),
    run: ([sigma]) => {
      if (!Number.isFinite(sigma) || sigma < 0.25 || sigma > 4) fail('尺度必须在 0.25 至 4 之间', 'Scale must be between 0.25 and 4')
      const radius = Math.ceil(2 * sigma)
      const weights = Array.from({ length: 2 * radius + 1 }, (_, x) => Math.exp(-0.5 * ((x - radius) / sigma) ** 2))
      const total = weights.reduce((sum, weight) => sum + weight, 0)
      return make(weights.length, 1, 1, x => weights[x] / total)
    },
  },
  weightRow5: {
    about: t('五项权重组成一行', 'Five weights arranged in a row'),
    args: args('a', 'b', 'c', 'd', 'e'),
    run: (values) => {
      const weights = finiteValues(values)
      return make(5, 1, 1, (x) => weights[x])
    },
  },
  weightedLine: { about: t('沿方向 d 按前、中、后权重向量汇合三格读数', 'Three samples along d combined with a first/centre/last weight vector'), args: args('image', 'weights', 'd'), params: named({ outside: BORDER }), run: ([image, weights, d], options, ctx) => {
    const result = weightedLine(image, weights, d, options)
    countProducts(ctx, 3 * result.data.length)
    return result
  } },
  add: value2(t('a + b，逐个值', 'a + b, value by value'), (p, q) => p + q),
  sub: value2(t('a − b，逐个值', 'a − b, value by value'), (p, q) => p - q),
  mul: {
    about: t('a × b，逐个值', 'a × b, value by value'),
    args: args('a', 'b'),
    run: (values, _options, ctx) => {
      const result = zip(values, (a, b) => a * b)
      countProducts(ctx, isImage(result) ? result.data.length : isVector(result) ? 2 : 1)
      return result
    },
  },
  div: value2(t('a ÷ b，逐个值；除以 0 报错', 'a ÷ b, value by value; dividing by 0 stops'), (p, q) => (q === 0 ? fail('除以 0', 'divided by 0') : p / q)),
  min: value2(t('两者中小的，逐个值', 'the smaller, value by value'), Math.min),
  max: value2(t('两者中大的，逐个值', 'the larger, value by value'), Math.max),
  less: value2(t('a < b 为 1，否则为 0，逐个值', '1 where a < b, else 0, value by value'), (p, q) => (p < q ? 1 : 0)),
  hypot: value2(t('√(a² + b²)，逐个值', '√(a² + b²), value by value'), Math.hypot),
  abs: value1(t('绝对值，逐个值', 'absolute value, value by value'), Math.abs),
  floor: value1(t('向下取整，逐个值', 'round down, value by value'), Math.floor),
  sqrt: value1(t('平方根，逐个值；负数报错', 'square root, value by value; a negative number stops'), (p) => (p < 0 ? fail('负数没有平方根', 'a negative number has no square root') : Math.sqrt(p))),
  cosTurns: value1(t('cos(2πa)：a 以周为单位，逐个值', 'cos(2πa), a in turns, value by value'), (v) => Math.cos(2 * Math.PI * v)),
  select: { about: t('条件不为 0 取 yes，否则取 no，逐个值', 'yes where the condition is not 0, else no, value by value'), args: args('if', 'yes', 'no'), run: ([c, p, q]) => zip([c, p, q], (x, y, z) => (x !== 0 ? y : z)) },
  width: { about: t('图的宽', 'an image’s width'), args: args('image'), run: ([image]) => imageOf(image, 'width').w },
  height: { about: t('图的高', 'an image’s height'), args: args('image'), run: ([image]) => imageOf(image, 'height').h },
  gridX: { about: t('w × h 的图，每格是它的 x', 'a w × h image, each cell its x'), args: args('w', 'h'), run: ([w, h]) => make(wholeSize(w, 'w'), wholeSize(h, 'h'), 1, (x) => x) },
  gridY: { about: t('w × h 的图，每格是它的 y', 'a w × h image, each cell its y'), args: args('w', 'h'), run: ([w, h]) => make(wholeSize(w, 'w'), wholeSize(h, 'h'), 1, (_x, y) => y) },
  lookup: { about: t('在图的 (x, y) 处取值：数取一个值，坐标图取同样大小的一张图；坐标须为整数', 'the image at (x, y): one value at numbers, an image at coordinate images; whole numbers only'), args: args('image', 'x', 'y'), params: named({ outside: OUTSIDE }), run: ([image, x, y], { outside }) => lookup(image, x, y, outside) },
  channel: {
    about: t('彩色像素里第 c 个位置组成的灰度图', 'the grey image of position c of each colour pixel'), args: args('image'), params: named({ c: S.opt(S.oneOf(['0', '1', '2'])) }),
    run: ([image], { c = '0' }) => {
      if (!isImage(image) || image.c !== 3) fail('channel 要一张彩色图', 'channel needs a colour image')
      const k = Number(c)
      return make(image.w, image.h, 1, (x, y) => image.data[(y * image.w + x) * 3 + k])
    },
  },
  compose: {
    about: t('三张同样大小的灰度图拼成彩色图', 'three grey images of one size made one colour image'), args: args('r', 'g', 'b'),
    run: (planes) => {
      const [r] = planes
      if (!planes.every((p) => isImage(p) && p.c === 1)) fail('compose 要三张灰度图', 'compose needs three grey images')
      if (planes.some((p) => p.w !== r.w || p.h !== r.h)) fail(`三张图的尺寸不一样：${planes.map((p) => `${p.w} × ${p.h}`).join('、')}`, `the three planes differ in size: ${planes.map((p) => `${p.w} × ${p.h}`).join(', ')}`)
      return make(r.w, r.h, 3, (x, y, ch) => planes[ch].data[y * r.w + x])
    },
  },
  sample: { about: t('按连续坐标采样：最近邻或双线性', 'sample at continuous coordinates: nearest or bilinear'), args: args('image', 'x', 'y'), params: named({ method: S.opt(S.oneOf(['nearest', 'bilinear'])), outside: OUTSIDE }), run: ([image, x, y], options) => sampleImage(image, x, y, options) },
  stencil: { about: t('沿一条轴对三格邻域按 a、b、c 加权', 'three neighbours along one axis weighted by a, b, c'), args: args('image', 'a', 'b', 'c'), params: named({ axis: AXIS, outside: OUTSIDE }), run: ([image, a, b, c], options) => stencilImage(image, [a, b, c], options) },
  kernelFilter: { about: t('用核计算互相关或数学卷积', 'a kernel applied as correlation or convolution'), args: args('image', 'kernel'), params: named({ convention: S.opt(S.oneOf(['correlation', 'convolution'])), outside: OUTSIDE }), run: ([image, kernel], options) => filterImage(image, kernel, options) },
  colourMix: { about: t('RGB 三个通道按 wr、wg、wb 加权相加', 'RGB weighted by wr, wg, wb and added'), args: args('image', 'wr', 'wg', 'wb'), run: ([image, ...weights]) => colourMix(image, weights) },
  shift: { about: t('输出 (x, y) 读输入 (x, y) + d', 'output (x, y) reads input (x, y) + d'), args: args('image', 'd'), params: named({ outside: BORDER }), run: ([image, d], options) => shiftRead(image, d, options) },
  transpose: { about: t('行列互换', 'rows and columns exchanged'), args: args('image'), run: ([image]) => transpose(image) },
  reverse: { about: t('旋转 180 度', 'rotated 180 degrees'), args: args('image'), run: ([image]) => reverse(image) },
  windowSamples: { about: t('每个输出位置的邻域读数，一行一个位置', 'each output position’s window samples, a row a position'), args: args('image', 'kernel'), params: named({ axis: AXIS, outside: BORDER }), run: ([image, kernel], options) => windowSamples(image, kernel, options) },
  windowWeights: { about: t('和 windowSamples 对应的权重', 'the weights matching windowSamples'), args: args('image', 'kernel'), run: ([image, kernel]) => windowWeights(image, kernel) },
  reduceRows: { about: t('逐行求和或平均', 'each row summed or averaged'), args: args('image'), params: named({ mode: S.opt(S.oneOf(['mean', 'sum'])) }), run: ([image], options) => reduceRows(image, options) },
  restoreShape: { about: t('一列逐位置结果还原为 shape 的宽高', 'a column of per-position results laid out at shape’s size'), args: args('values', 'shape'), run: ([values, shape]) => restoreShape(values, shape) },
  trim: { about: t('四边按半径 r 去掉', 'borders of radii r removed'), args: args('image', 'r'), run: ([image, r]) => trim(image, r) },
  positions: { about: t('每行的位置 x/N', 'each row’s positions x/N'), args: args('image'), run: ([image]) => positions(image) },
  expandValues: { about: t('每行重复 N 次', 'each row repeated N times'), args: args('image'), run: ([image]) => expandRows(image, 'values') },
  expandPositions: { about: t('重复后每格的位置 x/N', 'each repeated sample’s position x/N'), args: args('image'), run: ([image]) => expandRows(image, 'position') },
  expandIndices: { about: t('重复后每行的索引 k', 'each repetition’s index k'), args: args('image'), run: ([image]) => expandRows(image, 'frequency') },
}

/** The resources as the vocabulary lists them (data). */
export const OP_ITEMS = Object.fromEntries(Object.entries(OPS).map(([k, resource]) => { const { run: _, ...item } = resource; return [k, item] }))
