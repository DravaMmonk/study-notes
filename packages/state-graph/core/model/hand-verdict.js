// Pure judges for complete hand-play works. Legal-work checks mirror the UI's action guards.
import { allRoutes, evalGraph, knapBest, knapTrace, lcsLen, lcsTable, lcsTrace } from './algo.js'
import { seamPath, seamTable } from './worlds/picture.js'
import { settle, tileAt } from './worlds/value.js'

const result = (steps) => ({ pass: steps.every(step => step.pass), steps, fail: steps.find(step => !step.pass) ?? null })
const row = (at, got, want, pass, why) => ({ at, got, want, pass, why: pass ? null : why })
const rc = id => String(id).split(',').map(Number)
const inside = (id, map) => {
  const [r, c] = rc(id)
  return Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 && r < map.R && c < map.C
}
const forward = (a, b) => {
  const [r, c] = rc(a), [y, x] = rc(b)
  return (r === y && x === c + 1) || (c === x && y === r + 1)
}
const cut = (img, path) => img.map((line, r) => line.filter((_, c) => c !== path.find(p => p[0] === r)?.[1]))
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const neighbours = (id, map) => {
  const [r, c] = rc(id)
  return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].map(p => p.join()).filter(p => inside(p, map) && tileAt(map, ...rc(p)) !== 'wall')
}

export function judgeTrace(L, { found = [] } = {}) {
  const routes = allRoutes(L.start, L.end, L.edges).map(path => path.join('>'))
  const keys = found.map(path => path.join('>'))
  return result([
    ...keys.map((key, k) => row(k, key, 'distinct legal route', routes.includes(key) && keys.indexOf(key) === k, 'invalid or repeated route')),
    row('count', keys.length, routes.length, keys.length === routes.length, 'routes missing'),
  ])
}

export function judgeFill(L, { vals = {} } = {}) {
  const truth = evalGraph(L.cells.map(c => c.id === L.start ? { ...c, fixed: 1 } : c), L.edges)
  return result(truth.order.map(id => row(id, id === L.start ? 1 : vals[id] ?? null, truth.val[id], (id === L.start ? 1 : vals[id]) === truth.val[id], 'wrong route count')))
}

export function judgeLink(L, { links = [] } = {}) {
  return result(L.tests.map((t, k) => {
    const pairs = links[k] ?? []
    const legal = pairs.every(([i, j], at) => Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j >= 0 && i < t.a.length && j < t.b.length && t.a[i] === t.b[j] && pairs.every(([a, b], other) => other === at || (a !== i && b !== j && (a - i) * (b - j) > 0)))
    const want = lcsLen(t.a, t.b)
    return row(k, pairs.length, want, legal && pairs.length >= want, legal ? 'subsequence too short' : 'illegal links')
  }))
}

export function judgePack(L, { bags = [] } = {}) {
  return result(L.tests.map((t, k) => {
    const bag = bags[k] ?? []
    const legal = new Set(bag).size === bag.length && bag.every(i => Number.isInteger(i) && i >= 0 && i < t.items.length)
    const weight = legal ? bag.reduce((sum, i) => sum + t.items[i].w, 0) : null
    const value = legal ? bag.reduce((sum, i) => sum + t.items[i].v, 0) : null
    const want = knapBest(t)
    return row(k, { weight, value }, { capacity: t.W, value: want }, legal && weight <= t.W && value >= want, !legal ? 'illegal items' : weight > t.W ? 'over capacity' : 'value below target')
  }))
}

export function judgeBreach(L, { routes = {} } = {}) {
  const { A = [], B = [] } = routes, map = L.maze, key = map.key.join(), doors = map.doors.map(p => p.join())
  const legal = path => path[0] === '0,0' && path.every((id, k) => inside(id, map) && (!k || forward(path[k - 1], id)) && (!doors.includes(id) || path.slice(0, k).includes(key)))
  const end = A.at(-1)
  const [r, c] = rc(end)
  return result([
    row('routes', [A, B], 'two legal routes', legal(A) && legal(B), 'draw two legal routes'),
    row('meeting', [end ?? null, B.at(-1) ?? null], 'same cell', Boolean(end) && end === B.at(-1), 'different endpoints'),
    row('key', [A.includes(key), B.includes(key)], 'one key holder', A.includes(key) !== B.includes(key), 'same key state'),
    row('door', end ?? null, 'door right or down', [`${r},${c + 1}`, `${r + 1},${c}`].some(id => doors.includes(id)), 'no door next'),
  ])
}

export function judgePolicy(L, { walks = [] } = {}) {
  const table = settle(L.map)
  return result(L.starts.map((start, k) => {
    const path = walks[k] ?? []
    const legal = path[0] === start.join() && path.every((id, at) => inside(id, L.map) && (!at || (tileAt(L.map, ...rc(path[at - 1])) !== 'gold' && neighbours(path[at - 1], L.map).includes(id) && table.get(id) >= Math.max(...neighbours(path[at - 1], L.map).map(p => table.get(p))))))
    return row(k, path, 'best-neighbour walk to gold', legal && tileAt(L.map, ...rc(path.at(-1))) === 'gold', 'walk must follow best neighbours to gold')
  }))
}

