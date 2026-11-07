// The book-cover bench: the player pairs points on a cover with the same points in a photo of it on a desk; the pairs
// fix a homography (an affine map with three) and the cover is pasted back, judged by its mean error over a grid on
// the cover.
import { S } from '../../../engine/schema.js'
import { limitOf } from '../../../engine/bench.js'
import { random } from '../engine/image.js'
import { affineFit, homographyDLT, invert3, project } from '../engine/match.js'
import { T as t } from '../../../shell/i18n.js'

const rectCorners = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

/**
 * The pairing. cover / photo: { w, h }; title, logo: [x0, y0, x1, y1] boxes on the cover; quad: where the
 * cover's corners land in the photo; clutter: { note, paper } polygons on the desk, whose corners (the note's four,
 * the paper's first and last) are decoys; seed: the photo points' jitter; tol: the mean error that passes.
 */
export function coverBench({ cover, photo, title, logo, quad, clutter, seed, tol }) {
  const trueH = homographyDLT(rectCorners([0, 0, cover.w, cover.h]).map((from, i) => ({ from, to: quad[i] })))
  const coverPoints = [...rectCorners([0, 0, cover.w, cover.h]), ...rectCorners(title), ...rectCorners(logo)]
  const photoPoints = (() => {
    const next = random(seed)
    const onCover = coverPoints.map(([x, y]) => {
      const [u, v] = project(trueH, x, y)
      return { at: [u + (next() - 0.5) * 0.4, v + (next() - 0.5) * 0.4], truth: true }
    })
    const decoys = [...clutter.note, clutter.paper[0], clutter.paper[3]].map((at) => ({ at, truth: false }))
    const all = [...onCover, ...decoys]
    // Shuffled, so the list order gives nothing away.
    return all.map((p, i) => ({ ...p, cover: p.truth ? i : -1, key: (i * 7) % all.length })).sort((a, b) => a.key - b.key)
  })()
  const grid = []
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 8; j++) grid.push([(i / 6) * cover.w, (j / 8) * cover.h])

  // Mean distance (photo px) between where a model and the true pose put the cover's grid points.
  function overlayError(M) {
    if (!M) return Infinity
    let sum = 0
    for (const [x, y] of grid) {
      const [u, v] = project(M, x, y)
      const [tu, tv] = project(trueH, x, y)
      const d = Math.hypot(u - tu, v - tv)
      if (!Number.isFinite(d)) return Infinity
      sum += d
    }
    return sum / grid.length
  }

  // pairs: [{ cover: index into coverPoints, photo: index into photoPoints }]
  function fit(pairs) {
    const data = pairs.map((p) => ({ from: coverPoints[p.cover], to: photoPoints[p.photo].at }))
    if (data.length < 3) return { model: null, kind: '', error: Infinity }
    if (data.length === 3) {
      const A = affineFit(data)
      return { model: A, kind: 'affine', error: overlayError(A) }
    }
    const H = homographyDLT(data)
    return { model: H, kind: 'homography', error: overlayError(H) }
  }

  const photoIndexOf = (coverIndex) => photoPoints.findIndex((p) => p.cover === coverIndex)

  // Cover artwork in cover units → [r, g, b]. Fixed colours: it is a photograph, not UI.
  function coverColour(x, y) {
    const [tx0, ty0, tx1, ty1] = title
    const [lx0, ly0, lx1, ly1] = logo
    if (x >= tx0 && x < tx1 && y >= ty0 && y < ty1) {
      const line = (y > 14 && y < 17 && x > 12 && x < 48) || (y > 21 && y < 24 && x > 12 && x < 40)
      return line ? [44, 52, 70] : [236, 226, 198]
    }
    if (x >= lx0 && x < lx1 && y >= ly0 && y < ly1) return (x - lx0 + y - ly0) % 8 < 4 ? [214, 146, 44] : [232, 176, 80]
    if (y > 72 && y < 77 && x > 12 && x < 48) return [196, 200, 214]
    return [36, 66, 104]
  }

  function deskColour(u, v) {
    const grain = 0.5 + 0.5 * Math.sin(v * 0.35 + Math.sin(u * 0.05) * 3)
    let c = [178 + grain * 16, 160 + grain * 14, 132 + grain * 10]
    const inPoly = (poly) => {
      let hit = false
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i]
        const [xj, yj] = poly[j]
        if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) hit = !hit
      }
      return hit
    }
    if (inPoly(clutter.paper)) c = [238, 236, 228]
    if (inPoly(clutter.note)) c = [236, 206, 96]
    return c
  }

  // Render the photo (desk + cover under the true pose) and, for a model, the cover warped by it.
  function renderPhoto(target, M = trueH, { desk = true } = {}) {
    const inverse = M && invert3(M)
    for (let v = 0; v < photo.h; v++) {
      for (let u = 0; u < photo.w; u++) {
        const i = (v * photo.w + u) * 4
        let colour = desk ? deskColour(u + 0.5, v + 0.5) : null
        if (inverse) {
          const [x, y] = project(inverse, u + 0.5, v + 0.5)
          if (x >= 0 && y >= 0 && x < cover.w && y < cover.h) colour = coverColour(x, y)
        }
        if (colour) {
          target[i] = colour[0]
          target[i + 1] = colour[1]
          target[i + 2] = colour[2]
          target[i + 3] = 255
        } else {
          target[i + 3] = 0
        }
      }
    }
  }

  function renderCover(target) {
    for (let y = 0; y < cover.h; y++) {
      for (let x = 0; x < cover.w; x++) {
        const i = (y * cover.w + x) * 4
        const c = coverColour(x + 0.5, y + 0.5)
        target.set([c[0], c[1], c[2], 255], i)
      }
    }
  }

  return { COVER: cover, PHOTO: photo, coverPoints, photoPoints, fit, tol, renderPhoto, renderCover, project, trueQuad: quad, trueH, overlayError, photoIndexOf }
}

