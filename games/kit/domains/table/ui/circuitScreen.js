import { T } from '../../../shell/i18n.js'
import { fitted } from '../model/board.js'
import { CARDS, PRIMITIVES } from '../model/parts.js'
import { signal } from '../model/format.js'
import { lookIcon } from './looks.js'
import { robotRun, testName } from './circuitRun.js'
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
  ready: (board, _held, task) => withDesktopAnchors(fitted(board, task.given)),
  defaults: (type) => model.hasValue(type) ? { value: model.valueDefault(type) } : {},
  settings: (node, { task }) => model.hasValue(node.type) ? [{
    key: 'value',
    label: T('数值', 'Value'),
    options: (task.consts ?? [0, 1, 2, 3, 4, 5]).map((v) => [v, String(v)]),
    value: node.params?.value ?? model.valueDefault(node.type),
  }] : [],
  play: { runLevel: (task, board) => robotRun(model, task, board), entries: () => [], show: signal },
  testLabel: testName,
  useWorld: useRobotWorld,
  canvas: { height: 170, minFit: 0.62 },
})
