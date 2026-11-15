// The table domain's checks for `npm run check` (../../engine/checks.js), over a game's spec (domain.js): what building
// its course found wrong with the content, every reference board runs its task's tests, every challenge's naive board
// fails one, and every part a level builds is that level's last board: it reads exactly the part's ports, and the part
// alone, wired to the level's sensors, passes the task's tests and fills the same table, cell by cell.

import { sameJson } from '../../engine/json-value.js';
import { inspectRobotCase, robotConstraint, runRobotCase } from './model/verdict.js';
import { playOf } from './plays.js';
import { robotBlueprint } from './model/wiring.js';
import { WORLDS } from './model/worlds.js';

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]: a line about one level names it. */
export function validate({ levels, table }) {
  const { run } = table;
  const out = table.wrong.map(text => ({ text, fail: true }));
  let runs = 0;
  const bad = (level, msg) => out.push({ level, text: msg, fail: true });

  for (const L of levels) {
    const tasks = table.played.get(L.id);
    for (const s of tasks.filter(x => playOf(x).editor === 'circuit')) {
      const where = tasks.length > 1 ? `${L.id} task ${s.taskId}` : L.id;
      if (s.solution) {
        const why = robotConstraint(s, s.solution);
        if (why) bad(L.id, `${where}: ${String(why)}`);
        s.tests.forEach((_, i) => {
          runs++;
          const { res, ok } = inspectRobotCase(run, s, s.solution, i);
          if (!ok) bad(L.id, `${where} test ${i + 1}: the reference gives ${res.error ? JSON.stringify(res.error) : res.value}, expected ${s.expected[i]}`);
        });
      }
      // A challenge's naive board must fail somewhere: the challenge is what it takes beyond the obvious.
      if (s.naive) {
        runs++;
        if (s.tests.every((_, i) => inspectRobotCase(run, s, s.naive, i).ok) && !robotConstraint(s, s.naive)) bad(L.id, `${where}: its naive board passes every test`);
      }
    }
    const builder = L.builds && tasks.find(s => s.taskId === L.builds.task);
    if (builder?.solution && playOf(builder).editor === 'circuit') checkBuilt(L, builder);
  }

  /** The part a level builds against the board it stands for, its task's. */
  function checkBuilt(L, s) {
    const b = table.model.built[L.unlock];
    const consts = s.solution.nodes.filter(n => n.type === 'const');
    if (b.setting !== undefined && (consts.length !== 1 || consts[0].params?.value !== b.setting)) bad(L.id, `${L.id}: a part with a setting (${b.setting}) is built from a board with that one constant`);
    // The part alone, fed what its ports stand for.
    const card = id => (s.given.offers.view.includes(id) ? 'view' : 'facts');
    const args = s.ports.map(p => (p.sensor ? `${card(p.sensor)}.${p.sensor}` : p.input));
    const { read } = robotBlueprint(table.model, s.given, WORLDS[s.world]);
    const box = read([`p = ${L.unlock}${b.setting !== undefined ? `[value=${b.setting}]` : ''}(${args.join(', ')})`, `${b.out} <- p`]);
    s.tests.forEach((_, i) => {
      runs++;
      const { res: a, pass } = runRobotCase(run, s, box, i), { res: ref } = runRobotCase(run, s, s.solution, i);
      if (!pass) bad(L.id, `${L.id}: its part gives ${a.error ? JSON.stringify(a.error) : a.value} on test ${i + 1}, expected ${s.expected[i]}`);
      else if (ref.table && [...ref.table].some(([key, v]) => !sameJson(a.table.get(key), v))) bad(L.id, `${L.id}: its part fills the table differently from the level's board on test ${i + 1}`);
    });
  }

  out.push({ text: `${runs} runs` });
  return out;
}
