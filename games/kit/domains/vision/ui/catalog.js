// What the vision domain's cards are called and what they do, for the boards, the tray and the components box. A
// part's description says only what it does (games/DESIGN.md 4).
import { ArrowDown, ArrowRightFromLine, Blend, ChevronsDown, Divide, Grid3x3, Hash, Layers, Maximize2, Minus, MoveDown, MoveUp, Plus, Radical, ScanSearch, Split, X } from 'lucide-react'

import { CONSTRUCTION_CARDS, CONSTRUCTION_FIELDS, CONSTRUCTION_PORTS } from './construction-catalog.js'

const T = (zh, en) => ({ zh, en })

const EACH = T('数和数、图和数、同样大小的两张图都行，逐个值算；灰度图和彩色图一起时，灰度的一格配彩色的三个通道。', 'Numbers, an image and a number, or two images of one size, value by value; a grey image with a colour one gives each grey cell to all three channels.')
const each = (zh, en) => T(`${zh}${EACH.zh}`, `${en} ${EACH.en}`)

export const CARDS = {
  arithmetic: { name: T('四则运算', 'Arithmetic'), icon: Plus, family: 'value', desc: T('设置为加、减、乘或除。按 a 运算 b，图像按对应格逐值计算；图和数配对时，数用于每格。除数为 0 时报告错误。', 'Select addition, subtraction, multiplication or division. Compute a op b elementwise, broadcasting a scalar to image cells. Division by zero reports an error.') },
  ...CONSTRUCTION_CARDS,
  sample: { name: T('连续位置采样', 'Sample'), icon: ScanSearch, family: 'image', desc: T('从给定的 x、y 位置读取图像。最近邻保留一个原有读数；双线性按距离混合四个邻居。取整、权重与逐通道计算自动完成。图外按设置处理。', 'Read the image at x and y. Nearest copies an original sample; bilinear mixes four neighbours by distance. Rounding, weighting and channel arithmetic are automatic. Outside positions use the selected assumption.') },
  stencil: { name: T('邻域加权', 'Neighbourhood'), icon: Grid3x3, family: 'image', desc: T('沿选择的方向读取相邻三格，分别乘 a、b、c 后相加。横向按左、中、右，纵向按上、中、下排列；这是位置权重，不额外翻转。边界按设置处理，输出与原图同尺寸。', 'Weight three neighbours by a, b and c. Along x the order is left, centre, right; along y it is above, centre, below. These are positional weights with no extra reversal. The output keeps the input dimensions.') },
  kernelFilter: { name: T('核作用', 'Apply kernel'), icon: Grid3x3, family: 'image', desc: T('将输入核的中心对齐每个像素并加权求和。互相关直接使用书写顺序；数学卷积将核旋转 180 度。边界按设置处理。', 'Centre the supplied kernel at every pixel and compute its weighted sum. Correlation uses written order; mathematical convolution rotates the kernel by 180 degrees. Boundaries use the selected assumption.') },
  magnitude: { name: T('向量长度', 'Vector length'), icon: Radical, family: 'value', desc: T('将 x、y 作为两个互相垂直的分量，计算 sqrt(x² + y²)。数值和同尺寸图都可使用。自动计算，不改变方向分量本身。', 'Treat x and y as perpendicular components and compute sqrt(x² + y²). Works on numbers and matching images. The arithmetic is automatic; the components themselves remain unchanged.') },
  colourMix: { name: T('颜色组合', 'Colour mixture'), icon: Blend, family: 'image', desc: T('给 RGB 三个通道分别乘 wr、wg、wb，再相加得到单通道图。输出不自动截断，也不自动归一化权重。', 'Multiply RGB by wr, wg and wb, then add into one channel. Values are not clipped and weights are not normalised automatically.') },
  in: { name: T('输入', 'Input'), icon: ArrowRightFromLine, family: 'given', desc: T('这一关给的值：一个数或一张图。', 'The value the level gives: a number or an image.') },
  out: { name: T('输出', 'Output'), icon: ArrowRightFromLine, family: 'end', desc: T('接到这里的值，就是电路的输出。', 'The value wired here is the circuit’s output.') },
  const: { name: T('常数', 'Constant'), icon: Hash, family: 'value', desc: T('始终给出设定的数。', 'Always gives the number it is set to.') },
  add: { name: T('相加', 'Add'), icon: Plus, family: 'value', desc: T('将两个输入相加。数按数计算；图按对应格子计算，数值输入会用于每一格。坐标图保存的是取样位置，相加不会改变图的宽高。', 'Add two inputs. Numbers add directly; images add at matching cells, using a scalar at every cell. Coordinate images store sampling positions. Addition preserves image dimensions.') },
  sub: { name: T('相减', 'Subtract'), icon: Minus, family: 'value', desc: each('给出 a 减 b。', 'Gives a less b.') },
  mul: { name: T('相乘', 'Multiply'), icon: X, family: 'value', desc: each('给出两者之积。', 'Gives the product of the two.') },
  div: { name: T('相除', 'Divide'), icon: Divide, family: 'value', desc: each('给出 a 除以 b；除以 0 时停下报错。', 'Gives a divided by b; dividing by 0 stops with an error.') },
  floor: { name: T('向下取整', 'Floor'), icon: ArrowDown, family: 'value', desc: each('给出不大于它的最大整数。', 'Gives the largest whole number not above it.') },
  sqrt: { name: T('开平方', 'Square root'), icon: Radical, family: 'value', desc: each('给出它的平方根；负数停下报错。', 'Gives its square root; a negative number stops with an error.') },
  min: { name: T('取小', 'Min'), icon: MoveDown, family: 'value', desc: each('给出两者中小的那个。', 'Gives the smaller of the two.') },
  max: { name: T('取大', 'Max'), icon: MoveUp, family: 'value', desc: each('给出两者中大的那个。', 'Gives the larger of the two.') },
  less: { name: T('小于', 'Less'), icon: ChevronsDown, family: 'logic', desc: each('a 小于 b 时给出 1，否则给出 0。', 'Gives 1 where a is less than b, else 0.') },
  select: { name: T('选择', 'Select'), icon: Split, family: 'logic', desc: each('「条件」不为 0 时给出「是」，为 0 时给出「否」。', 'Gives Yes where Condition is not 0, No where it is 0.') },
  size: { name: T('尺寸', 'Size'), icon: Maximize2, family: 'image', desc: T('给出图的宽 w 和高 h。', 'Gives an image’s width w and height h.') },
  grid: { name: T('坐标网格', 'Grid'), icon: Grid3x3, family: 'image', desc: T('按宽 w、高 h 生成两张坐标图。在每个位置 (x, y)，x 图存列号 x，y 图存行号 y；保存的是坐标数字，不是照片亮度。w、h 须为正整数。', 'Produces two coordinate images of width w and height h. At position (x, y), the x image stores column x and the y image stores row y. These are coordinate numbers, not photographic intensities. w and h must be positive integers.') },
  lookup: { name: T('取像素', 'Lookup'), icon: ScanSearch, family: 'image', desc: T('在图的 (x, y) 处取值。x、y 是数时取一个像素；是同样大小的坐标图时，每格各取一个，拼成一张同样大小的图。坐标须为整数；出界时按设置报错、取 0 或取最近的边。', 'Reads the image at (x, y). At numbers it reads one pixel; at coordinate images of one size it reads one per cell, an image of that size. Coordinates must be whole numbers; outside the image it stops, reads 0 or reads the nearest edge, as set.') },
  channel: { name: T('取通道', 'Channel'), icon: Layers, family: 'image', desc: T('给出彩色像素里第 c 个位置（0、1、2，在元件上选）上的数组成的灰度图。哪个位置是哪种颜色，看图按什么顺序存：RGB 图的 0 是红，BGR 图的 0 是蓝。', 'Gives the grey image of the numbers at position c (0, 1 or 2, set on the part) of each colour pixel. Which colour sits at a position depends on the image’s channel order: in an RGB image 0 is red, in a BGR one blue.') },
  compose: { name: T('合成彩色', 'Compose'), icon: Blend, family: 'image', desc: T('把三张同样大小的灰度图合成一张彩色图（R、G、B）。', 'Makes three grey images of one size one colour image (R, G, B).') },
}

