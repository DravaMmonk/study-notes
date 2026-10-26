// Parts for labelling every pixel (视觉完备 chapter 9): a transposed convolution, zero insertion and a kernel.
import { correlate, fromFn } from '../image.js'

export const zeroUp = (a) => fromFn(a.w * 2, a.h * 2, (x, y) => (x % 2 || y % 2 ? 0 : a.data[(y / 2) * a.w + x / 2]))
export const NEAREST = [1, 1, 0, 1, 1, 0, 0, 0, 0]

export const SEGMENT = {
  tconv: {
    label: { zh: '转置卷积（步幅 2）', en: 'Transposed convolution (stride 2)' },
    description: { zh: '补零放大一倍，再用 3×3 的核走一遍', en: 'Zero-upsamples to twice the size, then runs a 3×3 kernel over it' },
    inputs: ['in'],
    params: [{ key: 'w', label: { zh: '权重', en: 'Weights' }, kind: 'kernel', default: NEAREST }],
    eval: ({ in: a }, p) => correlate(zeroUp(a), p.w ?? NEAREST),
    cost: 9,
    unlock: 'tconv',
  },
}