const num = S.num()
const pt = S.list(num, { min: 2 })
const QUAD = S.list(pt, { min: 4 })

/** The bench model: knob `pairs` (picked on the pictures) and `overlay`; quantities pairs (how many) and error. */
export const cover = {
  about: t('四个角：在封面和照片上连出对应点（旋钮 pairs），解出单应，把封面贴回照片；算出点对数 pairs 和误差 error', 'four corners: pair points on the cover and in the photo (knob pairs), solve the homography, paste the cover back; computes how many pairs and the error'),
  setup: S.obj({
    cover: S.obj({ w: num, h: num }), photo: S.obj({ w: num, h: num }),
    title: S.list(num, { min: 4 }), logo: S.list(num, { min: 4 }), quad: QUAD,
    clutter: S.obj({ note: QUAD, paper: QUAD }), seed: S.int(),
  }),
  make(setup, bench) {
    const m = coverBench({ ...setup, tol: limitOf(bench.goal, 'error').below })
    return {
      ...m,
      view(v) {
        const fit = m.fit(v.pairs)
        const n = v.pairs.length
        return {
          pairs: n,
          error: fit.error,
          fit,
          transform: n === 3
            ? fit.model ? t('3 对点 → 仿射变换（6 个自由度）。', '3 pairs → affine transform (6 degrees of freedom).') : t('这 3 对点共线，无法确定变换。', 'These 3 pairs are collinear, so the transform is undetermined.')
            : n === 4
              ? fit.model ? t('4 对点 → 单应变换，用 DLT 求解（8 个自由度）。', '4 pairs → homography, solved with DLT (8 degrees of freedom).') : t('这 4 对点过于集中或共线，无法确定 H。', 'These 4 pairs are too clustered or collinear to determine H.')
              : t('至少需要 3 对点才能贴上封面。', 'At least 3 pairs are needed to paste the cover on.'),
        }
      },
    }
  },
  verify(model) {
    const { trueH, coverPoints, photoPoints, fit, overlayError, photoIndexOf, tol } = model
    if (!trueH) return 'no true pose'
    // The DLT must recover a known homography exactly from 4 noise-free pairs.
    const exact = homographyDLT(coverPoints.slice(0, 4).map((from) => ({ from, to: project(trueH, ...from) })))
    if (!(overlayError(exact) < 1e-6)) return 'DLT does not recover the true H'
    const goal = fit([0, 1, 2, 3].map((c) => ({ cover: c, photo: photoIndexOf(c) })))
    if (!(goal.error < tol)) return `4 corner pairs give error ${goal.error.toFixed(2)}`
    const other = fit([4, 5, 10, 11].map((c) => ({ cover: c, photo: photoIndexOf(c) })))
    if (!(other.error < tol)) return `title + logo pairs give error ${other.error.toFixed(2)}`
    // No three correct pairs, and not even the best affine fit to all twelve, can reach the goal.
    let bestAffine = Infinity
    for (let i = 0; i < 12; i++) {
      for (let j = i + 1; j < 12; j++) {
        for (let k = j + 1; k < 12; k++) {
          const three = fit([i, j, k].map((c) => ({ cover: c, photo: photoIndexOf(c) })))
          if (three.model) bestAffine = Math.min(bestAffine, three.error)
        }
      }
    }
    if (bestAffine < 3 * tol) return `three pairs reach error ${bestAffine.toFixed(2)}`
    const lsq = affineFit(coverPoints.map((from, c) => ({ from, to: photoPoints[photoIndexOf(c)].at })))
    if (overlayError(lsq) < 3 * tol) return 'least-squares affine fits'
    // One wrong pair (title corner matched to the cover corner) must fail.
    const wrong = fit([0, 1, 2, 7].map((c, i) => ({ cover: i === 3 ? 3 : c, photo: photoIndexOf(c) })))
    if (wrong.error < tol) return 'a wrong pair passes'
    return ''
  },
}
