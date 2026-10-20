// Parts for frequency (视觉完备 chapter 2): a wave of 32 points, the spectrum, a low-pass in the frequency domain and
// multiplying a picture's frequencies by a gain picture.
import { fromFn } from '../image.js'
import { applyGain, lowpass, magnitudeSpectrum } from '../fourier.js'

const N = 32
const TAU = 2 * Math.PI

export const FREQUENCY = {
  fqWave: {
    label: { zh: '波', en: 'Wave' },
    description: { zh: '一道 32 个点的波：cos 或 sin(2π·k·x/32)，在 −1 和 1 之间摆动', en: 'A wave of 32 points: cos or sin(2π·k·x/32), swinging between −1 and 1' },
    inputs: [],
    params: [
      { key: 'k', label: { zh: '频率 k', en: 'Frequency k' }, kind: 'number', min: 0, max: 16, step: 1, default: 1 },
      { key: 'form', label: { zh: '形状', en: 'Shape' }, kind: 'select', options: [['cos', 'cos'], ['sin', 'sin']], default: 'cos' },
    ],
    eval: (_, p) => {
      const k = Number(p.k ?? 1)
      const f = p.form === 'sin' ? Math.sin : Math.cos
      return fromFn(N, 1, (x) => f((TAU * k * x) / N))
    },
    cost: 2,
    unlock: 'wave',
  },
  fqSpectrum: {
    label: { zh: '频谱', en: 'Spectrum' },
    description: { zh: '中心化、取对数的幅度谱：中心是平均亮度，越往外变化越快', en: 'The centred, log-scaled magnitude spectrum: the centre is the average brightness, and further out means faster change' },
    inputs: ['in'],
    eval: ({ in: a }) => magnitudeSpectrum(a),
    // A forward 2-D FFT costs about 2·log2(N²) complex multiply-adds per pixel; 20 at 32×32.
    cost: 20,
    unlock: 'spectrum',
  },
  fqLowpass: {
    label: { zh: '频域低通', en: 'Frequency low-pass' },
    description: { zh: '变换到频域，乘一个以中心为圆心的掩膜，再变换回来', en: 'Transforms to the frequency domain, multiplies by a mask centred on the middle, and transforms back' },
    inputs: ['in'],
    params: [
      { key: 'shape', label: { zh: '掩膜', en: 'Mask' }, kind: 'select', options: [['disk', { zh: '硬圆盘', en: 'Hard disk' }], ['gauss', { zh: '高斯', en: 'Gaussian' }]], default: 'disk' },
      { key: 'R', label: { zh: '半径 R', en: 'Radius R' }, kind: 'number', min: 0.5, max: 16, step: 0.5, default: 8 },
    ],
    eval: ({ in: a }, p) => lowpass(a, p.shape ?? 'disk', Number(p.R ?? 8)),
    // Forward and inverse FFT plus the mask multiply.
    cost: 40,
    unlock: 'freq-filter',
  },
  fqApply: {
    label: { zh: '频域相乘', en: 'Multiply in frequency' },
    description: { zh: '把图变到频域，每个频率乘上增益图里对应格子的数，再变回来。增益图和频谱画法一样：中心是频率 (0, 0)', en: 'Takes the picture into the frequency domain, multiplies each frequency by the number in the matching cell of the gain picture, and comes back. The gain picture is laid out like a spectrum: its centre is frequency (0, 0)' },
    inputs: ['in', 'gain'],
    eval: ({ in: a, gain }) => applyGain(a, gain),
    // A forward and an inverse FFT plus the multiply.
    cost: 40,
  },
}

