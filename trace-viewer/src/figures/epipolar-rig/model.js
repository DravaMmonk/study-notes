// Pure model for the epipolar rig: two pinhole cameras that are not rectified (camera 2 sits ahead of
// camera 1 and turned against it). A point x in image 1 back-projects to a ray; every depth on that ray
// lands in image 2 on one line, the epipolar line l′ = F x, which passes through the epipole e′ where
// the baseline pierces screen 2. World units: x along the bench, z up; 40 units per metre.

export const PER_M = 40
export const FOCAL = 20 // pinhole to ground glass, world units
export const FOCAL_PX = 800
export const PX = FOCAL_PX / FOCAL // pixels per world unit on the glass
export const GLASS = { u: 12, v: 9 } // half extents of the ground glass, world units
export const HEIGHT = 30 // lens axis above the bench top
export const DEPTH = [2.4, 4.4] // metres along the ray (camera 1's z)
const RAD = Math.PI / 180

function camera(c, yaw) {
  const a = [Math.cos(yaw * RAD), Math.sin(yaw * RAD), 0]
  const r = [a[1], -a[0], 0] // a × up: the camera's right
  return { c, yaw, a, r, up: [0, 0, 1] }
}

export const CAM1 = camera([0, 0, HEIGHT], 180)
export const CAM2 = camera([-58, 20, HEIGHT], 189) // ahead of camera 1, turned 9° toward the ray

// Chosen points in image 1, pixels (u right, v up as the camera sees it).
export const POINTS = [
  { label: 'A', u: -20, v: 0 },
  { label: 'B', u: -60, v: 80 },
  { label: 'C', u: 20, v: -70 },
]

const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2]
const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]]
const add = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]]
const mul = (p, s) => [p[0] * s, p[1] * s, p[2] * s]
const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]]
const basis = (cam) => [cam.r, cam.up, cam.a]

export const toCamera = (cam, X) => basis(cam).map((axis) => dot(sub(X, cam.c), axis))
export function project(cam, X) {
  const [x, y, z] = toCamera(cam, X)
  return { u: (FOCAL_PX * x) / z, v: (FOCAL_PX * y) / z, ahead: z > 0 }
}

// Where an image point (pixels) sits on the ground glass behind the pinhole: inverted through it.
export const onGlass = (cam, u, v) => sub(sub(cam.c, mul(cam.a, FOCAL)), add(mul(cam.r, u / PX), mul(cam.up, v / PX)))

// The back-projected ray of an image-1 point, scaled so its camera-1 depth grows by one per unit,
// and the world point at a depth in metres.
export const rayOf = (point) => add(add(mul(CAM1.r, point.u / FOCAL_PX), mul(CAM1.up, point.v / FOCAL_PX)), CAM1.a)
export const pointAt = (point, depth) => add(CAM1.c, mul(rayOf(point), depth * PER_M))

// E = [t]× R with X2 = R X1 + t, and F = K′⁻ᵀ E K⁻¹ for K = diag(f, f, 1).
const B1 = basis(CAM1)
const B2 = basis(CAM2)
const R = B2.map((row) => B1.map((col) => dot(row, col)))
const T = toCamera(CAM2, CAM1.c)
const skew = (t) => [[0, -t[2], t[1]], [t[2], 0, -t[0]], [-t[1], t[0], 0]]
const matmul = (A, Bm) => A.map((row) => Bm[0].map((_, j) => row.reduce((sum, v, k) => sum + v * Bm[k][j], 0)))
export const ESSENTIAL = matmul(skew(T), R)
const Kinv = [[1 / FOCAL_PX, 0, 0], [0, 1 / FOCAL_PX, 0], [0, 0, 1]]
export const FUNDAMENTAL = matmul(matmul(Kinv, ESSENTIAL), Kinv) // K⁻ᵀ = K⁻¹ for this K

export const lineOf = (point) => FUNDAMENTAL.map((row) => row[0] * point.u + row[1] * point.v + row[2])
export const residual = (point, image) => {
  const l = lineOf(point)
  return l[0] * image.u + l[1] * image.v + l[2]
}
export const distance = (point, image) => {
  const l = lineOf(point)
  return Math.abs(l[0] * image.u + l[1] * image.v + l[2]) / Math.hypot(l[0], l[1])
}

// Epipoles: the other camera's centre in each image (pixels).
export const EPIPOLE2 = project(CAM2, CAM1.c)
export const EPIPOLE1 = project(CAM1, CAM2.c)
// Where the line through image 2 heads as depth grows: the image of the ray's point at infinity.
export function vanishing(point) {
  const d = rayOf(point)
  const [x, y, z] = basis(CAM2).map((axis) => dot(d, axis))
  return { u: (FOCAL_PX * x) / z, v: (FOCAL_PX * y) / z }
}

export function measure(point, depth) {
  const X = pointAt(point, depth)
  const image = project(CAM2, X)
  return { X, image, residual: residual(point, image), distance: distance(point, image), line: lineOf(point) }
}

export const vec = { dot, sub, add, mul, cross }
