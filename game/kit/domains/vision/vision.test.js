// node --test (npm test) — the vision domain (games/DESIGN.md 6.8) on the cases of the course specification
// (docs/Unimelb/26S2/CV/vision-game-specs/chapters-0-1.md): its primitives, the operations a player builds from them
// (crop, translate, nearest and bilinear resizing, a quantiser) on the public and hidden cases, the grid asks, the
// choice judges, the scene model, the pinhole and thin-lens benches; and its starter game passing its own checks.
import { test } from 'node:test'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { PARTS } from './parts.js'
import { fromText, toText } from './board.js'
import { readTest, runLevel } from './run.js'
import { differs, fromRows, toRows } from './image.js'
import { gridCheck, gridReference, gridStart } from './grid.js'
import { JUDGES, isNaive, verdictOf } from './judges.js'
import { describe, factsOf, render, revealing, sameImage } from './scene.js'
import { play } from './play.js'
import { pinhole, pinholeView, project } from './benches/pinhole.js'
import { lensView } from './benches/lens.js'
import { lessonProblems } from './benches/lesson.js'
import domain from './domain.js'

const partOf = (type) => PARTS[type]
const port = (n) => ({ name: n, label: n })
/** A circuit task of these inputs and one output `out`, and a board for it from blueprint lines. */
const task = (inputs, tests) => ({ inputs: inputs.map(port), outputs: [port('out')], tests: tests.map(readTest) })
const passes = (lines, inputs, cases) => {
  const t = task(inputs, cases.map(([ins, out]) => ({ inputs: ins, expect: { out } })))
  const board = fromText(lines, t, partOf)
  const byId = (a, b) => (a.id ?? a.to + a.port).localeCompare(b.id ?? b.to + b.port)
  const strip = (b) => ({ nodes: b.nodes.map(({ id, type, params }) => ({ id, type, params })).sort(byId), wires: [...b.wires].sort(byId) })
  assert.deepEqual(strip(fromText(toText(board, partOf), t, partOf)), strip(board), 'the board writes as text that reads back as it')
  return runLevel(t, board, partOf).runs.map((r) => r.fail?.why.en ?? null)
}
const allPass = (lines, inputs, cases) => assert.deepEqual(passes(lines, inputs, cases), cases.map(() => null))

test('values: rows read into images and back; a difference names the first cell', () => {
  const img = fromRows([[0, 0.5, 1], [1, 0.25, 0]])
  assert.deepEqual([img.w, img.h, img.c], [3, 2, 1])
  assert.deepEqual(toRows(img), [[0, 0.5, 1], [1, 0.25, 0]])
  assert.equal(fromRows([[1, 2], [3]]), null)
  assert.deepEqual(differs(img, fromRows([[0, 0.5, 1], [1, 0.3, 0]])).en, '(1, 1) should be 0.25, got 0.3')
  assert.match(differs(img, fromRows([[0, 0.5], [1, 0.25]])).en, /size should be 3 × 2, got 2 × 2/)
  assert.equal(differs(img, fromRows([[0, 0.5, 1], [1, 0.250001, 0]])), null, 'within 1e-5')
})

test('lookup reads at whole coordinates, by number or by coordinate image, outside as set', () => {
  const img = fromRows([[1, 2, 3], [4, 5, 6]])
  // 1C2: (2, 1) → 6, and every corner.
  allPass(['r = lookup(image, x, y)', 'out <- r'], ['image', 'x', 'y'], [
    [{ image: [[1, 2, 3], [4, 5, 6]], x: 2, y: 1 }, 6],
    [{ image: [[1, 2], [3, 4], [5, 6]], x: 0, y: 2 }, 5],
    [{ image: [[7]], x: 0, y: 0 }, 7],
  ])
  assert.throws(() => PARTS.lookup.eval({ image: img, x: 3, y: 0 }, { params: {} }), /outside/)
  assert.throws(() => PARTS.lookup.eval({ image: img, x: 0.5, y: 0 }, { params: {} }), /whole numbers/)
  assert.equal(PARTS.lookup.eval({ image: img, x: -1, y: 0 }, { params: { outside: 'zero' } }), 0)
  assert.equal(PARTS.lookup.eval({ image: img, x: 9, y: 1 }, { params: { outside: 'clamp' } }), 6)
})

