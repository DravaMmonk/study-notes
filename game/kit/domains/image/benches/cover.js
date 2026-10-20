// The book-cover bench (BookCover.jsx): the player pairs points on a cover with the same points in a photo of it on a
// desk; the pairs fix a homography (an affine map with three) and the cover is pasted back, judged by its mean error
// over a grid on the cover.
import { random } from '../engine/image.js'
import { affineFit, homographyDLT, invert3, project } from '../engine/match.js'

const rectCorners = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

/**
 * The bench's model. cover / photo: { w, h }; title, logo: [x0, y0, x1, y1] boxes on the cover; quad: where the
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
