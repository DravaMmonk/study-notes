// Scenes of the third dimension (scenes/index.js): stereo pairs of textured layers, disparity maps to turn into
// distance, epipolar geometry of one camera pair, and a robot vacuum's view of a room with obstacles.
import { S } from '../../../../engine/schema.js'
import { addNoise, fromFn, image, map, random, zip } from '../../engine/image.js'
import { T as t } from '../../../../shell/i18n.js'

const num = S.num()

// Layers painted back to front, each with its own random texture and disparity d: the right camera sees a surface d
// pixels further left, left(x) = right(x − d). The background is a far wall at disparity `far`.
function stereo(seed, layers, { far = 0, noise = 0, gain = 1, offset = 0 } = {}) {
  const next = random(seed)
  const texture = () => Array.from({ length: 256 }, () => 0.1 + 0.8 * next())
  // Textures are drawn front layers first, the wall last.
  const front = layers.map(([region, d]) => [region, d, texture()])
  const all = [[() => true, far, texture()], ...front]
  const top = (x, y) => [...all].reverse().find(([region]) => region(x, y))
  const truth = fromFn(16, 16, (x, y) => top(x, y)[1])
  const left = fromFn(16, 16, (x, y) => top(x, y)[2][y * 16 + x])
  const right = fromFn(16, 16, (x, y) => {
    const hit = [...all].reverse().find(([region, d]) => x + d < 16 && region(x + d, y))
    return hit ? hit[2][y * 16 + x + hit[1]] : all[0][2][y * 16 + x]
  })
  const jitter = (img, s) => (noise ? addNoise(img, s, noise) : img)
  return { left: jitter(left, seed + 50), right: map(jitter(right, seed + 90), (v) => v * gain + offset), truth }
}
const box = ([x0, y0, x1, y1]) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1
const LAYERS = S.list(S.obj({ box: S.list(S.int(), { min: 4, about: t('它占的矩形：x0, y0, x1, y1（不含 x1、y1）', 'the rectangle it fills: x0, y0, x1, y1 (x1, y1 excluded)') }), d: S.int({ min: 0, about: t('视差', 'its disparity') }) }), { about: t('远墙前面的几层，从后往前', 'the layers before the far wall, back to front') })
const layersOf = (layers) => layers.map((l) => [box(l.box), l.d])
const depthOf = (d, fb) => map(d, (v) => fb / v)

// One camera pair's fundamental matrix F, of rank 2 (its third row a mix of the first two), by its columns. The
// epipolar line of p = (x, y, 1) in the right image is l′ = F·p.
const vec = (...v) => ({ w: 3, h: 1, data: Float32Array.from(v) })
const F = [
  [0, -0.02, 0.4],
  [0.03, 0, -0.5],
  [-0.38, 0.47, 0.12],
]
F[2] = F[0].map((v, j) => -2 * v + 0.5 * F[1][j])
const column = (j) => vec(F[0][j], F[1][j], F[2][j])
const epiline = (x, y) => vec(...F.map((r) => r[0] * x + r[1] * y + r[2]))
const COLUMNS = { c1: column(0), c2: column(1), c3: column(2) }
const cross = (a, b) => vec(a.data[1] * b.data[2] - a.data[2] * b.data[1], a.data[2] * b.data[0] - a.data[0] * b.data[2], a.data[0] * b.data[1] - a.data[1] * b.data[0])
// The epipole e′, where every epipolar line in the right image meets: perpendicular to every column of F.
const EPIPOLE = (() => {
  const e = cross(column(0), column(1))
  return vec(e.data[0] / e.data[2], e.data[1] / e.data[2], 1)
})()

// A robot vacuum's stereo camera (f·b = 3): a far wall, a textureless floor in the bottom rows, obstacles. The region
// of interest is what is above the floor; nearer than 1.2 m there means stop.
const FB = 3
const NEAR = 1.2
const FLOOR = 12
const REGION = fromFn(16, 16, (x, y) => (y < FLOOR ? 1 : 0))
function room(seed, obstacles, noise = 0.05) {
  const scene = stereo(seed, layersOf(obstacles), { far: 1, noise })
  // The floor has no texture: flat grey in both cameras.
  const flat = (img) => fromFn(16, 16, (x, y) => (y >= FLOOR ? 0.5 : img.data[y * 16 + x]))
  return { left: flat(scene.left), right: flat(scene.right), z: depthOf(scene.truth, FB) }
}
const stopOf = (z) => zip(z, REGION, (v, r) => (v < NEAR && r ? 1 : 0))
const ROOM_EXPECTS = {
  distance: (r) => ({ out: zip(r.z, REGION, (v, k) => (k ? v : 0)) }),
  stop: (r) => ({ stop: stopOf(r.z) }),
}

