import { fromRows, pixel } from './image.js'
import { filterWindow } from './filter-window.js'

const scale = (value, weight) => Array.isArray(value) ? value.map((v) => v * weight) : value * weight
const plus = (a, b) => Array.isArray(a) ? a.map((v, k) => v + (Array.isArray(b) ? b[k] : b)) : Array.isArray(b) ? b.map((v) => a + v) : a + b
const total = (terms) => terms.reduce((sum, t) => plus(sum, scale(t.value, t.weight)), 0)

/** The aid computes from declared observations, never from the task's expected answer. */
export function calculationAt(task, x, y) {
  if (task.window) {
    const margin = task.window.padding === 'valid' ? 1 : 0
    const centre = { x: x + (task.window.axis === 'row' ? margin : 0), y: y + (task.window.axis === 'column' ? margin : 0) }
    const terms = filterWindow(task.image, task.window, centre.x, centre.y)
    return { kind: 'window', centre, terms, value: total(terms) }
  }
  const aid = task.calculation
  if (!aid) return null
  if (aid.kind === 'product') {
    const a = task.image[0][x], b = aid.column[y]
    return { kind: aid.kind, a, b, value: a * b }
  }
  if (aid.kind === 'magnitude') {
    const gx = task.image[0][x], gy = task.image[1][x]
    return { kind: aid.kind, gx, gy, value: Math.hypot(gx, gy) }
  }
  const image = fromRows(task.image)
  const sx = aid.xs[y][x], sy = aid.ys[y][x]
  const read = (px, py, weight) => {
    const cx = Math.max(0, Math.min(image.w - 1, px)), cy = Math.max(0, Math.min(image.h - 1, py))
    return { x: px, y: py, cx, cy, outside: cx !== px || cy !== py, value: pixel(image, cx, cy), weight }
  }
  if (aid.method === 'nearest') {
    const nearest = [sx, sy].map((v) => Math.floor(v + 0.5))
    const terms = [read(...nearest, 1)]
    const distances = [sx, sy].map((v) => {
      const lo = Math.floor(v), hi = lo + 1
      return { lo, hi, left: v - lo, right: hi - v }
    })
    return { kind: 'nearest', sx, sy, nearest, distances, terms, value: terms[0].value }
  }
  const left = Math.floor(sx), top = Math.floor(sy), tx = sx - left, ty = sy - top
  const terms = [read(left, top, (1 - tx) * (1 - ty)), read(left + 1, top, tx * (1 - ty)), read(left, top + 1, (1 - tx) * ty), read(left + 1, top + 1, tx * ty)]
  return { kind: 'bilinear', sx, sy, tx, ty, terms, value: total(terms) }
}

/** A complete independent result lets validation reject misleading calculation aids. */
export function calculationResult(task) {
  const aid = task.calculation
  let width, height
  if (task.window) {
    const margin = task.window.padding === 'valid' ? 2 : 0
    width = task.image[0].length - (task.window.axis === 'row' ? margin : 0)
    height = task.image.length - (task.window.axis === 'column' ? margin : 0)
  } else if (aid?.kind === 'sampling') {
    const xs = fromRows(aid.xs), ys = fromRows(aid.ys)
    if (!xs || !ys || xs.w !== ys.w || xs.h !== ys.h) throw new Error('sampling positions must have matching rectangular shapes')
    width = xs.w; height = xs.h
  } else if (aid?.kind === 'product') {
    if (task.image.length !== 1 || Array.isArray(task.image[0][0])) throw new Error('kernel product needs one scalar row')
    width = task.image[0].length; height = aid.column.length
  } else if (aid?.kind === 'magnitude') {
    if (task.image.length !== 2 || Array.isArray(task.image[0][0])) throw new Error('magnitude needs two scalar rows')
    width = task.image[0].length; height = 1
  } else return null
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => calculationAt(task, x, y).value))
}
