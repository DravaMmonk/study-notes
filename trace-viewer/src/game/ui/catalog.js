import { AudioWaveform, Box, Calculator, Camera, Grid3x3, Minimize2, Monitor, Network, Search, Sparkles } from 'lucide-react'
import { NODE_TYPES } from '../engine/nodes.js'

// How each part looks on the board and in the parts list: a family (colour and icon) and a one-line
// description. Families group parts by what they look at, which is the idea the game is teaching.
export const FAMILIES = {
  io: { label: '相机与显示屏', icon: Camera },
  pixel: { label: '逐像素', icon: Calculator },
  neighbour: { label: '看邻居', icon: Grid3x3 },
  size: { label: '改尺寸', icon: Minimize2 },
  search: { label: '搜索与比较', icon: Search },
  frequency: { label: '频率', icon: AudioWaveform },
  global: { label: '看全局', icon: Network },
  learned: { label: '可学习', icon: Sparkles },
  other: { label: '元件', icon: Box },
}

const FAMILY_OF = {
  input: 'io', output: 'io',
  add: 'pixel', sub: 'pixel', mul: 'pixel', scale: 'pixel', offset: 'pixel', threshold: 'pixel', invert: 'pixel',
  square: 'pixel', sqrt: 'pixel', abs: 'pixel', relu: 'pixel', divide: 'pixel', lrnSigmoid: 'pixel',
  mystery: 'neighbour', shift: 'neighbour', blur3h: 'neighbour', box3: 'neighbour', gauss: 'neighbour', diffx: 'neighbour', diffy: 'neighbour',
  sobelx: 'neighbour', sobely: 'neighbour', kernel3: 'neighbour', sharpen: 'neighbour', gradmag: 'neighbour', harris: 'neighbour',
  downsample: 'size', maxpool: 'size', lrnGap: 'size',
  argmin4: 'search', disparity: 'search',
  fqSpectrum: 'frequency', fqLowpass: 'frequency',
  globalMax: 'global', attention: 'global', posenc: 'global',
  learn3: 'learned', lrnConv: 'learned', lrnDense: 'learned', lrnRgb: 'learned', lrnRes: 'learned',
  dg_encode: 'learned', dg_decode: 'learned', dg_decoder: 'learned', dg_mu: 'learned', dg_sigma: 'learned', dg_sample: 'learned', dg_reparam: 'learned',
}

export const familyOf = (type) => FAMILY_OF[type] ?? 'other'
export const iconOf = (type) => (type === 'output' ? Monitor : FAMILIES[familyOf(type)].icon)

const DESCRIPTIONS = {
  shift: '整张图挪一格；挪出边界的地方补 0',
  add: '两张图逐像素相加',
  sub: '两张图逐像素相减：a − b',
  mul: '两张图逐像素相乘',
  scale: '每个像素乘同一个数',
  offset: '每个像素加同一个数',
  threshold: '大于门槛输出 1，否则 0',
  square: '每个像素平方',
  sqrt: '每个像素开方',
  relu: '负数变 0，正数不变',
  abs: '取绝对值',
  divide: '逐像素相除：a ÷ b',
  globalMax: '整张图填满它的最大值',
  blur3h: '横向三点平均（你在 1-1 搭的）',
  box3: '3×3 平均（你在 1-2 搭的）',
  gauss: '高斯模糊，σ 可调',
  diffx: '右边邻居 − 自己',
  diffy: '下边邻居 − 自己',
  sobelx: '横向求导、纵向平滑',
  sobely: '纵向求导、横向平滑',
  kernel3: '任意 3×3 核（按“互相关”读权重）',
  learn3: '3×3 核，权重由训练决定',
  downsample: '每隔一点取一个，尺寸减半',
  maxpool: '每个 2×2 块取最大值，尺寸减半',
  gradmag: '√(Gx² + Gy²)',
  argmin4: '逐像素比较几张代价图，输出最小者的编号',
  disparity: '左右图逐行匹配，输出视差，窗口可选',
}

export const describe = (type) => DESCRIPTIONS[type] ?? NODE_TYPES[type]?.description ?? ''