export function judgeSeam(L, work = {}) {
  // The first path is manual; later cuts use the machine's deterministic seam choice.
  let img = L.img
  const path = work.firstSeam ?? [], { e, f } = seamTable(img), H = img.length
  const steps = path.map(([r, c], k) => {
    const prev = path[k - 1]
    const valid = Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < H && c >= 0 && c < img[0].length
      && (k === 0 ? r === H - 1 && f[r][c] === Math.min(...f[H - 1]) : r === prev[0] - 1 && Math.abs(c - prev[1]) <= 1 && f[r][c] === f[prev[0]][prev[1]] - e[prev[0]][prev[1]])
    return row(k, [r, c], 'minimum-energy predecessor', valid, 'invalid seam step')
  })
  steps.push(row('first', path.length, H, path.length === H, 'incomplete first seam'))
  const valid = steps.every(s => s.pass)
  if (valid) {
    img = cut(img, path)
    for (let n = 1; n < (work.cuts ?? 0) && img[0].length > 2; n++) img = cut(img, seamPath(img))
  }
  const count = Number.isInteger(work.cuts) && work.cuts >= L.cuts && work.cuts >= 1 && work.cuts <= L.img[0].length - 2
  steps.push(row('cuts', work.cuts ?? 0, L.cuts, count, 'not enough legal cuts'))
  steps.push(row('image', work.img ?? null, img, valid && count && equal(work.img, img), 'image differs from seam cuts'))
  return result(steps)
}

const judges = { trace: judgeTrace, fill: judgeFill, link: judgeLink, pack: judgePack, breach: judgeBreach, policy: judgePolicy, seam: judgeSeam }
export const judgeHand = (level, work) => {
  const judge = judges[level.play.split(':').at(-1)]
  if (!judge) throw new Error(`no hand judge for ${level.play}`)
  return judge(level, work)
}

/** Deterministic reference works and intentionally incomplete/greedy naive works, without authored data changes. */
export function handExamples(L) {
  switch (L.play.split(':').at(-1)) {
    case 'trace': return { reference: { found: allRoutes(L.start, L.end, L.edges) }, naive: { found: [] } }
    case 'fill': return { reference: { vals: evalGraph(L.cells.map(c => c.id === L.start ? { ...c, fixed: 1 } : c), L.edges).val }, naive: { vals: {} } }
    case 'link': return { reference: { links: L.tests.map(t => lcsTrace(t.a, t.b, lcsTable(t.a, t.b)).pairs) }, naive: { links: L.tests.map(() => []) } }
    case 'pack': return { reference: { bags: L.tests.map(t => knapTrace(t).picked) }, naive: { bags: L.tests.map(() => []) } }
    case 'breach': {
      const map = L.maze, routes = []
      const visit = path => {
        routes.push(path)
        const [r, c] = rc(path.at(-1))
        for (const id of [`${r},${c + 1}`, `${r + 1},${c}`]) if (inside(id, map) && (!map.doors.some(p => p.join() === id) || path.includes(map.key.join()))) visit([...path, id])
      }
      visit(['0,0'])
      const A = routes.find(a => a.includes(map.key.join()) && routes.some(b => !b.includes(map.key.join()) && b.at(-1) === a.at(-1)) && map.doors.some(p => forward(a.at(-1), p.join())))
      const B = routes.find(b => !b.includes(map.key.join()) && b.at(-1) === A?.at(-1))
      return { reference: { routes: { A: A ?? [], B: B ?? [] } }, naive: { routes: { A: ['0,0'], B: ['0,0'] } } }
    }
    case 'policy': {
      const table = settle(L.map)
      const walks = L.starts.map(start => {
        const path = [start.join()]
        for (let n = 0; n < L.map.R * L.map.C && tileAt(L.map, ...rc(path.at(-1))) !== 'gold'; n++) {
          const choices = neighbours(path.at(-1), L.map)
          path.push(choices.reduce((a, b) => table.get(b) > table.get(a) ? b : a))
        }
        return path
      })
      return { reference: { walks }, naive: { walks: L.starts.map(p => [p.join()]) } }
    }
    case 'seam': {
      let img = L.img
      const firstSeam = seamPath(img)
      for (let n = 0; n < L.cuts && img[0].length > 2; n++) img = cut(img, n ? seamPath(img) : firstSeam)
      return { reference: { img, firstSeam, cuts: L.cuts }, naive: { img: L.img, cuts: 0 } }
    }
    default: throw new Error(`no hand examples for ${L.play}`)
  }
}
