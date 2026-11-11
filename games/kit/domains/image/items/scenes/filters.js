// Scenes of filters (scenes/index.js): a noisy step whose true edge is wanted, and the document scanner's scans.
import { S } from '../../../../engine/schema.js'
import { addNoise, correlate, fromFn, gaussianKernel, map, patterns, shift, zip } from '../../engine/image.js'
import { T as t } from '../../../../shell/i18n.js'

const BOX3 = Array(9).fill(1 / 9)
const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)
const diffx = (img) => zip(shift(img, -1, 0), img, (a, b) => a - b)

// A 24×24 scan: a sheet of paper on a dark desk, a few lines of text on it, sometimes sensor noise.
const S24 = 24
const DESK = 0.2
const PAPER = 0.85
const INK = 0.3
const sheet = ({ x0, y0, x1, y1, lines = [], noise = 0, seed = 1 }) => {
  const clean = fromFn(S24, S24, (x, y) => {
    if (!(x >= x0 && x <= x1 && y >= y0 && y <= y1)) return DESK
    return lines.some(([lx, ly, len]) => y === ly && x >= lx && x < lx + len) ? INK : PAPER
  })
  return { clean, scan: noise ? addNoise(clean, seed, noise) : clean }
}
const sobel2 = (img, border) => zip(correlate(img, SOBEL_X, border), correlate(img, SOBEL_Y, border), (gx, gy) => gx * gx + gy * gy)
// What the scanner is asked for: the scan without its grain, the edges Sobel sees, or the paper's own edges.
const SCAN_EXPECTS = {
  clean: ({ clean }) => correlate(clean, gaussianKernel(1), 'edge'),
  edges: ({ scan }) => map(sobel2(scan, 'edge'), (v) => (v > 0.04 ? 1 : 0)),
  paper: ({ scan }) => map(sobel2(correlate(scan, gaussianKernel(1.5), 'edge'), 'edge'), (v) => (v > 0.01 ? 1 : 0)),
}

export const FILTERS = {
  noisyStep: {
    about: t('带噪声的台阶（左暗右亮）：期望是真正的台阶处为 1'),
    test: S.obj({ edge: S.int(), seed: S.int() }),
    make: ({ edge, seed }) => {
      const step = patterns.stepX(edge, 0.15, 0.85)
      return { inputs: { in: addNoise(step, seed, 0.22) }, expected: { out: map(diffx(correlate(step, BOX3)), (v) => (v > 0.15 ? 1 : 0)) } }
    },
  },
  scan: {
    about: t('扫描仪：深色桌面上的一张纸，纸上几行字，可能有噪声，纸可能超出扫描范围'),
    setup: S.obj({ expect: S.oneOf(Object.keys(SCAN_EXPECTS), { about: t('期望：去掉颗粒的扫描件（clean）、Sobel 平方和大于 0.04 处（edges）、纸的边（paper）') }) }),
    test: S.obj({
      x0: S.int(), y0: S.int(), x1: S.int(), y1: S.int(),
      lines: S.opt(S.list(S.list(S.int(), { min: 3 }), { about: t('一行字：x, y, 长度') })),
      noise: S.opt(S.num()), seed: S.opt(S.int()),
    }),
    make: (test, { expect }) => {
      const made = sheet(test)
      return { inputs: { in: made.scan }, expected: { out: SCAN_EXPECTS[expect](made) } }
    },
  },
}
