// Neighbourhood filters shared by the circuit parts, target functions and scenes.
import { correlate, fromFn, shift, zip } from './image.js'

export const boxKernel = (size) => Array(size * size).fill(1 / (size * size))
const BOX_3 = boxKernel(3)
const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)

export const boxBlur3 = (img, border) => correlate(img, BOX_3, border)
export const horizontalDifference = (img) => zip(shift(img, -1, 0), img, (right, here) => right - here)
export const sobelX = (img, border) => correlate(img, SOBEL_X, border)
export const sobelY = (img, border) => correlate(img, SOBEL_Y, border)
export const sobelGradient = (img, border) => [sobelX(img, border), sobelY(img, border)]

export function squaredGradient(img, border) {
  const [gx, gy] = sobelGradient(img, border)
  return zip(gx, gy, (x, y) => x * x + y * y)
}

export function gradientMagnitude(img, border) {
  const [gx, gy] = sobelGradient(img, border)
  return zip(gx, gy, Math.hypot)
}

export function harrisResponse(a, k = 0.05) {
  const [gx, gy] = sobelGradient(a)
  const xx = boxBlur3(zip(gx, gx, (p, q) => p * q))
  const yy = boxBlur3(zip(gy, gy, (p, q) => p * q))
  const xy = boxBlur3(zip(gx, gy, (p, q) => p * q))
  return fromFn(a.w, a.h, (x, y) => {
    const i = y * a.w + x
    const det = xx.data[i] * yy.data[i] - xy.data[i] * xy.data[i]
    const trace = xx.data[i] + yy.data[i]
    return (det - k * trace * trace) * 100
  })
}

/** The peaks of a response map: cells above `t` that no 3×3 neighbour beats by more than 0.025. */
export const peaksOf = (img, t = 0.3) =>
  fromFn(img.w, img.h, (x, y) => {
    const v = img.data[y * img.w + x]
    if (v <= t) return 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const u = x + dx
        const w = y + dy
        // A neighbour within 0.025 counts as equal, so a flat top keeps all of its cells.
        if (u >= 0 && w >= 0 && u < img.w && w < img.h && img.data[w * img.w + u] > v + 0.025) return 0
      }
    }
    return 1
  })
