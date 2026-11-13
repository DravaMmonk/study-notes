// Running a __name__ board on a test (../../engine/circuit-run.js onceRun): the shared engine evaluates it once, with the
// test's inputs bound to the level's inputs, tracing every card it computes (the steps of a run), and every output is
// checked against what the test expects.
//
// runTest(level, circuit, test, partOf) → { values, errors, outputs, trace, fail? }   fail: { name, want, got, why }
// runLevel(level, circuit, partOf) → { runs, pass }   every test of a level on a board
// entries({ task, test, run }) → what the results area can show of a test (../../engine/views.js): each input given
//   (left out by default: the input cards show it), each output against what the test expects
import { onceRun } from '../../engine/circuit-run.js'
import { numberText } from '../../engine/number.js'

/** What a card shows of a value: a number, or 「—」. */
export const show = (v) => (v === null || v === undefined ? '—' : typeof v === 'number' ? numberText(v) : String(v))

export const { runTest, runLevel, entries } = onceRun({ show })
