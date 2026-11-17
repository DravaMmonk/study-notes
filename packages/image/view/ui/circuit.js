import { T } from 'kernel/view'
import { valueText } from 'kernel/view'
import { isGrid } from 'kernel/view'
import { checkingTests } from '../../core/engine/graph.js'
import { startBoard, tidyImageBoard } from '../../core/engine/board.js'
import { INPUT_LABELS } from '../../core/words.js'

const VIEW_NAMES = { 'image:view-pixels': 'pixels', 'image:view-terrain': 'surface', 'image:view-slope': 'slope', 'image:view-profile': 'profile', 'image:view-spectrum': 'spectrum' }
const viewName = (name) => VIEW_NAMES[name]

const IMAGE_VIEWS = {
  pixels: { label: T('像素', 'Pixels'), hint: T('亮度显示为灰度', 'Brightness as grey level') },
  surface: { hint: T('亮度显示为高度', 'Brightness as height') },
  slope: { hint: T('箭头指向变亮最快的方向', 'Arrows point where it brightens fastest') },
  profile: { hint: T('一行像素的亮度曲线', 'Brightness along one row') },
  spectrum: { hint: T('各频率分量的强度', 'Strength of each frequency') },
}

function viewsOf(task, value, role) {
  if (value?.h === 1 && value.w > 1 && (value.c ?? 1) === 1) return ['plot']
  const offered = Object.keys(IMAGE_VIEWS).filter((view) => (task.shows ?? ['image:view-pixels']).some((name) => viewName(name) === view))
  const first = viewName(task.views?.[role] ?? (role === 'mid' ? task.views?.out : null) ?? 'image:view-pixels')
  return offered.includes(first) ? [first, ...offered.filter((view) => view !== first)] : offered
}

const rowOf = (task, role, value, name, label, data) => {
  const scalar = value?.w === 1 && value.h === 1 && (value.c ?? 1) === 1
  const reading = (v) => scalar && isGrid(v) ? v.data[0] : v
  return {
    of: name, label, shape: scalar ? 'scalar' : 'grid',
    ...(scalar ? {} : { views: viewsOf(task, value, role) }),
    ...Object.fromEntries(Object.entries(data).map(([key, v]) => [key, ['given', 'got', 'want'].includes(key) ? reading(v) : v])),
  }
}

function entries({ task, test, run, judged }) {
  if (!test) return []
  const many = Object.keys(test.inputs).length > 1
  const inputs = task.inputLabels ?? (many ? INPUT_LABELS : {})
  const tolerance = (test.check ?? task.check)?.tolerance ?? 0.02
  return [
    ...Object.entries(test.inputs).map(([name, value]) => rowOf(task, 'in', value, name, inputs[name] ?? (many ? name : T('输入', 'Input')), { given: value })),
    ...Object.entries(test.expected).map(([name, want]) => rowOf(task, 'out', want, name, task.outputLabels?.[name] ?? T('输出', 'Output'), {
      want, got: run?.outputs[name], tolerance, difference: true, pass: judged ? run?.checks.find((check) => check.name === name)?.pass : null,
    })),
  ]
}

const show = (value) => isGrid(value)
  ? value.w * value.h === 1 && (value.c ?? 1) === 1 ? valueText(value.data[0]) : `${value.w} × ${value.h}${value.c === 3 ? ' · RGB' : ''}`
  : valueText(value)

export function imageCircuit(image, cards) {
  const { kit } = image
  return {
    course: (game) => game.circuit,
    cards,
    play: { runLevel: (task, graph, _partOf, options) => kit.runLevel(task, graph, options), entries, show },
    canvas: { height: 220 },
    fresh: startBoard,
    ready: (board, _task, parts) => tidyImageBoard(board, parts),
    viewControls: (task) => ({ options: IMAGE_VIEWS, fresh: (task.freshViews ?? []).map(viewName) }),
    valueViews: (task, node, value) => viewsOf(task, value, node.type === 'input' ? 'in' : node.type === 'output' ? 'out' : 'mid'),
    readouts(_task, _board, report) {
      const { score } = report
      return [{ value: score.nodes, label: T('元件', 'Parts') }, { value: score.cost, label: T('计算量') },
        score.learned > 0 && { value: score.learned, label: T('参数') }]
    },
    training: {
      rate: (task) => task.trainRates?.[1] ?? task.trainRate ?? 1,
      rates: (task) => task.trainRates,
      has: kit.hasLearnable,
      reset: kit.resetTraining,
      train(task, circuit, rate, steps, workshopParts) {
        const checks = checkingTests(task)
        const history = []
        for (let i = 0; i < steps; i++) {
          const result = kit.trainStep(task, circuit, rate, { backtrack: !task.trainRates, workshopParts })
          circuit = result.graph
          history.push({ train: result.loss, check: checks.length ? kit.lossOn(checks, circuit, workshopParts) : null })
        }
        return { circuit, history }
      },
    },
  }
}