test('an output with no value fails even where 「—」 is expected: a card that stopped, an input lacking, no wire', () => {
  const cases = [[{ a: 1 }, null]]
  assert.match(passes(['z = const[value=0]()', 'd = div(a, z)', 'e = add(d, a)', 'out <- e'], ['a'], cases)[0], /“d” stopped \(divided by 0\)/)
  assert.match(passes(['e = add(a, _)', 'out <- e'], ['a'], cases)[0], /“e” lacks an input/)
  assert.match(passes([], ['a'], cases)[0], /is not wired/)
  // 「—」 given is 「—」 passed on: a value, and it passes where 「—」 is expected.
  assert.deepEqual(passes(['e = add(a, a)', 'out <- e'], ['a'], [[{ a: null }, null]]), [null])
})

test('channels: one plane out of a colour image, three planes into one, unequal planes refused', () => {
  // 1C3: [(1,0,0),(0,0,1)], the blue plane [0, 1].
  allPass(['p = channel[c=2](image)', 'out <- p'], ['image'], [[{ image: [[[1, 0, 0], [0, 0, 1]]] }, [[0, 1]]]])
  // 1C4: R [1,0], G [0,0.5], B [0,1] → [(1,0,0),(0,0.5,1)].
  allPass(['m = compose(r, g, b)', 'out <- m'], ['r', 'g', 'b'], [[{ r: [[1, 0]], g: [[0, 0.5]], b: [[0, 1]] }, [[[1, 0, 0], [0, 0.5, 1]]]]])
  assert.throws(() => PARTS.compose.eval({ r: fromRows([[1, 0]]), g: fromRows([[0]]), b: fromRows([[0, 1]]) }), /differ in size/)
})

// The reference boards of the operations the course has the player build (author-side, never shown before solving).
const CROP = ['g = grid(w, h)', 'sx = add(g.x, x0)', 'sy = add(g.y, y0)', 'r = lookup(image, sx, sy)', 'out <- r']
const TRANSLATE = ['s = size(image)', 'g = grid(s.w, s.h)', 'sx = sub(g.x, dx)', 'sy = sub(g.y, dy)', 'r = lookup[outside=zero](image, sx, sy)', 'out <- r']
// The source coordinate of each destination one, along an axis of m source and n destination samples: i·(m−1)/(n−1),
// or the centre (m−1)/2 when n is 1 (the specification's endpoint convention).
const AXIS = (a, m, n, i) => [
  `${a}m1 = sub(${m}, one)`, `${a}n1 = sub(${n}, one)`, `${a}big = less(one, ${n})`, `${a}safe = max(${a}n1, one)`,
  `${a}k = div(${a}m1, ${a}safe)`, `${a}step = mul(${i}, ${a}k)`, `${a}mid = mul(${a}m1, half)`, `${a}s = select(${a}big, ${a}step, ${a}mid)`,
]
const SETUP = ['one = const[value=1]()', 'half = const[value=0.5]()', 's = size(image)', 'g = grid(w, h)']
const NEAREST = [...SETUP, ...AXIS('x', 's.w', 'w', 'g.x'), ...AXIS('y', 's.h', 'h', 'g.y'),
  'xr = add(xs, half)', 'xi = floor(xr)', 'yr = add(ys, half)', 'yi = floor(yr)', 'r = lookup(image, xi, yi)', 'out <- r']
const LINEAR = [...SETUP, ...AXIS('x', 's.w', 'w', 'g.x'), ...AXIS('y', 's.h', 'h', 'g.y'),
  'x0 = floor(xs)', 'fx = sub(xs, x0)', 'x1 = add(x0, one)', 'y0 = floor(ys)', 'fy = sub(ys, y0)', 'y1 = add(y0, one)',
  'a = lookup[outside=clamp](image, x0, y0)', 'b = lookup[outside=clamp](image, x1, y0)', 'c = lookup[outside=clamp](image, x0, y1)', 'd = lookup[outside=clamp](image, x1, y1)',
  'ab = sub(b, a)', 'abf = mul(ab, fx)', 'top = add(a, abf)', 'cd = sub(d, c)', 'cdf = mul(cd, fx)', 'bot = add(c, cdf)',
  'tb = sub(bot, top)', 'tbf = mul(tb, fy)', 'v = add(top, tbf)', 'out <- v']
