/* global process */
// node games/state-graph/js/levels/validate.js — every reference solution passes its tests, and every board a level
// packages as a part runs, as that black box, exactly what the level's tests ask of it.
import { LEVELS } from './index.js';
import { WORLDS } from '../circuit/worlds.js';
import { optionsOf, run } from './reference.js';
import { BLUEPRINTS } from '../circuit/components.js';

let problems = 0, runs = 0;
const bad = msg => { problems++; console.log(`✗ ${msg}`); };


for (const L of LEVELS.filter(x => x.mode === 'circuit')) {
  (L.stages || [L]).forEach((s, k) => {
    const tests = s.tests || L.tests, want = s.expected || L.expected, V = WORLDS[s.world];
    if (!s.solution || !tests) return;
    const o = optionsOf(L, s);
    tests.forEach((t, i) => {
      runs++;
      const r = run(V, t, s.solution, o);
      if (r.error || r.value !== want[i]) bad(`${L.id} stage ${k + 1} test ${i + 1}: the reference gives ${r.error ? JSON.stringify(r.error) : r.value}, expected ${want[i]}`);
    });
  });
  // A challenge's naive board must fail somewhere: the challenge is what it takes beyond the obvious.
  if (L.naive) {
    const s = (L.stages || [L]).at(-1), V = WORLDS[s.world], want = s.expected || L.expected, o = optionsOf(L, s, L.naive);
    runs++;
    if ((s.tests || L.tests).every((t, i) => { const r = run(V, t, L.naive, o); return !r.error && r.value === want[i]; })) bad(`${L.id}: its naive board passes every test`);
  }
  // The black box against the board it stands for: the part alone, wired to the level's sensors, passes the level's
  // tests and writes the same table, cell by cell.
  if (L.blueprint) {
    const s = (L.stages || [L]).at(-1), V = WORLDS[s.world], bp = BLUEPRINTS[`bp:${L.id}`], o = optionsOf(L, s), want = s.expected || L.expected;
    const box = { nodes: [{ id: 'p', kind: `bp:${L.id}`, ...(bp.value !== undefined ? { value: L.blueprint.check ?? bp.value } : {}) }], wires: [...bp.sensors.map((id, k) => (id ? { from: `tap:${id}`, to: `p:${k}` } : null)).filter(Boolean), { from: 'p', to: `out:${bp.out}` }] };
    (s.tests || L.tests).forEach((t, i) => {
      runs++;
      const a = run(V, t, box, o), b = run(V, t, s.solution, o);
      if (a.error || a.value !== want[i]) bad(`${L.id}: its part gives ${a.error ? JSON.stringify(a.error) : a.value} on test ${i + 1}, expected ${want[i]}`);
      else if (b.table && [...b.table].some(([key, v]) => JSON.stringify(a.table.get(key)) !== JSON.stringify(v))) bad(`${L.id}: its part fills the table differently from the level's board on test ${i + 1}`);
    });
  }
}

console.log(problems ? `\n${problems} problem${problems > 1 ? 's' : ''} in ${runs} runs` : `all ${runs} runs ok`);
process.exit(problems ? 1 : 0);
