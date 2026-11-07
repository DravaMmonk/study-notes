// A level's introduction (its content's `intro`): the pages read before playing it, each { t, fig? }. t is a { zh, en }
// paragraph (either side may use <b>…</b>); fig is an optional picture, one of three (vocabulary.js INTRO):
//   { test: 0 }                            the level's test 0: input → expected (circuit tasks only); { task: 0,
//                                          test: 0 } is a test of the level's task 0, and without `task` of its last
//   { part: 'shift', params: { dir: 'right' }, input: 'square' }
//                                          one part working on a picture: input → part → output. A part with two
//                                          inputs takes inputs: ['square', 'disk']. Each is a picture
//                                          (items/pictures.js), or 'test': the first test input of the figure's task.
//   { figure: 'conv-press' }               one of the notes' figures (trace-viewer/src/figures)
// Any figure may add caption: { zh, en }; test and part figures may add view: 'terrain' and so on.
// `level` is a level as the course reads it (course.js), its tasks read.
import { isPair } from '../../shell/i18n.js'
import { NODE_TYPES, specsOf } from './engine/nodes.js'
import { picture } from './items/pictures.js'

/** The task of the level a figure is drawn from: its `task`, else the level's last. */
export const figureTask = (fig, level) => level.tasks[fig.task ?? level.tasks.length - 1] ?? null

/** The picture an intro's part figure is fed: a picture, or 'test', the first test input of `task`. */
export function source(spec, task) {
  if (spec === 'test') return Object.values(task?.tests?.[0]?.inputs ?? {})[0] ?? null
  try {
    return picture(spec)
  } catch {
    return null
  }
}

/** The test a { test } figure shows. */
export const figureTest = (fig, level) => figureTask(fig, level)?.tests?.[fig.test] ?? null

// A part figure shows a part every course starts from.
const { defaultParams, inputsOf } = specsOf(NODE_TYPES)

// What a part makes of its inputs, for a { part } figure. Throws on anything the figure cannot draw.
export function partFigure(fig, level) {
  const spec = NODE_TYPES[fig.part]
  if (!spec || spec.fixed) throw new Error(`没有元件 ${fig.part}`)
  const ports = inputsOf(fig.part)
  const specs = fig.inputs ?? [fig.input ?? 'square']
  if (specs.length !== ports.length) throw new Error(`${fig.part} 要 ${ports.length} 个输入，给了 ${specs.length} 个`)
  const ins = Object.fromEntries(ports.map((port, i) => {
    const img = source(specs[i], figureTask(fig, level))
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
  if (!pages?.length) return ['没有引言']
  const problems = []
  pages.forEach((page, i) => {
    const where = `第 ${i + 1} 页`
    const text = isPair(page.t) ? page.t.zh : page.t
    if (!text || !text.trim()) problems.push(`${where}没有文字`)
    const fig = page.fig
    if (!fig) return
    if (fig.test !== undefined && !figureTest(fig, level)) problems.push(`${where}要${fig.task === undefined ? '' : `第 ${fig.task + 1} 个任务的`}第 ${fig.test} 组测试，可这一关没有`)
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
