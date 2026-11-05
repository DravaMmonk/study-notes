// The table domain's checks for `npm run check` (../../engine/checks.js), over a game's spec (domain.js): what building
// its course found wrong with the content, every reference board runs its task's tests, every challenge's naive board
// fails one, and every part a level builds is that level's last board: it reads exactly the part's ports, and the part
// alone, wired to the level's sensors, passes the task's tests and fills the same table, cell by cell.

import { WORLDS } from './model/worlds.js';
import { fitted, fromText, portsProblem } from './model/board.js';

/** spec: domain.js spec(content). Returns [{ text, fail?, level? }]: a line about one level names it. */
export function validate({ levels, table }) {
  const { run } = table;
  const out = table.wrong.map(text => ({ text, fail: true }));
  let runs = 0;
  const bad = (level, msg) => out.push({ level, text: msg, fail: true });

  for (const L of levels) {
    const tasks = table.played.get(L.id);
    for (const s of tasks.filter(x => x.mode === 'circuit')) {
      const where = tasks.length > 1 ? `${L.id} task ${s.taskId}` : L.id, V = WORLDS[s.world];
      if (s.solution) {
        s.tests.forEach((t, i) => {
          runs++;
          const r = run(V, t, s.solution, s);
          if (r.error || r.value !== s.expected[i]) bad(L.id, `${where} test ${i + 1}: the reference gives ${r.error ? JSON.stringify(r.error) : r.value}, expected ${s.expected[i]}`);
        });
      }
      // A challenge's naive board must fail somewhere: the challenge is what it takes beyond the obvious.
      if (s.naive) {
        runs++;
        if (s.tests.every((t, i) => { const r = run(V, t, s.naive, s); return !r.error && r.value === s.expected[i]; })) bad(L.id, `${where}: its naive board passes every test`);
      }
    }
    if (L.builds && tasks.at(-1).mode === 'circuit') checkBuilt(L, tasks.at(-1));
  }

  /** The part a level builds against the board it stands for, its last task's. */
  function checkBuilt(L, s) {
    const V = WORLDS[s.world], b = table.model.built[L.unlock];
    const why = portsProblem(s.solution, s.ports);
    if (why) bad(L.id, `${L.id}: ${String(why)}`);
    const consts = s.solution.nodes.filter(n => n.type === 'const');
    if (b.setting !== undefined && (consts.length !== 1 || consts[0].params?.value !== b.setting)) bad(L.id, `${L.id}: a part with a setting (${b.setting}) is built from a board with that one constant`);
    // The part alone, fed what its ports stand for.
    const card = id => (s.given.offers.view.includes(id) ? 'view' : 'facts');
    const args = s.ports.map(p => (p.sensor ? `${card(p.sensor)}.${p.sensor}` : p.input));
    const box = fitted(fromText([`p = ${L.unlock}${b.setting !== undefined ? `[value=${b.setting}]` : ''}(${args.join(', ')})`, `${b.out} <- p`], s.given), s.given);
    s.tests.forEach((t, i) => {
      runs++;
      const a = run(V, t, box, s), ref = run(V, t, s.solution, s);
      if (a.error || a.value !== s.expected[i]) bad(L.id, `${L.id}: its part gives ${a.error ? JSON.stringify(a.error) : a.value} on test ${i + 1}, expected ${s.expected[i]}`);
      else if (ref.table && [...ref.table].some(([key, v]) => JSON.stringify(a.table.get(key)) !== JSON.stringify(v))) bad(L.id, `${L.id}: its part fills the table differently from the level's board on test ${i + 1}`);
    });
  }

  out.push({ text: `${runs} runs` });
  return out;
}
