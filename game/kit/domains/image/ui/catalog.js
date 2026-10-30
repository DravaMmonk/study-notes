import { ArrowRightFromLine, ArrowRightToLine, AudioWaveform, Box, Calculator, Grid3x3, Minimize2, Network, Package, Search, Sparkles } from 'lucide-react'
import { NODE_TYPES } from '../engine/nodes.js'
import { L } from '../../../shell/i18n.js'

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
  own: { label: { zh: '你封装的', en: 'Your own' }, icon: Package },
  other: { label: { zh: '元件', en: 'Parts' }, icon: Box },
}

const FAMILY_OF = {
  input: 'io', output: 'io',
  add: 'pixel', sub: 'pixel', mul: 'pixel', arith: 'pixel', merge: 'pixel', const: 'pixel', threshold: 'pixel', invert: 'pixel',
  square: 'pixel', sqrt: 'pixel', cos: 'pixel', exp: 'pixel', relu: 'pixel', max: 'pixel', lrnSigmoid: 'pixel',
  mystery: 'neighbour', shift: 'neighbour', blur3h: 'neighbour', box3: 'neighbour', gauss: 'neighbour', diffx: 'neighbour',
  sobelx: 'neighbour', sobely: 'neighbour', kernel3: 'neighbour', gradmag: 'neighbour', harris: 'neighbour',
  downsample: 'size', maxpool: 'size', lrnGap: 'size', zeroUp: 'size',
  argmin4: 'search', disparity: 'search',
  fqSpectrum: 'frequency', fqLowpass: 'frequency', fqWave: 'frequency', fqMean: 'global',
  globalMax: 'global', attention: 'global',
  learn3: 'learned', lrnConv: 'learned', lrnConst: 'learned', lrnDense: 'learned', lrnRgb: 'learned', lrnRes: 'learned',
  dg_encode: 'learned', dg_decode: 'learned', dg_decoder: 'learned', dg_mu: 'learned', dg_sigma: 'learned', dg_sample: 'learned', dg_reparam: 'learned',
}

export const familyOf = (type) => (type.startsWith('own-') ? 'own' : FAMILY_OF[type] ?? 'other')
export const iconOf = (type) => (type === 'output' ? ArrowRightToLine : FAMILIES[familyOf(type)].icon)

const DESCRIPTIONS = {
  shift: { zh: '整张图平移一格；从边界移入的格子补 0', en: 'Shifts the whole picture by one pixel; cells shifted in from the border are 0' },
  invert: { zh: '每个像素变成 1 − 自己：亮的变暗，暗的变亮', en: 'Every pixel becomes 1 − itself: light turns dark and dark turns light' },
  add: { zh: '两张图逐像素相加：a + b', en: 'Adds two pictures pixel by pixel: a + b' },
  sub: { zh: '两张图逐像素相减：a − b', en: 'Subtracts two pictures pixel by pixel: a − b' },
  mul: { zh: '两张图逐像素相乘：a × b', en: 'Multiplies two pictures pixel by pixel: a × b' },
  arith: { zh: '两张图逐像素相加、相减、相乘或相除：a + b、a − b、a × b 或 a ÷ b，运算在元件上选择', en: 'Adds, subtracts, multiplies or divides two pictures pixel by pixel (a + b, a − b, a × b or a ÷ b); the operation is chosen on the part' },
  merge: { zh: '有三个输入口，将接入的图逐像素相加；空置的输入口不计入', en: 'Has three inputs and adds the pictures wired into them pixel by pixel; an empty input is skipped' },
  const: { zh: '始终输出同一个数。与图相加或相乘时，这个数作用于每一格', en: 'Always outputs the same number. Added to or multiplied with a picture, it applies to every cell' },
  threshold: { zh: '大于阈值输出 1，否则输出 0', en: '1 above the threshold, 0 otherwise' },
  square: { zh: '每个像素平方', en: 'Squares every pixel' },
  sqrt: { zh: '每个像素开方', en: 'Square root of every pixel' },
  relu: { zh: '负数变 0，正数不变', en: 'Negatives become 0, positives stay' },
  globalMax: { zh: '用整张图的最大值填满每一格', en: 'Fills every cell with the maximum of the picture' },
  blur3h: { zh: '每格换成它和左右两个邻居的平均', en: 'Each cell becomes the average of itself and its left and right neighbours' },
  box3: { zh: '每格换成它周围 3×3 九个格子的平均', en: 'Each cell becomes the average of the nine cells in the 3×3 block around it' },
  gauss: { zh: '高斯模糊，σ 可调', en: 'Gaussian blur, adjustable σ' },
  diffx: { zh: '右边邻居 − 自己', en: 'Right neighbour − itself' },
  sobelx: { zh: '横向求导、纵向平滑', en: 'Differentiates across, smooths down' },
  sobely: { zh: '纵向求导、横向平滑', en: 'Differentiates down, smooths across' },
  kernel3: { zh: '任意 3×3 核（按“互相关”读权重）', en: 'Any 3×3 kernel (weights read as cross-correlation)' },
  learn3: { zh: '3×3 核，权重由训练决定', en: '3×3 kernel whose weights are set by training' },
  harris: { zh: 'Harris 角点响应：两个方向都在变的地方是正的大数，直边上是负的', en: 'Harris corner response: large and positive where the picture changes in both directions, negative along straight edges' },
  downsample: { zh: '每隔一个像素取一个，尺寸减半', en: 'Keeps every other pixel, halving the size' },
  zeroUp: { zh: '尺寸翻倍：每个像素放在 2×2 的左上角，其余三格补 0', en: 'Doubles the size: each pixel goes in the top left of a 2×2 block, the other three are 0' },
  maxpool: { zh: '每个 2×2 块取最大值，尺寸减半', en: 'Takes the maximum of each 2×2 block, halving the size' },
  gradmag: '√(Gx² + Gy²)',
  argmin4: { zh: '逐像素比较几张代价图，输出最小者的编号', en: 'Compares cost maps pixel by pixel and outputs the index of the smallest' },
  disparity: { zh: '左右图逐行匹配，输出视差，窗口可选', en: 'Matches the left and right images row by row and outputs disparity; window size selectable' },
}

// Resolved in the current language.
export const describe = (type) => L(DESCRIPTIONS[type] ?? NODE_TYPES[type]?.description ?? '')
/** The same, as a { zh, en } pair, for text resolved later (the parts box). */
export const descriptionOf = (type) => DESCRIPTIONS[type] ?? NODE_TYPES[type]?.description
