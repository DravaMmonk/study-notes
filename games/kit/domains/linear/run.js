// Running a linear board on a test (../../engine/circuit-domain.js onceRun): the shared engine evaluates it once, with the
// test's inputs bound to the level's inputs, tracing every card it computes (the steps of a run), and every output is
// checked against what the test expects, entries within a hair (values.js same: a board's arithmetic leaves
// binary noise that the player never reads). A vector and a matrix are grids, drawn in the views the game names.
//
// runTest(level, circuit, test, partOf) → { values, errors, outputs, trace, fail? }   fail: { name, want, got, why }
// runLevel(level, circuit, partOf) → { runs, pass }   every test of a level on a board
// entries({ task, test, run }) → what the results area can show of a test (../../engine/views.js): each input given
//   (left out by default: the input cards show it), each output against what the test expects
import { onceRun } from '../../engine/circuit-domain.js'
import { same, show } from './values.js'

export { show }

export const { runTest, runLevel, entries } = onceRun({ same, show, tolerance: 1e-9 })