export const STEREO = {
  stereo: {
    about: t('左右两台相机拍的一对图：远墙前有几层有纹理的东西；期望是视差图', 'a pair from a left and a right camera, textured layers before a far wall; the disparity map expected'),
    test: S.obj({ seed: S.int(), layers: LAYERS, noise: S.opt(num) }),
    make: ({ seed, layers, noise }) => {
      const scene = stereo(seed, layersOf(layers), { noise })
      return { inputs: { left: scene.left, right: scene.right }, expected: { out: scene.truth } }
    },
  },
  depth: {
    about: t('一张视差图（远墙视差 1）；期望是距离 f·b ÷ 视差。给了 f、b 时它们也是输入，否则 f·b = 3', 'a disparity map (the far wall at 1); the distance f·b ÷ disparity expected, f and b inputs too when given, else f·b = 3'),
    test: S.obj({ seed: S.int(), layers: LAYERS, f: S.opt(num), b: S.opt(num) }),
    make: ({ seed, layers, f, b }) => {
      const d = stereo(seed, layersOf(layers), { far: 1 }).truth
      return f === undefined ? { inputs: { d }, expected: { out: depthOf(d, FB) } } : { inputs: { d, f: image(1, 1, f), b: image(1, 1, b) }, expected: { out: depthOf(d, f * b) } }
    },
  },
  epiline: {
    about: t('一对相机的基础矩阵 F（按列）和左图的点 (x, y)；期望是右图里的极线 F·p', 'a camera pair’s fundamental matrix F (by columns) and a left point (x, y); the epipolar line F·p in the right image expected'),
    test: S.obj({ x: num, y: num }),
    make: ({ x, y }) => ({ inputs: { ...COLUMNS, px: image(1, 1, x), py: image(1, 1, y) }, expected: { out: epiline(x, y) } }),
  },
  onEpiline: {
    about: t('同样的 F、左图的点和右图的点 q；期望是 q 在不在极线上（|q·l′| < 0.05）', 'the same F, a left point and a right point q; whether q is on the epipolar line (|q·l′| < 0.05) expected'),
    test: S.obj({ x: num, y: num, q: S.list(num, { min: 2, about: t('右图的点 (x′, y′)', 'the right point (x′, y′)') }) }),
    make: ({ x, y, q: [qx, qy] }) => {
      const l = epiline(x, y).data
      const v = l[0] * qx + l[1] * qy + l[2]
      return { inputs: { ...COLUMNS, px: image(1, 1, x), py: image(1, 1, y), q: vec(qx, qy, 1) }, expected: { on: image(1, 1, Math.abs(v) < 0.05 ? 1 : 0) } }
    },
  },
  epipole: {
    about: t('同样的 F 的三列（按给的顺序）和 (0, 0, 1)；期望是极点 e′', 'the same F’s three columns (in the order given) and (0, 0, 1); the epipole e′ expected'),
    test: S.obj({ columns: S.list(S.int({ min: 0, max: 2 }), { min: 3 }) }),
    make: ({ columns }) => {
      const [c1, c2, c3] = columns.map(column)
      return { inputs: { c1, c2, c3, z: vec(0, 0, 1) }, expected: { out: EPIPOLE } }
    },
  },
  room: {
    about: t('扫地机器人的双目：远墙、没有纹理的地面、障碍物，另给地面以上的区域；期望是区域里的距离，或 1.2 米内要停的地方', 'a robot vacuum’s stereo pair, a far wall, a textureless floor and obstacles, with the region above the floor given; the distance in the region, or where to stop within 1.2 m, expected'),
    setup: S.obj({ expect: S.oneOf(Object.keys(ROOM_EXPECTS)) }),
    test: S.obj({ seed: S.int(), obstacles: LAYERS }),
    make: ({ seed, obstacles }, { expect }) => {
      const r = room(seed, obstacles)
      return { inputs: { left: r.left, right: r.right, region: REGION }, expected: ROOM_EXPECTS[expect](r) }
    },
  },
  roomDepth: {
    about: t('同样的房间，已经算好的距离（地面没有纹理，那里的距离是乱的）；期望是 1.2 米内要停的地方', 'the same room as distances already found (the floor has no texture, so its distances are anything); where to stop within 1.2 m expected'),
    test: S.obj({ seed: S.int(), obstacles: LAYERS, floorSeed: S.int({ about: t('地面上乱的距离的种子', 'the seed of the floor’s stray distances') }) }),
    make: ({ seed, obstacles, floorSeed }) => {
      const r = room(seed, obstacles)
      const next = random(floorSeed)
      const z = fromFn(16, 16, (x, y) => (y >= FLOOR ? 0.8 + 2.5 * next() : r.z.data[y * 16 + x]))
      return { inputs: { z, region: REGION }, expected: { stop: stopOf(r.z) } }
    },
  },
}
