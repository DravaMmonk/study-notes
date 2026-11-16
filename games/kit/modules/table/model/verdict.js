// How a run of a table board is judged, test by test, and what the fail dialog says (ui/circuitRun.js, and a blind
// session: ../play.js): the answer against the expected one, and on a level whose reference board is known the first
// step (or, scanning in rounds, the first settled cell) where the board's writes differ from it.

import { reportRuns } from '../../../engine/test-run.js';
import { WORLDS } from './worlds.js';
import { MAX_ROUNDS } from './run.js';
import { portsProblem } from './board.js';
import { signal } from './format.js';
import { diagnosisOf } from '../items/conditions.js';
import { explain } from '../items/explains.js';
import { fill } from '../items/labels.js';
import { lazy, tr } from '../lang.js';

/** A test's label: the level's own template, else its world's. */
export const testLabel = (L, V, t) => (L.testLabel ? fill(L.testLabel, t) : V.label(t));

/** First step whose outputs differ from the reference board's; scanning in rounds, the first cell that settled wrong. */
function firstMismatch(run, s, t, res, o) {
  if (!s.solution || s.noTrace) return null
  const ref = run(WORLDS[s.world], t, s.solution, { ...o, traced: false })
  if (ref.error) return null
  if (s.rounds) {
    const key = [...ref.table.keys()].find((x) => res.table.get(x) !== ref.table.get(x))
    if (key === undefined) return null
    const q = res.steps.map((x) => x.at.includes(key)).lastIndexOf(true)
    return { q: q < 0 ? res.steps.length - 1 : q, key, want: ref.table.get(key), got: res.table.get(key) }
  }
  for (let q = 0; q < res.steps.length; q++) {
    const z = res.steps[q].writes.findIndex(([, v], j) => ref.steps[q].writes[j][1] !== v)
    if (z >= 0) return { q, z, want: ref.steps[q].writes[z][1], got: res.steps[q].writes[z][1] }
  }
  return null
}

export function runRobotCase(run, task, board, index, options = task) {
  const t = task.tests[index]
  const res = run(WORLDS[task.world], t, board, options)
  return { t, res, pass: !res.error && res.value === task.expected[index] }
}

/** Judge the robot's answer and any required cell checks. Live and text play can also locate an output mismatch. */
export function inspectRobotCase(run, s, b, k, { traced = false, diagnose = traced } = {}) {
  const options = { ...s, traced }
  const { t, res, pass } = runRobotCase(run, s, b, k, options)
  const compare = b !== s.solution && !res.error && !s.onFail && (s.checkAll || (!pass && diagnose))
  const mm = compare ? firstMismatch(run, s, t, res, options) : null
  const ok = pass && !mm
  const stop = mm && mm.key === undefined ? mm.q + 1 : res.steps?.length ?? 0
  return { t, res, mm, ok, stop, view: { res, k: 0, pass: ok, end: false, halt: Boolean(res.error && !res.error.diverge) || (Boolean(mm) && mm.key === undefined), focus: null, badKey: mm ? mm.key : undefined } }
}

/** A board published as a part must match the task's declared inputs. */
export function robotConstraint(task, board) {
  const publishes = task.builds && task.builds.task === task.taskId
  return task.ports.length || publishes ? portsProblem(board, task.ports) : null
}

/**
 * Why test k of a task failed, as the fail dialog says it: { head, body }, each worded again in the current language
 * when shown.
 */