const QUANTISE = ['zero = const[value=0]()', 'one = const[value=1]()', 'half = const[value=0.5]()',
  'lo = max(v, zero)', 'c = min(lo, one)', 'k = sub(L, one)', 'scaled = mul(c, k)', 'up = add(scaled, half)', 'q = floor(up)', 'r = div(q, k)', 'out <- r']

test('crop, built from grid, add and lookup (1D1, 1D2)', () => {
  const nine = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
  allPass(CROP, ['image', 'x0', 'y0', 'w', 'h'], [
    [{ image: nine, x0: 1, y0: 0, w: 2, h: 2 }, [[2, 3], [5, 6]]],
    [{ image: nine, x0: 0, y0: 1, w: 3, h: 2 }, [[4, 5, 6], [7, 8, 9]]],
    [{ image: [[1, 2, 3, 4], [5, 6, 7, 8]], x0: 3, y0: 1, w: 1, h: 1 }, [[8]]],
    [{ image: [[1, 2, 3, 4], [5, 6, 7, 8]], x0: 0, y0: 0, w: 4, h: 2 }, [[1, 2, 3, 4], [5, 6, 7, 8]]],
  ])
  // A rectangle reaching past the image stops, said why.
  assert.match(passes(CROP, ['image', 'x0', 'y0', 'w', 'h'], [[{ image: nine, x0: 2, y0: 0, w: 2, h: 1 }, [[3, 0]]]])[0], /“r” stopped \(\(3, 0\) is outside the 3 × 3 image\)/)
})

test('translate, keeping the size and filling with zero (1D3), then crop after it (1D4)', () => {
  const six = [[1, 2, 3], [4, 5, 6]]
  allPass(TRANSLATE, ['image', 'dx', 'dy'], [
    [{ image: six, dx: 1, dy: 0 }, [[0, 1, 2], [0, 4, 5]]],
    [{ image: six, dx: -1, dy: 0 }, [[2, 3, 0], [5, 6, 0]]],
    [{ image: six, dx: 0, dy: 1 }, [[0, 0, 0], [1, 2, 3]]],
    [{ image: six, dx: 0, dy: 0 }, six],
    [{ image: six, dx: 5, dy: -5 }, [[0, 0, 0], [0, 0, 0]]],
  ])
  // The naive mapping (source in the direction the content moves) fails the public case.
  const naive = TRANSLATE.map((l) => l.replace('sub(g.x, dx)', 'add(g.x, dx)').replace('sub(g.y, dy)', 'add(g.y, dy)'))
  assert.notEqual(passes(naive, ['image', 'dx', 'dy'], [[{ image: six, dx: 1, dy: 0 }, [[0, 1, 2], [0, 4, 5]]]])[0], null)
  const moved = PARTS.lookup.eval({ image: fromRows(six), x: fromRows([[-1, 0, 1], [-1, 0, 1]]), y: fromRows([[0, 0, 0], [1, 1, 1]]) }, { params: { outside: 'zero' } })
  assert.deepEqual(toRows(moved), [[0, 1, 2], [0, 4, 5]])
})

test('nearest resizing under the endpoint convention, ties to the larger index (1E2)', () => {
  allPass(NEAREST, ['image', 'w', 'h'], [
    [{ image: [[0, 1]], w: 3, h: 1 }, [[0, 1, 1]]],
    [{ image: [[0, 1]], w: 5, h: 1 }, [[0, 0, 1, 1, 1]]],
    [{ image: [[1, 2], [3, 4]], w: 2, h: 2 }, [[1, 2], [3, 4]]],
    [{ image: [[1, 2, 3, 4]], w: 1, h: 1 }, [[3]]],
    [{ image: [[1, 2, 3], [4, 5, 6]], w: 2, h: 3 }, [[1, 3], [4, 6], [4, 6]]],
  ])
  const floorOnly = NEAREST.map((l) => l.replace('xr = add(xs, half)', 'xr = add(xs, zeroish)').replace('yr = add(ys, half)', 'yr = add(ys, zeroish)'))
  const naive = ['zeroish = const[value=0]()', ...floorOnly]
  assert.notEqual(passes(naive, ['image', 'w', 'h'], [[{ image: [[0, 1]], w: 3, h: 1 }, [[0, 1, 1]]]])[0], null, 'always flooring is caught at the tie')
})

