// A level's 引入: the pages read before playing it, each { t, fig? }. t is a { zh, en } paragraph (either side may use
// <b>…</b>); fig is an optional picture, one of three:
//   { test: 0 }                            the level's test 0: input → expected (circuit levels only)
//   { part: 'shift', params: { dir: '→' }, input: 'square' }
//                                          one part working on a picture: input → part → output. A part with two
//                                          inputs takes inputs: ['square', 'disk']. The pictures are source()'s.
//   { figure: 'conv-press' }               one of the notes' figures (trace-viewer/src/figures)
// Any figure may add caption: { zh, en }; test and part figures may add view: 'terrain' and so on.
import { isPair } from '../../shell/i18n.js'
import { GLYPHS, patterns } from './engine/image.js'
import { NODE_TYPES, defaultParams, inputsOf } from './engine/nodes.js'

// The pictures an intro can show without a test: a pattern by name ('square'), with its arguments
// (['square', 4, 4, 8]), a letter ('glyph:L'), or a level's own first test input ('test').
export function source(spec, level) {
  if (spec === 'test') return Object.values(level.tests?.[0]?.inputs ?? {})[0] ?? null
  if (typeof spec === 'string' && spec.startsWith('glyph:')) return GLYPHS[spec.slice(6)] ? patterns.glyph(GLYPHS[spec.slice(6)]) : null
  const [name, ...args] = Array.isArray(spec) ? spec : [spec]
  return patterns[name] ? patterns[name](...args) : null
}

// What a part makes of its inputs, for a { part } figure. Throws on anything the figure cannot draw.
export function partFigure(fig, level) {
  const spec = NODE_TYPES[fig.part]
  if (!spec || spec.fixed) throw new Error(`没有元件 ${fig.part}`)
  const ports = inputsOf(fig.part)
  const specs = fig.inputs ?? [fig.input ?? 'square']
  if (specs.length !== ports.length) throw new Error(`${fig.part} 要 ${ports.length} 个输入，给了 ${specs.length} 个`)
  const ins = Object.fromEntries(ports.map((port, i) => {
    const img = source(specs[i], level)
    if (!img) throw new Error(`没有图案 ${JSON.stringify(specs[i])}`)
    return [port, img]
  }))
  const known = new Set((spec.params ?? []).map((p) => p.key))
  for (const key of Object.keys(fig.params ?? {})) if (!known.has(key)) throw new Error(`${fig.part} 没有参数 ${key}`)
  const out = spec.eval(ins, { ...defaultParams(fig.part), ...fig.params })
  if (!out || !out.data) throw new Error(`${fig.part} 没有算出图像`)
  return { ins: ports.map((port) => ins[port]), out }
}

// Every problem with a level's intro: missing pages, empty text, or figures that point at nothing.
export function introProblems(pages, level, figures) {
  if (!pages?.length) return ['没有引入']
  const problems = []
  pages.forEach((page, i) => {
    const where = `第 ${i + 1} 页`
    const text = isPair(page.t) ? page.t.zh : page.t
    if (!text || !text.trim()) problems.push(`${where}没有文字`)
    const fig = page.fig
    if (!fig) return
    if (fig.test !== undefined && !level.tests?.[fig.test]) problems.push(`${where}要第 ${fig.test} 组测试，可这一关没有`)
    if (fig.figure && !figures.includes(fig.figure)) problems.push(`${where}没有插图 ${fig.figure}`)
    if (fig.part) {
      try {
        partFigure(fig, level)
      } catch (error) {
        problems.push(`${where}${error.message}`)
      }
    }
  })
  return problems
}
