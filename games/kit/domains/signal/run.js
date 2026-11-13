// Running a signal board on a test (../../engine/circuit-run.js onceRun): the shared engine evaluates it once, with the
// test's inputs bound to the level's inputs, tracing every card it computes (the steps of a run), and every output is
// checked against what the test expects, samples within a hair (values.js same: a board's arithmetic leaves
// binary noise that the player never reads). A wave that misses is not written out sample by sample: the results draw
// it against the one wanted.
//
// runTest(level, circuit, test, partOf) → { values, errors, outputs, trace, fail? }   fail: { name, want, got, why }
// runLevel(level, circuit, partOf) → { runs, pass }   every test of a level on a board
// entries({ task, test, run }) → what the results area can show of a test (../../engine/views.js): each input given
//   (left out by default: the input cards show it), each output against what the test expects
import { onceRun } from '../../engine/circuit-run.js'
import { T } from '../../shell/i18n.js'
import { isWave, same, show } from './values.js'

export { show }

const says = (out, want, got) => (isWave(want) && isWave(got) ? T(`「${out.label.zh ?? out.label}」和应当交出的波形不一样。`, `“${out.label.en ?? out.label}” is not the wave wanted.`) : null)

export const { runTest, runLevel, entries } = onceRun({ same, show, tolerance: 1e-9, says })