test('bilinear resizing, clamped at the border (1E3), and the two enlargements compared (1E4)', () => {
  allPass(LINEAR, ['image', 'w', 'h'], [
    [{ image: [[0, 1]], w: 3, h: 1 }, [[0, 0.5, 1]]],
    [{ image: [[0, 1], [1, 0]], w: 3, h: 3 }, [[0, 0.5, 1], [0.5, 0.5, 0.5], [1, 0.5, 0]]],
    [{ image: [[0, 1]], w: 5, h: 1 }, [[0, 0.25, 0.5, 0.75, 1]]],
    [{ image: [[1, 2, 3, 4]], w: 1, h: 1 }, [[2.5]]],
    [{ image: [[0, 2], [4, 6]], w: 2, h: 2 }, [[0, 2], [4, 6]]],
  ])
  allPass(NEAREST, ['image', 'w', 'h'], [[{ image: [[0, 1]], w: 5, h: 1 }, [[0, 0, 1, 1, 1]]]])
})

test('a uniform quantiser, ties to the larger level (1F2), and two inputs it cannot tell apart (1F3)', () => {
  allPass(QUANTISE, ['v', 'L'], [
    [{ v: [[0, 0.2, 0.7, 1]], L: 3 }, [[0, 0, 0.5, 1]]],
    [{ v: [[0.25, 0.75, -0.2, 1.3]], L: 3 }, [[0.5, 1, 0, 1]]],
    [{ v: [[0.49, 0.5]], L: 2 }, [[0, 1]]],
    [{ v: 0.2, L: 5 }, 0.25],
  ])
  allPass(QUANTISE, ['v', 'L'], [[{ v: 0.2, L: 3 }, 0], [{ v: 0.1, L: 3 }, 0]])
})

test('grid asks work out their own answers; the answer a task starts from never passes', () => {
  const image = [[0, 0.5, 1], [1, 0.25, 0]]
  const cases = [
    { image, ask: 'copy' },
    { image, ask: { pick: { x: 2, y: 0 } } },
    { image, ask: { locate: { x: 0, y: 1 } } },
    { image: [[[1, 0, 0], [0, 0, 0]]], ask: { set: { x: 1, y: 0, value: [0, 0, 1] } } },
    { image: [[-0.2, 0.5, 1.2]], ask: { fill: { rows: [[0, 0.5, 1]] } } },
  ]
  for (const t of cases) {
    assert.equal(gridCheck(t, gridReference(t)), null, JSON.stringify(t.ask))
    assert.notEqual(gridCheck(t, gridStart(t)), null, JSON.stringify(t.ask))
  }
  assert.match(gridCheck(cases[0], [[0, 0.5, 1], [0, 0.25, 0]]).en, /\(0, 1\) should be 1, got 0/)
  assert.match(gridCheck(cases[1], { x: 0, y: 2 }).en, /not \(2, 0\)/)
  assert.match(gridCheck(cases[3], [[[0, 0, 1], [0, 0, 1]]]).en, /only \(1, 0\) should change/)
})

// A scene of a red cube in the open and a blue ball behind an opaque screen; its twin hides a green ball instead.
const cube = { id: 'cube', class: 'cube', colour: 'red', boxes: [{ at: [-0.9, 0.5, 0], size: [1, 1, 1] }] }
const screen = { id: 'screen', class: 'screen', colour: 'grey', boxes: [{ at: [1, 0.8, 1.2], size: [1.6, 1.6, 0.1] }] }
const hidden = (colour) => ({ id: 'ball', class: 'ball', colour, boxes: [{ at: [1, 0.35, 0], size: [0.6, 0.6, 0.6] }] })
const SCENE = (colour) => ({ size: [32, 24], camera: { yaw: 0, pitch: 10, distance: 6, f: 1 }, light: { azimuth: 30, elevation: 60 }, floor: 'white', objects: [cube, screen, hidden(colour)] })

