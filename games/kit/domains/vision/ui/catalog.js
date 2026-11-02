// What the vision domain's cards are called and what they do, for the boards, the tray and the components box. A
// part's description says only what it does (games/DESIGN.md 4).
import { ArrowDown, ArrowRightFromLine, Blend, ChevronsDown, Divide, Grid3x3, Hash, Layers, Maximize2, Minus, MoveDown, MoveUp, Plus, ScanSearch, Split, X } from 'lucide-react'

const T = (zh, en) => ({ zh, en })

const EACH = T('数和数、图和数、同样大小的两张图都行，逐个值算；灰度图和彩色图一起时，灰度的一格配彩色的三个通道。', 'Numbers, an image and a number, or two images of one size, value by value; a grey image with a colour one gives each grey cell to all three channels.')
const each = (zh, en) => T(`${zh}${EACH.zh}`, `${en} ${EACH.en}`)

export const CARDS = {
  in: { name: T('输入', 'Input'), icon: ArrowRightFromLine, family: 'given', desc: T('这一关给的值：一个数或一张图。', 'The value the level gives: a number or an image.') },
  out: { name: T('输出', 'Output'), icon: ArrowRightFromLine, family: 'end', desc: T('接到这里的值，就是电路的输出。', 'The value wired here is the circuit’s output.') },
  const: { name: T('常数', 'Constant'), icon: Hash, family: 'value', desc: T('始终给出设定的数。', 'Always gives the number it is set to.') },
  add: { name: T('相加', 'Add'), icon: Plus, family: 'value', desc: each('给出两者之和。', 'Gives the sum of the two.') },
  sub: { name: T('相减', 'Subtract'), icon: Minus, family: 'value', desc: each('给出 a 减 b。', 'Gives a less b.') },
  mul: { name: T('相乘', 'Multiply'), icon: X, family: 'value', desc: each('给出两者之积。', 'Gives the product of the two.') },
  div: { name: T('相除', 'Divide'), icon: Divide, family: 'value', desc: each('给出 a 除以 b；除以 0 时停下报错。', 'Gives a divided by b; dividing by 0 stops with an error.') },
  floor: { name: T('向下取整', 'Floor'), icon: ArrowDown, family: 'value', desc: each('给出不大于它的最大整数。', 'Gives the largest whole number not above it.') },
  min: { name: T('取小', 'Min'), icon: MoveDown, family: 'value', desc: each('给出两者中小的那个。', 'Gives the smaller of the two.') },
  max: { name: T('取大', 'Max'), icon: MoveUp, family: 'value', desc: each('给出两者中大的那个。', 'Gives the larger of the two.') },
  less: { name: T('小于', 'Less'), icon: ChevronsDown, family: 'logic', desc: each('a 小于 b 时给出 1，否则给出 0。', 'Gives 1 where a is less than b, else 0.') },
  select: { name: T('选择', 'Select'), icon: Split, family: 'logic', desc: each('「条件」不为 0 时给出「是」，为 0 时给出「否」。', 'Gives Yes where Condition is not 0, No where it is 0.') },
  size: { name: T('尺寸', 'Size'), icon: Maximize2, family: 'image', desc: T('给出图的宽 w 和高 h。', 'Gives an image’s width w and height h.') },
  grid: { name: T('坐标网格', 'Grid'), icon: Grid3x3, family: 'image', desc: T('给出 w × h 的两张坐标图：x 图每格是自己的 x，y 图每格是自己的 y。w、h 须为正整数。', 'Gives the two w × h coordinate images: in x every cell holds its own x, in y its own y. w and h must be positive whole numbers.') },
  lookup: { name: T('取像素', 'Lookup'), icon: ScanSearch, family: 'image', desc: T('在图的 (x, y) 处取值。x、y 是数时取一个像素；是同样大小的坐标图时，每格各取一个，拼成一张同样大小的图。坐标须为整数；出界时按设置报错、取 0 或取最近的边。', 'Reads the image at (x, y). At numbers it reads one pixel; at coordinate images of one size it reads one per cell, an image of that size. Coordinates must be whole numbers; outside the image it stops, reads 0 or reads the nearest edge, as set.') },
  channel: { name: T('取通道', 'Channel'), icon: Layers, family: 'image', desc: T('给出彩色图的一个通道（元件上选 R、G 或 B），一张灰度图。', 'Gives one channel of a colour image (R, G or B, set on the card) as a grey one.') },
  compose: { name: T('合成彩色', 'Compose'), icon: Blend, family: 'image', desc: T('把三张同样大小的灰度图合成一张彩色图（R、G、B）。', 'Makes three grey images of one size one colour image (R, G, B).') },
}

export const PORT_LABELS = {
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
export const CHANNELS = [['R', 'R'], ['G', 'G'], ['B', 'B']]

/** What a lookup does outside the image, as its card offers it. */
export const OUTSIDE = [['error', T('报错', 'Stop')], ['zero', T('取 0', 'Read 0')], ['clamp', T('取最近的边', 'Nearest edge')]]
