// A truth-circuit level (《证明完毕》, ../gates.js) as the kernel's circuit screen plays it (../../../shell/CircuitScreen.jsx):
// a card for each letter on the left, the sentence's output on the right, gates as parts. The tests are the rows of the
// sentence's truth table, picked in the table itself, its target column as the play says (../plays.js), and a run goes
// down the table a row at a time, stopping on the first row it gets wrong; a blind puzzle hides the sentence. A gate
// the player built opens to show the board it runs.
import { T } from '../../../shell/i18n.js'
import { parse } from '../formula.js'
import { say } from '../notation.js'
import { countGates, overBudget, runGates } from '../gates.js'
import { gatesPlayFor } from '../plays.js'

const TF = (v) => (v === undefined || v === null ? '—' : v ? T('真', 'T') : T('假', 'F'))

export const gatesScreen = {
  course: (game) => game.logic.truthCircuits,
  play: { runLevel: runGates, show: TF },
  table: gatesPlayFor,
  told: (level) => (level.blind ? null : { label: T('这句话'), text: say(parse(level.target), level.notation) }),
  final: overBudget,
  score: (level, circuit) => ({ steps: countGates(level, circuit) }),
  readouts: (level, circuit) => [{ value: countGates(level, circuit), label: T('门') }, level.budget !== undefined && { value: level.budget, label: T('最多') }],
  says: {
    go: T('逐行运行'),
    done: T('真值表全部正确'),
    pass: T('每一行都正确：这块电路算出了这句话的完整真值表。'),
    fail: T('这一行的结果错误，运行停在这里。板上每个元件显示它在这一行算出的值。'),
  },
  canvas: { height: 110, emptyNote: T('从上方元件栏选择门放到板上，再把元件右侧的圆点连到另一元件左侧的圆点。') },
}