test('the scene model renders, hides what is behind a screen, and states its facts', () => {
  const [blue, green] = [SCENE('blue'), SCENE('green')]
  const facts = factsOf(blue)
  assert.equal(facts.find((f) => f.id === 'cube').visible, true)
  assert.equal(facts.find((f) => f.id === 'ball').visible, false)
  assert.ok(sameImage(blue, green), 'what changes behind the screen does not change the picture')
  assert.ok(!sameImage(blue, { ...blue, light: { azimuth: -40, elevation: 60 } }), 'the light does')
  assert.ok(!sameImage(blue, { ...blue, camera: { ...blue.camera, yaw: 40 } }), 'so does the view')
  // Scaling every object's size and distance from the camera by one factor gives the same picture (0C2).
  const eye = [0, 0.5, 6]
  const scaled = (k) => ({ ...blue, floor: undefined, objects: [cube].map((o) => ({ ...o, boxes: o.boxes.map((b) => ({ at: b.at.map((v, a) => eye[a] + k * (v - eye[a])), size: b.size.map((v) => v * k) })) })) })
  const far = { ...scaled(2), camera: { yaw: 0, pitch: 0, distance: 6, f: 1 } }
  const near = { ...scaled(1), camera: { yaw: 0, pitch: 0, distance: 6, f: 1 } }
  assert.ok(sameImage(near, far))
  assert.notEqual(factsOf(near)[0].depth.toFixed(3), factsOf(far)[0].depth.toFixed(3))
  assert.equal(render(blue).image.c, 3)
})

test('claims over candidate scenes: supported, contradicted, undetermined (0B3, 0D3)', () => {
  const scenes = [SCENE('blue'), SCENE('green')]
  assert.equal(verdictOf({ colour: { object: 'cube', is: 'red' } }, scenes).verdict, 'supported')
  assert.equal(verdictOf({ visible: { object: 'ball' } }, scenes).verdict, 'contradicted')
  assert.equal(verdictOf({ colour: { object: 'ball', is: 'blue' } }, scenes).verdict, 'undetermined')
  const round = { scenes, items: [{ claim: { colour: { object: 'ball', is: 'blue' } } }], options: [] }
  assert.match(JUDGES.claims.check(round, [['supported']], {})[0].why.en, /holds in scene 1 and fails in scene 2/)
  assert.deepEqual(JUDGES.claims.check(round, JUDGES.claims.reference(round, {}), {}), [])
})

// The starter game with its choice task made a claims round on these scenes (and `more` over the round).
const claimsGame = (scenes, more = {}) => {
  const content = readContent('starter', import.meta.dirname)
  const levels = content.levels.map((l) => (l.id !== '1-2' ? l : { ...l, tasks: [{ ...l.tasks[0], judge: 'claims', rounds: [{ scenes, items: [{ prompt: 'red', claim: { colour: { object: 'cube', is: 'red' } } }, { prompt: 'blue', claim: { colour: { object: 'ball', is: 'blue' } } }], ...more }] }] }))
  return domain.spec({ ...content, levels }).vision
}

test('a claims round: its scenes give one picture, a claim they split is shown from a view that tells them apart', () => {
  const [blue, green] = [SCENE('blue'), SCENE('green')]
  const camera = revealing(blue, green)
  assert.ok(camera && !sameImage({ ...blue, camera }, { ...green, camera }))
  assert.equal(revealing(blue, blue), null)
  const vision = claimsGame([blue, green])
  assert.deepEqual(vision.wrong, [])
  assert.deepEqual(vision.played.get('1-2')[0].rounds[0].reveals, [null, { scenes: [0, 1], camera }])
  // Scenes that do not give one picture are refused, flag or none.
  assert.match(claimsGame([blue, { ...green, light: { azimuth: -40, elevation: 60 } }]).wrong[0], /do not all give the same picture/)
})

test('a grid or choice task names its naive answer: the check makes sure it fails, the player who gives it is told why', () => {
  const content = readContent('starter', import.meta.dirname)
  const withNaive = (id, naive) => ({ ...content, levels: content.levels.map((l) => (l.id !== id ? l : { ...l, tasks: [{ ...l.tasks[0], naive }] })) })
  const why = { zh: '把 x 和 y 弄反了', en: 'x and y swapped' }
  const said = (c, id) => domain.validate(domain.spec(c)).find((l) => l.level === id)
  assert.match(said(withNaive('1-1', { answer: { x: 1, y: 2 }, why }), '1-1').text, /grid PASS, naive fails/)
  assert.match(said(withNaive('1-1', { answer: { x: 2, y: 1 }, why }), '1-1').text, /the naive answer passes/)
  const picks = [[['detect'], ['detect']]]
  assert.match(said(withNaive('1-2', { picks, why }), '1-2').text, /naive fails round 1/)
  assert.match(said(withNaive('1-2', { picks: [[['classify'], ['detect']]], why }), '1-2').text, /the naive answer passes every round/)
  const task = domain.spec(withNaive('1-2', { picks, why })).vision.played.get('1-2')[0]
  assert.ok(isNaive(task, 0, [['detect'], ['detect']]))
  assert.match(play.attempt({ level: { source: task } }, 'detect;detect').says.at(-1).en, /x and y swapped/)
})

