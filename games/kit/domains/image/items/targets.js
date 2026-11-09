// What a circuit is asked to make of one picture (vocabulary.js target), for the scene of a picture in and the
// picture a rule makes of it out (scenes/index.js filter). Each item is make(params) → (picture) → the expected one.
import { S, callOf } from '../../../engine/schema.js'
import { correlate, downsample, flipKernel, fromFn, gaussianKernel, image, map, shift, zip } from '../engine/image.js'
import { applyGain, highpass, lowpass, magnitudeSpectrum } from '../engine/fourier.js'
import { attentionWeights } from '../engine/attention.js'
import { harrisResponse } from '../engine/nodes.js'
import { zeroUp } from '../engine/parts/segment.js'
import { peaksOf } from './scenes/matching.js'
import { T as t } from '../../../shell/i18n.js'

const SHAPE = S.oneOf(['disk', 'gauss'])
const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)
const vec = (...v) => ({ w: 3, h: 1, data: Float32Array.from(v) })
const cross = (a, b) => vec(a.data[1] * b.data[2] - a.data[2] * b.data[1], a.data[2] * b.data[0] - a.data[0] * b.data[2], a.data[0] * b.data[1] - a.data[1] * b.data[0])
// Every cell's distance from the centre of a spectrum the size of `img` (frequency (0, 0)).
const radiusOf = (img) => fromFn(img.w, img.h, (x, y) => Math.hypot(x - img.w / 2, y - img.h / 2))
const BORDER = S.opt(S.oneOf(['zero', 'edge', 'wrap']))
const KERNEL = S.list(S.num(), { min: 1, view: 'grid', about: t('(2r+1)² 个权重，按行写出', '(2r+1)² weights, row by row') })

