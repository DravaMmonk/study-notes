import { NODE_TYPES, defaultParams, inputsOf } from '../../../kit/domains/image/engine/nodes.js'
import { GLYPHS, patterns } from '../../../kit/domains/image/engine/image.js'
import { isPair } from '../../../kit/shell/i18n.js'
import ch0 from './ch0.js'
import ch1 from './ch1.js'
import ch2 from './ch2.js'
import ch3 from './ch3.js'
import ch4 from './ch4.js'
import ch5 from './ch5.js'
import ch6 from './ch6.js'
import ch7 from './ch7.js'
import ch8 from './ch8.js'
import ch9 from './ch9.js'
import ch10 from './ch10.js'

// 每一关的「引入」：玩之前读的几页，交代这一关在讲什么、为什么要做、有什么新东西，但不给答案。
//
//   INTROS['1-1'] = [{ t, fig? }, …]
//
// t   一段话 { zh, en }，两边都可以用 <b>…</b> 加粗。
// fig 可选的配图，三种之一：
//   { test: 0 }                            本关第 0 组测试：输入 → 期望（只有电路关有测试）
//   { part: 'shift', params: { dir: '→' }, input: 'square' }
//                                          一个元件处理一张图：输入 → 元件 → 输出。两个输入的元件用
//                                          inputs: ['square', 'disk']。图案见 source() 下面。
//   { figure: 'conv-press' }               src/figures/ 里的一张插图（笔记里用的那种实物模型）
// 任何配图都可以加 caption: { zh, en } 作为图注；test 和 part 还可以加 view: 'terrain' 等画法。
export const INTROS = { ...ch0, ...ch1, ...ch2, ...ch3, ...ch4, ...ch5, ...ch6, ...ch7, ...ch8, ...ch9, ...ch10 }

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

// Every problem with a level's intro, for npm run levels: missing pages, empty text, or figures that
// point at nothing.
export function introProblems(level, figureNames) {
  const pages = INTROS[level.id]
  if (!pages?.length) return ['没有引入']
  const problems = []
  pages.forEach((page, i) => {
    const where = `第 ${i + 1} 页`
    const text = isPair(page.t) ? page.t.zh : page.t
    if (!text || !text.trim()) problems.push(`${where}没有文字`)
    const fig = page.fig
    if (!fig) return
    if (fig.test !== undefined && !level.tests?.[fig.test]) problems.push(`${where}要第 ${fig.test} 组测试，可这一关没有`)
    if (fig.figure && !figureNames.includes(fig.figure)) problems.push(`${where}没有插图 ${fig.figure}`)
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