test('a picture in words shows what it shows: regions of colour, no names, nothing hidden', () => {
  const words = describe(SCENE('blue')).en
  assert.match(words, /^a 32 × 24 picture/)
  assert.match(words, /a red region: x \d+–\d+, y \d+–\d+, \d+ pixels/)
  assert.match(words, /the floor \(white\)/)
  assert.doesNotMatch(words, /blue|ball|cube|screen/)
  assert.equal(describe(SCENE('blue')).en, describe(SCENE('green')).en)
})

test('blind play: a claims round is the picture described, options by label; a bench is tried setting by setting', () => {
  const vision = claimsGame([SCENE('blue'), SCENE('green')])
  const ctx = (id) => ({ level: { source: vision.played.get(id)[0] } })
  const shown = play.open(ctx('1-2')).sections[0].text.en
  assert.match(shown, /The picture: a 32 × 24 picture/)
  assert.match(shown, /supported = Supported/)
  assert.doesNotMatch(shown, /ball|cube|"colour"/)
  const wrong = play.attempt(ctx('1-2'), 'supported;supported')
  assert.equal(wrong.pass, false)
  assert.match(wrong.says[0].en, /Scene 1 from another view \(holds\): a 32 × 24 picture/)
  assert.equal(play.attempt(ctx('1-2'), 'supported;undetermined').pass, true)
  const bench = play.open(ctx('1-3'))
  const benchText = bench.sections.map((x) => x.text.en).join('\n')
  assert.match(benchText, /- the pinhole camera from the side/)
  assert.match(benchText, /Z \(Depth Z\): 1–8, step 1; starts at 2[\s\S]*Now: Z = 2, h = 2$/)
  // What the screen does not say, blind play does not either: no formula from the model's own description.
  assert.doesNotMatch(benchText, /fH|f·H|= f/)
  const tried = play.attempt(ctx('1-3'), 'Z = 1\nZ = 9\nZ = 4')
  assert.equal(tried.pass, true)
  assert.deepEqual(tried.says.map((x) => x.en.split(' → ')[0].split(':')[0]), ['Z = 1', 'Z = 9', 'Z = 4'])
  assert.match(tried.says[1].en, /cannot be set to 9/)
  assert.equal(play.attempt(ctx('1-3'), 'Z = 3').pass, false)
})

test('fields: the least output that answers a question, or any that does (0A1, 0A2, 0A4)', () => {
  const options = [
    { id: 'label', label: 'label', gives: ['class'] },
    { id: 'box', label: 'box', gives: ['location'] },
    { id: 'boxes', label: 'labelled boxes', gives: ['class', 'location'] },
    { id: 'semantic', label: 'semantic map', gives: ['class', 'region'] },
    { id: 'depth', label: 'depth map', gives: ['depth', 'region'] },
  ]
  const round = { options, items: [{ needs: ['class'] }, { needs: ['class', 'location'] }, { needs: ['depth'] }] }
  assert.deepEqual(JUDGES.fields.reference(round, { mode: 'exact' }), [['label'], ['boxes'], ['depth']])
  assert.match(JUDGES.fields.check(round, [['semantic'], ['box'], ['semantic']], { mode: 'exact' })[0].why.en, /“semantic map” does not answer it/)
  assert.deepEqual(JUDGES.fields.check(round, [['label', 'semantic'], ['boxes'], ['depth']], { mode: 'enough' }), [])
})

