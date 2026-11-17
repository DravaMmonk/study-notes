// A machine level (《证明完毕》 chapter 8 on, ../machine.js) as the kernel's circuit screen plays it
// (../../../shell/CircuitScreen.jsx): its inputs down the left, the result on the right, the machine's parts (a game's
// parts.json), the rule parts of its rule books (registered by the course) and the parts the player built (packed
// parts running the boards that built them). A run goes through every test step by step, each card computing a step;
// the results show the test's inputs, what it wants and what reaches the result. Values (equations, proof states,
// clause sets, rules) read as lines of text.
import { T } from 'kernel'
import { withPreset } from 'circuit'
import { runMachine } from '../../core/machine.js'
import { presetFor } from '../../core/work.js'
import { machineReadout, machineTextOf, machineTermOf } from '../../core/circuit-readouts.js'

export const machineScreen = {
  course: (game) => game.logic.machineBoards,
  play: { ...machineReadout, runLevel: (task, board, _parts, options) => runMachine(task, board, { traced: true, ...options }) },
  context: (task) => ({ task, text: machineTextOf(task), term: machineTermOf(task) }),
  // A preset (a level's locked cards) stays on the board whatever is saved.
  ready: (board, task) => withPreset(board, presetFor(task)),
  readouts: (task, _circuit, { score }) => [{ value: score.steps, label: T('元件', 'Parts') }, task.budget !== undefined && { value: task.budget, label: T('最多') }],
  says: { go: T('运行全部测试'), done: T('全部通过', 'All passed') },
  log: true,
  canvas: { height: 150, emptyNote: T('从上方元件栏选择元件放到板上，从「输入」连到「结果」。') },
}
