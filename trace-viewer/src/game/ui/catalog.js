import { ArrowRightFromLine, ArrowRightToLine, AudioWaveform, Box, Calculator, Grid3x3, Minimize2, Network, Search, Sparkles } from 'lucide-react'
import { NODE_TYPES } from '../engine/nodes.js'
import { L } from '../i18n.js'

// How each part looks on the board and in the parts list: a family (colour and icon) and a one-line
// description. Families group parts by what they look at, which is the idea the game is teaching.
export const FAMILIES = {
  io: { label: { zh: '输入与输出', en: 'Inputs and outputs' }, icon: ArrowRightFromLine },
  pixel: { label: { zh: '逐像素', en: 'Per-pixel' }, icon: Calculator },
  neighbour: { label: { zh: '看邻居', en: 'Neighbours' }, icon: Grid3x3 },
  size: { label: { zh: '改尺寸', en: 'Resize' }, icon: Minimize2 },
  search: { label: { zh: '搜索与比较', en: 'Search and compare' }, icon: Search },
  frequency: { label: { zh: '频率', en: 'Frequency' }, icon: AudioWaveform },
  global: { label: { zh: '看全局', en: 'Global' }, icon: Network },
  learned: { label: { zh: '可学习', en: 'Learnable' }, icon: Sparkles },
  other: { label: { zh: '元件', en: 'Parts' }, icon: Box },
}

const FAMILY_OF = {
  input: 'io', output: 'io',
  add: 'pixel', sub: 'pixel', mul: 'pixel', scale: 'pixel', offset: 'pixel', threshold: 'pixel', invert: 'pixel',
  square: 'pixel', sqrt: 'pixel', abs: 'pixel', relu: 'pixel', divide: 'pixel', lrnSigmoid: 'pixel',
  mystery: 'neighbour', shift: 'neighbour', blur3h: 'neighbour', box3: 'neighbour', gauss: 'neighbour', diffx: 'neighbour', diffy: 'neighbour',
  sobelx: 'neighbour', sobely: 'neighbour', kernel3: 'neighbour', sharpen: 'neighbour', gradmag: 'neighbour', harris: 'neighbour',
  downsample: 'size', maxpool: 'size', lrnGap: 'size',
  argmin4: 'search', disparity: 'search',
  fqSpectrum: 'frequency', fqLowpass: 'frequency', fqWave: 'frequency', fqMean: 'global',
  globalMax: 'global', attention: 'global', posenc: 'global',
  learn3: 'learned', lrnConv: 'learned', lrnDense: 'learned', lrnRgb: 'learned', lrnRes: 'learned',
  dg_encode: 'learned', dg_decode: 'learned', dg_decoder: 'learned', dg_mu: 'learned', dg_sigma: 'learned', dg_sample: 'learned', dg_reparam: 'learned',
}

export const familyOf = (type) => FAMILY_OF[type] ?? 'other'
export const iconOf = (type) => (type === 'output' ? ArrowRightToLine : FAMILIES[familyOf(type)].icon)

const DESCRIPTIONS = {
  shift: { zh: '整张图挪一格；挪出边界的地方补 0', en: 'Moves the whole picture one pixel; what moves in from the border is 0' },
  add: { zh: '两张图逐像素相加', en: 'Adds two pictures pixel by pixel' },
  sub: { zh: '两张图逐像素相减：a − b', en: 'Subtracts two pictures pixel by pixel: a − b' },
  mul: { zh: '两张图逐像素相乘', en: 'Multiplies two pictures pixel by pixel' },
  scale: { zh: '每个像素乘同一个数', en: 'Multiplies every pixel by the same number' },
  offset: { zh: '每个像素加同一个数', en: 'Adds the same number to every pixel' },
  threshold: { zh: '大于门槛输出 1，否则 0', en: '1 above the threshold, 0 otherwise' },
  square: { zh: '每个像素平方', en: 'Squares every pixel' },
  sqrt: { zh: '每个像素开方', en: 'Square root of every pixel' },
  relu: { zh: '负数变 0，正数不变', en: 'Negatives become 0, positives stay' },
  abs: { zh: '取绝对值', en: 'Absolute value' },
  divide: { zh: '逐像素相除：a ÷ b', en: 'Divides pixel by pixel: a ÷ b' },
  globalMax: { zh: '整张图填满它的最大值', en: 'Fills the picture with its maximum' },
  blur3h: { zh: '横向三点平均（你在 1-1 搭的）', en: '3-point horizontal average (you built it in 1-1)' },
  box3: { zh: '3×3 平均（你在 1-2 搭的）', en: '3×3 average (you built it in 1-2)' },
  gauss: { zh: '高斯模糊，σ 可调', en: 'Gaussian blur, adjustable σ' },
  diffx: { zh: '右边邻居 − 自己', en: 'Right neighbour − itself' },
  diffy: { zh: '下边邻居 − 自己', en: 'Neighbour below − itself' },
  sobelx: { zh: '横向求导、纵向平滑', en: 'Differentiates across, smooths down' },
  sobely: { zh: '纵向求导、横向平滑', en: 'Differentiates down, smooths across' },
  kernel3: { zh: '任意 3×3 核（按“互相关”读权重）', en: 'Any 3×3 kernel (weights read as cross-correlation)' },
  learn3: { zh: '3×3 核，权重由训练决定', en: '3×3 kernel whose weights are set by training' },
  downsample: { zh: '每隔一点取一个，尺寸减半', en: 'Keeps every other pixel, halving the size' },
  maxpool: { zh: '每个 2×2 块取最大值，尺寸减半', en: 'Takes the maximum of each 2×2 block, halving the size' },
  gradmag: '√(Gx² + Gy²)',
  argmin4: { zh: '逐像素比较几张代价图，输出最小者的编号', en: 'Compares cost maps pixel by pixel and outputs the index of the smallest' },
  disparity: { zh: '左右图逐行匹配，输出视差，窗口可选', en: 'Matches the left and right images row by row and outputs disparity; window size selectable' },
}

// Resolved in the current language.
export const describe = (type) => L(DESCRIPTIONS[type] ?? NODE_TYPES[type]?.description ?? '')