export const PORT_LABELS = {
  arithmetic: { a: 'a', b: 'b' },
  ...CONSTRUCTION_PORTS,
  sample: { image: T('图', 'Image'), x: 'x', y: 'y' },
  stencil: { image: T('图', 'Image') },
  kernelFilter: { image: T('图', 'Image'), kernel: T('核', 'Kernel') },
  magnitude: { x: 'x', y: 'y' },
  colourMix: { image: T('图', 'Image'), wr: 'R', wg: 'G', wb: 'B' },
  select: { if: T('条件', 'Condition'), yes: T('是', 'Yes'), no: T('否', 'No') },
  sub: { a: 'a', b: 'b' },
  div: { a: 'a', b: 'b' },
  less: { a: 'a', b: 'b' },
  lookup: { image: T('图', 'Image'), x: 'x', y: 'y' },
  size: { image: T('图', 'Image') },
  grid: { w: 'w', h: 'h' },
  channel: { image: T('图', 'Image') },
  compose: { r: 'R', g: 'G', b: 'B' },
}

/** The channels a channel card takes. */
export const CHANNELS = [['0', '0'], ['1', '1'], ['2', '2']]

/** What a lookup does outside the image, as its card offers it. */
export const OUTSIDE = [['error', T('报错', 'Stop')], ['zero', T('取 0', 'Read 0')], ['clamp', T('取最近的边', 'Nearest edge')]]

/** Semantic settings are shared by the compact card and its detail sheet. */
export const OPERATOR_FIELDS = {
  arithmetic: [{ key: 'op', label: T('运算', 'Operation'), options: [['add', T('加 +', 'Add +')], ['sub', T('减 −', 'Subtract −')], ['mul', T('乘 ×', 'Multiply ×')], ['div', T('除 ÷', 'Divide ÷')]] }],
  ...CONSTRUCTION_FIELDS,
  sample: [
    { key: 'method', label: T('取值规则', 'Interpolation'), options: [['nearest', T('最近邻', 'Nearest')], ['bilinear', T('双线性', 'Bilinear')]] },
    { key: 'outside', label: T('图外假设', 'Outside'), options: OUTSIDE },
  ],
  stencil: [
    { key: 'axis', label: T('方向', 'Axis'), options: [['x', T('横向：左中右', 'Across: left/centre/right')], ['y', T('纵向：上中下', 'Down: above/centre/below')]] },
    { key: 'a', label: 'a' }, { key: 'b', label: 'b' }, { key: 'c', label: 'c' },
    { key: 'outside', label: T('图外假设', 'Outside'), options: OUTSIDE.filter(([v]) => v !== 'error') },
  ],
  kernelFilter: [
    { key: 'convention', label: T('核约定', 'Kernel convention'), options: [['correlation', T('互相关：不翻转', 'Correlation: no reversal')], ['convolution', T('数学卷积：翻转', 'Convolution: reverse')]] },
    { key: 'outside', label: T('图外假设', 'Outside'), options: OUTSIDE.filter(([v]) => v !== 'error') },
  ],
}
