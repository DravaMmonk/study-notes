// A local blur experiment. Both questions use the same hidden operator.
import { filterImage } from './operators.js'
import { fromRows, differs } from './image.js'
import { T } from '../../shell/i18n.js'

const box = (w, h, gain = 1) => fromRows(Array.from({ length: h }, () => Array(w).fill(gain / (w * h))))
const actual = box(3, 3)
export const probeQuestions = [
  {
    title: T('影响范围', 'Support'),
    options: [
      ['horizontal', T('横向三个像素', 'Three horizontal pixels'), box(3, 1)],
      ['vertical', T('纵向三个像素', 'Three vertical pixels'), box(1, 3)],
      ['square', T('周围 3 × 3 的像素', 'A 3 × 3 neighbourhood'), actual],
    ],
    answer: 'square',
  },
  {
    title: T('权重总和', 'Weight sum'),
    options: [
      ['half', T('0.5', '0.5'), box(3, 3, 0.5)],
      ['one', T('1', '1'), actual],
      ['double', T('2', '2'), box(3, 3, 2)],
    ],
    answer: 'one',
  },
]

export const blankProbe = () => Array.from({ length: 7 }, () => Array(7).fill(0))
const valid = rows => Array.isArray(rows) && rows.length === 7 && rows.every(row =>
  Array.isArray(row) && row.length === 7 && row.every(value => Number.isFinite(value) && value >= 0 && value <= 1))

const blur = (image, kernel) => filterImage(image, kernel, { outside: 'clamp' })
export const probeOutput = rows => valid(rows) ? blur(fromRows(rows), actual) : null

export function checkProbe(question, evidence) {
  const output = probeOutput(evidence?.rows)
  if (!output) return T('先运行一张读数在 0 到 1 之间的图。', 'Run an image with readings between 0 and 1 first.')
  const image = fromRows(evidence.rows)
  if (question.options.some(([id, , kernel]) => id !== question.answer && !differs(output, blur(image, kernel)))) {
    return T('这张图的输出仍与另一种解释相同。换一种输入试试。', 'Another explanation gives the same output on this image. Try a different input.')
  }
  if (evidence.answer !== question.answer) {
    return T('再比较输入和输出，选择这份证据支持的结论。', 'Compare the input with the output and choose the conclusion supported by the evidence.')
  }
  return null
}