export const TARGETS = {
  same: {
    about: t('原样：输出就是输入', 'unchanged: the output is the input'),
    make: () => (img) => img,
  },
  shift: {
    about: t('整张图挪 (dx, dy) 格，图外补 0（或照 border 补）', 'the whole picture moved by (dx, dy), padded with 0 (or as border says)'),
    params: S.obj({ dx: S.int(), dy: S.int(), border: BORDER }),
    make: ({ dx, dy, border }) => (img) => shift(img, dx, dy, border),
  },
  negative: {
    about: t('底片：每格变成 1 − 自己', 'the negative: every cell becomes 1 − itself'),
    make: () => (img) => map(img, (v) => 1 - v),
  },
  correlate: {
    about: t('邻居的加权和（互相关）：核按行写出，中心对着这一格', 'a weighted sum of the neighbours (cross-correlation): the kernel row by row, its centre on the cell'),
    params: S.obj({ kernel: KERNEL, border: BORDER }),
    make: ({ kernel, border }) => (img) => correlate(img, kernel, border),
  },
  convolve: {
    about: t('用核盖印章（卷积）：每个像素按核的样子盖一个，挪到位、乘上权重再相加', 'stamping with a kernel (convolution): every pixel presses the kernel’s shape, moved into place, weighted and added up'),
    params: S.obj({ kernel: KERNEL }),
    make: ({ kernel }) => (img) => correlate(img, flipKernel(kernel)),
  },
  box: {
    about: t('size×size 的平均', 'the average over size × size'),
    params: S.obj({ size: S.int({ min: 1 }), border: BORDER }),
    make: ({ size, border }) => (img) => correlate(img, Array(size * size).fill(1 / (size * size)), border),
  },
  gauss: {
    about: t('高斯模糊：σ，核的半径', 'a Gaussian blur: σ, and the kernel’s radius'),
    params: S.obj({ sigma: S.num(), radius: S.opt(S.int({ min: 1 })), border: BORDER }),
    make: ({ sigma, radius, border }) => (img) => correlate(img, gaussianKernel(sigma, radius), border),
  },
  sharpen: {
    about: t('锐化：原图 + amount ×（原图 − σ 的高斯模糊）', 'sharpening: the picture + amount × (the picture − its Gaussian blur of σ)'),
    params: S.obj({ sigma: S.num(), amount: S.num() }),
    make: ({ sigma, amount }) => (img) => zip(img, correlate(img, gaussianKernel(sigma)), (a, b) => a + amount * (a - b)),
  },
  diffx: {
    about: t('横向差分：右边邻居 − 自己', 'the difference across: right neighbour − itself'),
    make: () => (img) => zip(shift(img, -1, 0), img, (a, b) => a - b),
  },
  absdiff: {
    about: t('两种边都要：|右边邻居 − 自己|', 'both kinds of edge: |right neighbour − itself|'),
    make: () => (img) => map(zip(shift(img, -1, 0), img, (a, b) => a - b), Math.abs),
  },
  max: {
    about: t('两张图逐格取较大', 'the larger of two pictures, cell by cell'),
    make: () => (a, b) => zip(a, b, Math.max),
  },
  stride: {
    about: t('步幅 2 的卷积层：按核做互相关，再隔点取样', 'a convolution layer of stride 2: cross-correlate with the kernel, then keep every other pixel'),
    params: S.obj({ kernel: KERNEL }),
    make: ({ kernel }) => (img) => downsample(correlate(img, kernel), 2),
  },
  meanBlend: {
    about: t('向 3×3 平均靠：a + amount ×（平均 − a）；amount 为负是锐化', 'a pull towards the 3×3 mean: a + amount × (mean − a); a negative amount sharpens'),
    params: S.obj({ amount: S.num() }),
    make: ({ amount }) => (img) => zip(img, correlate(img, Array(9).fill(1 / 9)), (a, b) => a + amount * (b - a)),
  },
  ask: {
    about: t('图块 a 向 a、b 两块提问：两块按 softmax(4 × 平均(a × 这一块)) 加权平均', 'patch a asks patches a and b: the two averaged with the weights softmax(4 × average(a × each))'),
    make: () => (a, b) => {
      const [wa, wb] = attentionWeights(a.data, [a.data, b.data], 1)
      return zip(a, b, (x, y) => wa * x + wb * y)
    },
  },
  projectedAsk: {
    about: t('用共享的标量投影生成 Q、K、V，再计算两个图块的注意力', 'produce Q, K and V with shared scalar projections, then compute two-patch attention'),
    make: () => (a, b) => {
      const q = a.data.map(x => x * 1.8)
      const keys = [a, b].map(img => img.data.map(x => x * 1.2))
      const [wa, wb] = attentionWeights(q, keys)
      return zip(a, b, (x, y) => 0.9 * (wa * x + wb * y))
    },
  },
  gradientEnergy: {
    about: t('3×3 邻域内两个方向的梯度平方平均之和', 'sum of the mean squared gradients in both directions over a 3×3 neighbourhood'),
    make: () => (img) => {
      const gx = correlate(img, SOBEL_X), gy = correlate(img, SOBEL_Y)
      const energy = zip(gx, gy, (x, y) => x * x + y * y)
      return correlate(energy, Array(9).fill(1 / 9))
    },
  },
  cornerResponse: {
    about: t('Harris 角点响应图', 'Harris corner response map'),
    make: () => (img) => harrisResponse(img),
  },
  corners: {
    about: t('角点：Harris 响应大于 threshold 的地方', 'corners: where the Harris response is over threshold'),
    params: S.obj({ threshold: S.num() }),
    make: ({ threshold }) => (img) => map(harrisResponse(img), (v) => (v > threshold ? 1 : 0)),
  },
  cornerPeaks: {
    about: t('一个角一个点：Harris 响应乘 gain 后的峰（比 3×3 邻居都不小、又大于 above）', 'one point a corner: the peaks of the Harris response times gain (no smaller than the 3×3 neighbours, and above `above`)'),
    params: S.obj({ gain: S.num(), above: S.num() }),
    make: ({ gain, above }) => (img) => peaksOf(map(harrisResponse(img), (v) => v * gain), above),
  },
  upsample: {
    about: t('放大一倍：补零放大，再按核做互相关（转置卷积）', 'twice the size: zero-upsampled, then cross-correlated with the kernel (a transposed convolution)'),
    params: S.obj({ kernel: KERNEL }),
    make: ({ kernel }) => (img) => correlate(zeroUp(img), kernel),
  },
  cross: {
    about: t('两个三维向量的叉积 a × b', 'the cross product a × b of two 3-vectors'),
    make: () => cross,
  },
  meet: {
    about: t('两条线的交点：过 p、q 的线和过 r、s 的线（齐次坐标）', 'where two lines meet: the line through p and q and the line through r and s (homogeneous coordinates)'),
    make: () => (p, q, r, s) => cross(cross(p, q), cross(r, s)),
  },
  gradmag: {
    about: t('梯度幅值：√(Sobel x² + Sobel y²)', 'the gradient magnitude: √(Sobel x² + Sobel y²)'),
    params: S.obj({ border: BORDER }),
    make: ({ border = 'zero' }) => (img) => zip(correlate(img, SOBEL_X, border), correlate(img, SOBEL_Y, border), Math.hypot),
  },
  lowpass: {
    about: t('频域低通：半径 R 以内的频率留下（disk 一刀切，gauss 平滑落下）', 'a low-pass in frequency: what is within radius R stays (disk cuts sharply, gauss falls smoothly)'),
    params: S.obj({ shape: SHAPE, R: S.num() }),
    make: ({ shape, R }) => (img) => lowpass(img, shape, R),
  },
  sharpness: {
    about: t('清晰度：频谱里离中心超过 beyond 的部分的平均', 'sharpness: the mean of the spectrum beyond radius `beyond` from its centre'),
    params: S.obj({ beyond: S.num() }),
    make: ({ beyond }) => (img) => {
      const s = magnitudeSpectrum(img)
      const r = radiusOf(img)
      return image(1, 1, s.data.reduce((sum, v, i) => sum + (r.data[i] > beyond ? v : 0), 0) / s.data.length)
    },
  },
  descreen: {
    about: t('去网纹：频谱里半径 radius 以外、比 threshold 亮的格子去掉，其余照旧', 'descreening: the spectrum’s cells beyond `radius` brighter than `threshold` removed, the rest kept'),
    params: S.obj({ threshold: S.num(), radius: S.num() }),
    make: ({ threshold, radius }) => (img) => {
      const s = magnitudeSpectrum(img)
      const r = radiusOf(img)
      return applyGain(img, fromFn(img.w, img.h, (x, y) => (s.data[y * img.w + x] > threshold && r.data[y * img.w + x] > radius ? 0 : 1)))
    },
  },
  hybrid: {
    about: t('混合图像：A 的低频 + B 的高频（半径 R 的高斯）', 'a hybrid image: the low frequencies of A + the high frequencies of B (a Gaussian of radius R)'),
    params: S.obj({ R: S.num() }),
    make: ({ R }) => (a, b) => zip(lowpass(a, 'gauss', R), highpass(b, 'gauss', R), (p, q) => p + q),
  },
  shrink: {
    about: t('缩小：σ 的高斯模糊一次（复制边缘），再隔点取样 halvings 次', 'shrinking: one Gaussian blur of σ (the edge replicated), then every other pixel kept, halvings times'),
    params: S.obj({ sigma: S.num(), halvings: S.int({ min: 1 }) }),
    make: ({ sigma, halvings }) => (img) => {
      let out = correlate(img, gaussianKernel(sigma), 'edge')
      for (let i = 0; i < halvings; i++) out = downsample(out, 2)
      return out
    },
  },
  pyramid: {
    about: t('图像金字塔：模糊一点（σ = 1，复制边缘）再减半，做 levels 次', 'an image pyramid: blur a little (σ = 1, the edge replicated) and halve, levels times'),
    params: S.obj({ levels: S.int({ min: 1 }) }),
    make: ({ levels }) => (img) => {
      let out = img
      for (let i = 0; i < levels; i++) out = downsample(correlate(out, gaussianKernel(1), 'edge'), 2)
      return out
    },
  },
}

/** A target as the function from a test's picture to the picture expected. */
export function targetOf(call) {
  const [name, params] = callOf(call)
  return TARGETS[name].make(params)
}
