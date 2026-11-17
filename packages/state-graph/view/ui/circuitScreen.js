import { T } from 'kernel/view'
import { fitted } from 'table'
import { CARDS, PRIMITIVES } from 'table'
import { signal } from 'table'
import { lookIcon } from './looks.js'
import { robotTestName } from '../../core/model/verdict.js'
import { robotRun } from './circuitRun.js'
import { withDesktopAnchors } from './board.js'
import { freshBoard, hasSensors } from './circuitCourse.js'
import { useRobotWorld } from './useRobotWorld.js'

const fixedCards = { ...CARDS, out: { name: T('结果', 'Result') }, port: { name: T('输入', 'Input') } }
const cards = Object.fromEntries(Object.entries({ ...PRIMITIVES, ...fixedCards }).map(([type, card]) => [
  type, { ...card, family: 'sg', icon: lookIcon(type) },
]))

export const robotScreenFor = ({ model }) => ({
  course: (game) => game.circuit,
  cards,
  fresh: freshBoard,
  clearable: hasSensors,
  ready: (board, task) => withDesktopAnchors(fitted(board, task.given)),
  defaults: (type) => model.hasValue(type) ? { value: model.valueDefault(type) } : {},
  settings: (node, { task }) => {
    const values = model.valueOptions(node.type, task)
    return values ? [{
      key: 'value',
      label: T('数值', 'Value'),
      options: values.map((v) => [v, String(v)]),
      value: node.params?.value ?? model.valueDefault(node.type),
    }] : []
  },
  play: { runLevel: (task, board, _parts, options) => robotRun(model, task, board, options), entries: () => [], show: signal },
  testLabel: robotTestName,
  useWorld: useRobotWorld,
  canvas: { height: 170, minFit: 0.62 },
})
