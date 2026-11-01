// node --test games/kit/circuit — a board drawn headlessly from its blueprint text (svg.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { boardSvg } from './svg.js'

const nodes = (svg) => [...svg.matchAll(/data-node="([^"]+)"/g)].map((m) => m[1])
const rect = (svg, id) => {
  const m = new RegExp(`data-node="${id}"><rect class="[^"]+" x="([\\d.]+)" y="([\\d.]+)" width="([\\d.]+)" height="([\\d.]+)"`).exec(svg)
  return m && { x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) }
}

test('every part a box, the level’s nodes at the edges, each part after what it reads', () => {
  const svg = boardSvg(['a = read[file="src/cart.js"]()', 'k = concat(issue, a)', 'm = model(k)', 'repo <- m'], { title: 'factory 1-3' })
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"[^>]* viewBox="0 0 \d+ \d+"/)
  assert.deepEqual(nodes(svg).sort(), ['a', 'issue', 'k', 'm', 'repo'])
  assert.ok(svg.includes('>factory 1-3<') && svg.includes('file=src/cart.js'))
  assert.ok(rect(svg, 'issue').x < rect(svg, 'a').x, 'the level’s input on the left')
  assert.ok(rect(svg, 'a').x < rect(svg, 'k').x && rect(svg, 'k').x < rect(svg, 'm').x && rect(svg, 'm').x < rect(svg, 'repo').x)
  assert.equal(svg.match(/class="bp-wire"/g).length, 4)
})

test('a frame holds its regions, laid out inside it; named ports and output keys are written', () => {
  const svg = boardSvg(['f = impI[A="A & B"](body: m2) {', '  body {', '    e = andE(f.body)', '    m1 = mp(p, e.left)', '    m2 = mp(m1, e.right)', '  }', '}', 'goal <- f'])
  const f = rect(svg, 'f')
  for (const id of ['e', 'm1', 'm2']) {
    const r = rect(svg, id)
    assert.ok(r.x > f.x && r.y > f.y && r.x + r.w < f.x + f.w && r.y + r.h < f.y + f.h, `${id} inside the frame`)
  }
  assert.ok(svg.includes('>body<'), 'the region is named')
  assert.ok(svg.includes('>left<') && svg.includes('>right<'), 'output keys on their wires')
  assert.ok(svg.includes('A=A &amp; B'), 'text is escaped')
})

test('text it cannot read throws as the blueprint reader does', () => {
  assert.throws(() => boardSvg(['a = (']), (e) => e.line === 1 && typeof e.en === 'string')
})
