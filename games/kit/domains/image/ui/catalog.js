import { ArrowRightFromLine, ArrowRightToLine, AudioWaveform, Box, Calculator, Grid3x3, Minimize2, Network, Package, Search, Sparkles } from 'lucide-react'

// How each part looks on the board and in the parts list: a family (colour and icon); families group parts by what they
// look at, which is the idea the game is teaching. What a part does is ../words.js.
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
