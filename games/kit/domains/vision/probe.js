// Evidence tasks compare an experiment with competing explanations.
import { shiftRead } from './construction.js'
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

export function checkProbe(question, evidence, apply = blur) {
  if (!valid(evidence?.rows)) return T('先运行一张读数在 0 到 1 之间的图。', 'Run an image with readings between 0 and 1 first.')
  const image = fromRows(evidence.rows)
  const actual = question.options.find(([id]) => id === question.answer)[2]
  const output = apply(image, actual)
  if (question.options.some(([id, , setting]) => id !== question.answer && !differs(output, apply(image, setting)))) {
    return T('这张图的输出仍与另一种解释相同。换一种输入试试。', 'Another explanation gives the same output on this image. Try a different input.')
  }
  if (evidence.answer !== question.answer) {
    return T('再比较输入和输出，选择这份证据支持的结论。', 'Compare the input with the output and choose the conclusion supported by the evidence.')
  }
  return null
}

const shiftOffset = { x: 1, y: 0 }
const shiftQuestion = {
  title: T('亮点去了哪里？', 'Where does a bright pixel go?'),
  options: [
    ['left', T('往左一格', 'One cell left'), shiftOffset],
    ['right', T('往右一格', 'One cell right'), { x: -1, y: 0 }],
    ['up', T('往上一格', 'One cell up'), { x: 0, y: 1 }],
  ],
  answer: 'left',
}

const spectrumStart = { x: 2, y: 2 }
const validCycles = (n) => Number.isInteger(n) && n >= 1 && n <= 5
const spectrumImage = (input) => input && validCycles(input.x) && validCycles(input.y)
  ? fromRows(Array.from({ length: 12 }, (_, y) => Array.from({ length: 12 }, (_, x) =>
    0.5 + 0.22 * Math.cos(2 * Math.PI * input.x * x / 12) + 0.22 * Math.cos(2 * Math.PI * input.y * y / 12))))
  : null
const movement = [
  ['closer', T('更靠近中心', 'Closer to the centre')],
  ['farther', T('离中心更远', 'Farther from the centre')],
  ['same', T('保持不动', 'Unchanged')],
]
const spectrumQuestions = [
  { axis: 'x', title: T('只改变左右重复次数', 'Change only repetitions across'), options: movement },
  { axis: 'y', title: T('只改变上下重复次数', 'Change only repetitions down'), options: movement },
]

function checkSpectrum({ axis }, evidence) {
  const trial = evidence?.cycles
  if (!spectrumImage(trial)) return T('先运行一次有效实验。', 'Run a valid trial first.')
  const other = axis === 'x' ? 'y' : 'x'
  if (trial[axis] === spectrumStart[axis] || trial[other] !== spectrumStart[other]) {
    return T('与基准相比，只改题目指定的一项，才能辨认它的影响。', 'Change only the requested setting from the baseline to isolate its effect.')
  }
  const answer = trial[axis] > spectrumStart[axis] ? 'farther' : 'closer'
  return evidence.answer === answer ? null
    : T('比较同一轴上的一对亮点到中心的距离，再提交。', 'Compare the peak pair’s distance from the centre on the same axis, then submit.')
}

const gridModel = (questions, output, check) => ({
  field: 'rows', initial: blankProbe, output, questions, check,
  reference: () => {
    const rows = blankProbe()
    rows[3][3] = 1
    return questions.map(question => ({ rows, answer: question.answer }))
  },
  insufficient: () => ({ rows: blankProbe(), answer: questions[0].answer }),
})

const blurModel = gridModel(probeQuestions, probeOutput, checkProbe)
const shiftModel = gridModel([shiftQuestion],
  rows => valid(rows) ? shiftRead(fromRows(rows), shiftOffset) : null,
  (question, evidence) => checkProbe(question, evidence, shiftRead))

const spectrumModel = {
  field: 'cycles', initial: () => ({ ...spectrumStart }), output: spectrumImage,
  questions: spectrumQuestions, check: checkSpectrum,
  reference: () => spectrumQuestions.map(({ axis }) => ({ cycles: { ...spectrumStart, [axis]: 4 }, answer: 'farther' })),
  insufficient: () => ({ cycles: { x: 4, y: 4 }, answer: 'farther' }),
}

/**
 * A black-box filter the task describes: its kernel and, per question, the competing explanations (each a kernel).
 * The player draws an input that tells the explanations apart and picks the one its output supports.
 */
const filterModel = (task) => {
  const apply = (image, kernel) => filterImage(image, fromRows(kernel), { outside: 'clamp' })
  const questions = task.questions.map((q) => ({ title: q.title, options: q.options.map((o) => [o.id, o.label, o.kernel]), answer: q.answer }))
  return gridModel(questions, (rows) => (valid(rows) ? apply(fromRows(rows), task.kernel) : null),
    (question, evidence) => checkProbe(question, evidence, (image, kernel) => apply(image, kernel)))
}

const models = { blur: () => blurModel, spectrum: () => spectrumModel, shift: () => shiftModel, filter: filterModel }
export const probeOf = (task) => models[task.experiment ?? 'blur'](task)

/** What a filter probe's data get wrong: its kernel must be the explanation each question calls right. */
export const filterProbeProblems = (task) => (task.experiment !== 'filter' ? [] : task.questions.flatMap((q) => {
  const right = q.options.find((o) => o.id === q.answer)
  if (!right) return [`question answer ${q.answer} is not an option`]
  return differs(fromRows(right.kernel), fromRows(task.kernel)) ? [`the right option (${q.answer}) is not the box’s kernel`] : []
}))