test('cover, refute, pair, same and project judge from the options’ own data (0B1, 0B2, 0B4, 0C3, 0C4, 0D2, 1B4)', () => {
  const cases = [{ id: 'a', varies: ['view'] }, { id: 'b', varies: ['light', 'occlusion'] }, { id: 'c', varies: [] }, { id: 'd', varies: ['view', 'light'] }]
  assert.deepEqual(JUDGES.cover.check({ options: cases, items: [{}] }, [['a', 'b']], { needs: ['view', 'light', 'occlusion'] }), [])
  assert.match(JUDGES.cover.check({ options: cases, items: [{}] }, [['a', 'c']], { needs: ['view', 'light', 'occlusion'] })[0].why.en, /light, occlusion/)
  // Choosing everything is not choosing: a case the others make spare is pointed out.
  const labelled = cases.map((c) => ({ ...c, label: { zh: c.id, en: c.id } }))
  assert.match(JUDGES.cover.check({ options: labelled, items: [{}] }, [['a', 'b', 'c', 'd']], { needs: ['view', 'light', 'occlusion'] })[0].why.en, /“a” brings no change/)
  const least = JUDGES.cover.reference({ options: labelled, items: [{}] }, { needs: ['view', 'light', 'occlusion'] })
  assert.deepEqual(JUDGES.cover.check({ options: labelled, items: [{}] }, least, { needs: ['view', 'light', 'occlusion'] }), [])
  const preds = [{ id: 'x', truth: 'cat', predicted: 'cat' }, { id: 'y', truth: 'cat', predicted: 'dog' }, { id: 'none', label: 'none' }]
  assert.deepEqual(JUDGES.refute.reference({ options: preds, items: [{}] }), [['y']])
  assert.deepEqual(JUDGES.refute.reference({ options: [preds[0], preds[2]], items: [{}] }), [['none']])
  const pairs = { items: [{ measures: 'class' }, { measures: 'distance' }], options: [{ id: 'l', measures: 'class' }, { id: 'z', measures: 'distance' }] }
  assert.deepEqual(JUDGES.pair.reference(pairs), [['l'], ['z']])
  const ref = SCENE('blue')
  const views = { reference: ref, items: [{}], options: [
    { id: 'turned', scene: { ...ref, camera: { ...ref.camera, yaw: 60 } } },
    { id: 'relit', scene: { ...ref, light: { azimuth: -50, elevation: 40 } } },
    { id: 'changed', scene: { ...ref, objects: [{ ...cube, colour: 'yellow' }, screen, hidden('blue')] } },
  ] }
  assert.deepEqual(JUDGES.same.reference(views, { vary: 'camera' }), [['turned']])
  assert.deepEqual(JUDGES.same.reference(views, { vary: 'light' }), [['relit']])
  const pinholes = { items: [{}], options: [{ id: 'p', H: 1, Z: 2, label: 'p' }, { id: 'q', H: 2, Z: 4, label: 'q' }, { id: 'r', H: 2, Z: 2, label: 'r' }] }
  assert.deepEqual(JUDGES.project.check(pinholes, [['p', 'q']], { f: 2, target: 1 }), [])
  assert.match(JUDGES.project.check(pinholes, [['p', 'r']], { f: 2, target: 1 })[0].why.en, /images at height 2/)
})

test('the pinhole bench projects onto the upright virtual plane (1B1–1B3)', () => {
  assert.equal(project({ f: 2, Z: 4, X: 2 }).u, 1)
  assert.equal(project({ f: 2, Z: 4, X: -2 }).u, -1)
  assert.equal(project({ H: 2, f: 2, Z: 4 }).h, 1)
  assert.equal(project({ H: 3, f: 2, Z: 6 }).h, 1)
  assert.equal(project({ H: 2, Z: 4, f: 4 }).h, 2)
})

