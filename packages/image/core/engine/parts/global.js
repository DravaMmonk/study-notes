// Parts that see the whole picture (视觉完备 chapter 5): attention over patches, a position code, and the fixed
// encoder a contrastive bench trains (a picture as 64 features of length 1).
import { correlate, downsample, gaussianKernel, map } from '../image.js'
import { attention } from '../attention.js'

export const features = (img) => {
  const small = downsample(downsample(correlate(img, gaussianKernel(1.2), 'edge'), 2), 2)
  const mean = small.data.reduce((s, v) => s + v, 0) / small.data.length
  const centred = map(small, (v) => v - mean)
  const norm = Math.sqrt(centred.data.reduce((s, v) => s + v * v, 0)) || 1
  return map(centred, (v) => v / norm)
}

export const GLOBAL = {
  attention: {
    label: { zh: '注意力', en: 'Attention' },
    description: {
      zh: '切成 P×P 图块；每块按 softmax(q·k/√d) 对所有块的 v 加权平均。只接 Q 时，K、V 也用它',
      en: "Cuts the image into P×P patches; each patch takes the average of every patch's v, weighted by softmax(q·k/√d). With only Q wired, K and V use it too",
    },
    inputs: ['Q', 'K', 'V'],
    optional: ['K', 'V'],
    params: [
      { key: 's', label: { zh: 'q 放大', en: 'q scale' }, kind: 'number', min: 0, max: 100, step: 1, default: 1 },
      { key: 'P', label: { zh: '图块边长', en: 'Patch size' }, kind: 'select', options: [[2, '2'], [4, '4'], [8, '8']], default: 4 },
    ],
    eval: ({ Q, K, V }, p) => attention(Q, K ?? Q, V ?? K ?? Q, p.s ?? 1, p.P ?? 4),
    // Every pixel is a weighted sum over all the patches: on a 16×16 picture, 256 / P² of them, twice over.
    cost: (p) => 512 / (p.P ?? 4) ** 2,
    unlock: 'attention',
  },
  embed: {
    label: { zh: '对比编码器', en: 'Contrastive encoder' },
    description: {
      zh: '把图变成 4×4 = 16 个特征，长度为 1：整体变亮、对比度变、挪一两格、加点噪声，它都变得不多',
      en: 'Turns a picture into 4×4 = 16 features of length 1: brightening, a contrast change, a shift of a pixel or two or a little noise hardly move it',
    },
    inputs: ['in'],
    eval: ({ in: a }) => features(a),
    cost: 12,
    unlock: 'embed',
  },
}