function whyFailed(task, world, k, test, res, mm) {
  const name = () => testLabel(task, world, test);
  const failed = lazy(() => tr(`测试 ${k + 1} 没通过`, `Test ${k + 1} failed`))
  if (res.error && res.error.diverge) {
    return {
      head: lazy(() => tr('表一直停不下来', 'The table never settles')),
      body: lazy(() => tr(`测试 ${k + 1} 中，机器扫了 ${MAX_ROUNDS} 轮，表还在变。照这块电路板，有些格子会越算越大（或越算越小），永远不会稳定下来。`,
        `In test ${k + 1}, the machine scanned ${MAX_ROUNDS} rounds and the table was still changing. With this circuit board, some cells keep growing (or shrinking) and will never settle down.`)),
    }
  }
  if (res.error) {
    return {
      head: lazy(() => tr('读到了空格子', 'Read an empty cell')),
      body: lazy(() => tr(`测试 ${k + 1} 中，机器算到<b>${world.where(res.error.cell)}</b>时，电路要读<b>${world.name(res.error.key)}</b>，可那里还空着。机器是按「${world.orderText(task)}」的顺序算的，读之前，那个格子必须已经算好。`,
        `In test ${k + 1}, when the machine reached <b>${world.where(res.error.cell)}</b>, the circuit tried to read <b>${world.name(res.error.key)}</b>, but that cell was still empty. The machine works in the order “${world.orderText(task)}”, so a cell must already be computed before anything reads it.`)),
    }
  }
  if (mm && mm.key !== undefined) {
    return {
      head: failed,
      body: lazy(() => tr(`${name()}：表稳定下来以后，<b>${world.name(mm.key)}</b>应该是 <b>${signal(mm.want)}</b>，你的电路板算出了 <b>${signal(mm.got)}</b>。棋盘上标红的就是这一格。`,
        `${name()}: once the table settles, <b>${world.name(mm.key)}</b> should be <b>${signal(mm.want)}</b>, but your circuit board computed <b>${signal(mm.got)}</b>. It is the cell marked in red on the board.`)),
    }
  }
  if (mm) {
    const at = res.steps[mm.q]
    return {
      head: failed,
      body: lazy(() => tr(`${name()}：机器在<b>${world.where(at.cell)}</b>出了错。「${world.outs[mm.z][1]}」应该是 <b>${signal(mm.want)}</b>，你的电路算出了 <b>${signal(mm.got)}</b>。棋盘停在了这一格；电路板上的小数字，是机器在这一格算出的值。`,
        `${name()}: the machine went wrong at <b>${world.where(at.cell)}</b>. “${world.outs[mm.z][1]}” should be <b>${signal(mm.want)}</b>, but your circuit computed <b>${signal(mm.got)}</b>. The board has stopped on this cell; the small numbers on the circuit board are the values the machine computed here.`)),
    }
  }
  const why = () => (task.explain ? explain(task.explain, test, res, task) : '')
  return {
    head: failed,
    body: lazy(() => tr(`${name()}：答案应该是 <b>${signal(task.expected[k])}</b>，机器算出了 <b>${signal(res.value)}</b>。${why()}`, `${name()}: the answer should be <b>${signal(task.expected[k])}</b>, but the machine computed <b>${signal(res.value)}</b>. ${why()}`)),
  }
}

/** Run the same robot checks for both playback and text play. Traces are only needed for playback. */
export function robotReport(runCircuit, task, board, { traced = false, traceCount = Infinity, workshopParts } = {}) {
  const run = (world, test, graph, options) => runCircuit(world, test, graph, { ...options, workshopParts });
  const world = WORLDS[task.world];
  const runs = task.tests.map((test, k) => {
    const report = inspectRobotCase(run, task, board, k, { traced: traced && k < traceCount, diagnose: true });
    const failure = report.ok ? null : whyFailed(task, world, k, test, report.res, report.mm);
    return { report, failure, fail: failure && { why: failure.head } };
  });
  return reportRuns(runs, { constraint: robotConstraint(task, board) });
}

export const robotTestName = (task, test, k) => lazy(() => `${tr('测试', 'Test')} ${k + 1} · ${testLabel(task, WORLDS[task.world], test)}`);

export function missingRobotOutput(task, board) {
  const missing = WORLDS[task.world].outs.find(([id]) => !board.wires.some((wire) => wire.to === id));
  return missing ? tr(`输出口「${missing[1]}」还没接线`, `The output “${missing[1]}” is not wired yet`) : null;
}

export function tutorialFailure(task, k, result) {
  return {
    head: task.onFail.head,
    body: lazy(() => {
      const at = { test: k + 1, want: signal(task.expected[k]), got: signal(result.value) };
      return String(task.onFail.body).replace(/\{(test|want|got)\}/g, (_, key) => at[key]);
    }),
  };
}

export function robotHint(task, board, at) {
  const hints = task.hints ?? [];
  return diagnosisOf(task.diagnose, board) || hints[Math.min(Math.max(at, 0), hints.length - 1)] || null;
}