test('the pinhole bench with a sensor: pixels, the field of view, and which objects fall out of view (1B7, 1B8)', () => {
  // A 20 mm × 30 mm sensor of 200 × 300 pixels: 0.1 mm a pixel.
  const sensor = { height: 20, width: 30, pxHeight: 200, pxWidth: 300 }
  const one = pinholeView({ H: 120, Z: 600, sensor }, { f: 50 })
  assert.equal(one.h, 10)
  assert.equal(one.h_px, 100)
  assert.equal(one.fpx, 500)
  assert.ok(Math.abs(one.fov - 2 * Math.atan(10 / 50) * 180 / Math.PI) < 1e-9)
  assert.equal(one.inView, 1)
  // A row of objects at one depth: a long focal length puts the outer ones past the sensor's edges.
  const row = { Z: 1000, sensor, objects: [{ id: 'mid', X: -50, H: 100 }, { id: 'top', X: 150, H: 100 }, { id: 'low', X: -250, H: 100 }] }
  const wide = pinholeView(row, { f: 35 })
  const long = pinholeView(row, { f: 100 })
  assert.deepEqual([wide.in_mid, wide.in_top, wide.in_low, wide.allIn], [1, 1, 1, 1])
  assert.deepEqual([long.in_mid, long.in_top, long.in_low, long.inView, long.allIn], [1, 0, 0, 1, 0])
  assert.ok(Math.abs(long.h_mid_px - 100) < 1e-9)
  assert.ok(long.fov < wide.fov)
  assert.equal(pinhole.verify(pinhole.make({ target: { of: 'h_px', value: 1 } }), {}), 'a target in pixels needs a sensor')
})

test('a bench’s lesson: the start fails, some setting passes, the naive settings fail, every pass holds what it teaches', () => {
  const bench = { model: 'pinhole', setup: { H: 2, object: 'arrow' }, knobs: { Z: { min: 1, max: 8, step: 1, start: 2 }, f: { min: 1, max: 4, step: 1, start: 2 } }, goal: [{ of: 'h', near: 1, atMost: 0.001 }] }
  const view = (v) => project({ H: 2, ...v })
  const task = (more) => ({ bench, naive: [{ set: { Z: 1 }, why: 'nearer is not smaller' }], ...more })
  assert.deepEqual(lessonProblems(task({}), view), [])
  assert.deepEqual(lessonProblems(task({ naive: [{ set: { Z: 4 }, why: '…' }] }), view), ['the naive setting Z=4 passes'])
  // Taught: move the object, keep the plane. Turning f as well reaches the goal another way, and the check says so.
  assert.match(lessonProblems(task({ holds: [{ of: 'f', is: 2 }] }), view)[0], /the bench: Z=2, f=1 passes without what the bench teaches/)
  assert.deepEqual(lessonProblems(task({ bench: { ...bench, knobs: { ...bench.knobs, f: { ...bench.knobs.f, fixed: true } } }, holds: [{ of: 'f', is: 2 }] }), view), [])
  assert.deepEqual(lessonProblems(task({ bench: { ...bench, knobs: { Z: bench.knobs.Z } } }), view), ['the bench: the starting setting already passes'])
})

test('the thin-lens bench: light grows with the aperture, focus picks a depth, a smaller aperture a deeper range (1G1–1G3)', () => {
  const setup = { F: 50, A0: 5, cMax: 0.03, objects: [{ id: 'near', z: 1000 }, { id: 'far', z: 4000 }] }
  assert.ok(lensView(setup, { A: 10, focus: 1000 }).light > lensView(setup, { A: 5, focus: 1000 }).light)
  const near = lensView(setup, { A: 5, focus: 1000 })
  const far = lensView(setup, { A: 5, focus: 4000 })
  assert.deepEqual([near.sharp_near, near.sharp_far, far.sharp_near, far.sharp_far], [1, 0, 0, 1])
  assert.ok(lensView(setup, { A: 2, focus: 1000 }).dof > near.dof)
  assert.ok(near.near < 1000 && near.far > 1000)
})

test('the starter game fits the vocabulary and passes its checks, every kind of task in it', () => {
  const content = readContent('starter', import.meta.dirname)
  const lines = domain.validate(domain.spec(content))
  assert.deepEqual(lines.filter((l) => l.fail), [])
  const kinds = new Set(content.levels.flatMap((l) => l.tasks.map((t) => t.kind)))
  assert.deepEqual([...kinds].sort(), ['bench', 'choice', 'circuit', 'grid'])
})

test('the domain’s page code calls no method older iOS Safari lacks', () => {
  const files = readdirSync(import.meta.dirname, { recursive: true }).filter((f) => /\.jsx?$/.test(f) && !f.endsWith('.test.js'))
  const used = files.flatMap((f) => [...readFileSync(resolve(import.meta.dirname, f), 'utf8').matchAll(/\.(at|findLast|findLastIndex|toSorted|toReversed|groupBy)\(|structuredClone\(/g)].map((m) => `${f}: ${m[0]}`))
  assert.deepEqual(used, [])
})
