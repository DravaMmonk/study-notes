// 状态之图 as a course (../../../kit/course.js): its eras (eras.js), where it starts, and which part each level builds.
// A board a level packages (its `blueprint`) is built by that level and unlocked by solving it; every other part is
// handed out for now (the course audit lists them).
import { defineCourse, usable } from '../../kit/course.js';
import { modelsOf } from '../../kit/domains/table/circuit/components.js';
import { LEVELS } from './index.js';
import { ERAS } from './eras.js';
import { WORLDS } from '../../kit/domains/table/circuit/worlds.js';
import { optionsOf, run } from '../../kit/domains/table/reference.js';
import { ROBOTS } from '../../kit/domains/table/circuit/robots.js';

/**
 * The parts the course starts from. Dynamic programming is about tables, states and orders, not arithmetic, so the
 * arithmetic and logic are primitives: each enters in a level of its own (the merger and its models, the constant
 * and pass gate together, the block gate, the adder, not, the comparator, the divider, the multiplier). What the
 * player builds are boards, packaged as parts once solved (a level's `blueprint`).
 */
export const PRIMITIVES = ['msum', 'mmin', 'mmax', 'many', 'const', 'pass', 'block', 'add', 'not', 'mul'];

const byId = new Map(LEVELS.map(L => [L.id, L]));
/** Worlds that are one family (circuit/worlds/): the same board, read or scanned another way. */
const FAMILY = { grid: 'grid', gridYes: 'grid', vgrid: 'grid', pic: 'grid', align: 'align', local: 'align', strip: 'line', pile: 'line', coins: 'line', words: 'line', rob1: 'street', rob2: 'street', prefix: 'street', heights: 'street', knap: 'knap', roll: 'knap' };
/**
 * What a level's board relies on (robots.js lists what each robot can do): read from its reference boards, every stage.
 * view and far: cells it reads one or two rings away; facts / heads: its cell's facts, or ones that compare a table's
 * two sequences; arm / sweep / probe: what its arm brings in; cells: several cells written a step; layers, rounds; order:
 * a scan other than row by row from the top left (backwards, by length).
 */
const ROW_WORLDS = new Set(['interval']);
export function usesOf(L) {
  if (L.mode !== 'circuit') return [];
  const out = new Set();
  for (const s of L.stages || [L]) {
    const V = WORLDS[s.world], board = s.solution || L.solution;
    for (const w of board ? board.wires : []) {
      if (!w.from.startsWith('tap:')) continue;
      const m = V.sensors[w.from.slice(4)];
      if (!m) continue;
      if (m.family === 'view') out.add(Math.max(Math.abs(m.at[0]), Math.abs(m.at[1])) > 1 ? 'far' : 'view');
      else if (m.family === 'here') out.add(m.heads ? 'heads' : 'facts');
      else out.add(m.type === 'nums' || m.type === 'bools' ? 'sweep' : s.world === 'keys' || s.world === 'stock' ? 'probe' : 'arm');
    }
    if (V.outs.length > 1) out.add('cells');
    if (V.layers || s.world === 'keys' || s.world === 'stock') out.add('layers');
    if (s.rounds || L.rounds) out.add('rounds');
    const scan = s.scan || L.scan;
    if ((scan && scan !== 'rowTL') || ROW_WORLDS.has(s.world)) out.add('order');
  }
  return [...out];
}

export const course = defineCourse({
  levels: LEVELS.map(L => ({ id: L.id, unlocks: L.unlock ? [L.unlock] : [] })),
  eras: ERAS,
  primitives: PRIMITIVES,
  palette: l => [...new Set((byId.get(l.id).stages || [byId.get(l.id)]).flatMap(s => s.palette || []))],
  needs: p => (p.startsWith('bp:') ? byId.get(p.slice(3))?.unlock ?? null : null),
  builds: l => (byId.get(l.id).blueprint ? [`bp:${l.id}`] : []),
  // A merger's (or a comparator's) models are one part with a setting, 「任一是」 too (the merger for yes / no); a constant
  // comes with the pass gate it feeds.
  concept: p => (p === 'const' ? 'pass' : p === 'many' ? 'msum' : (modelsOf(p) || [p])[0]),
  // A circuit level is played by its robot, in the world of its last stage (a topic keeps to one family of worlds).
  machine: l => byId.get(l.id).robot ?? null,
  uses: l => usesOf(byId.get(l.id)),
  can: m => ROBOTS[m]?.can ?? null,
  world: l => { const L = byId.get(l.id); return L.mode === 'circuit' ? FAMILY[(L.stages || [L]).at(-1).world] ?? (L.stages || [L]).at(-1).world : null; },
  naive: l => Boolean(byId.get(l.id).naive),
});

/** The parts level L can really offer a player holding `flags` (the shell's: unlocks of solved levels, and grants). */
export const usableIn = (L, flags) => new Set(usable(course, { id: L.id }, flags));

/**
 * A topic grows from a small version of its finale: the finale's reference board, run on each earlier circuit level of
 * the topic (same world, same outputs), must pass that level's tests. An earlier level that instead builds one core
 * mechanism alone passes when the part it builds is on the finale's board. Problems as the course audit reports them.
 */
export function topicProblems() {
  const out = [];
  for (const era of ERAS) {
    for (const topic of era.topics ?? []) {
      // The finale is the topic's last circuit level (a board level may follow it, like cutting the seam out).
      const finale = [...topic.levels].reverse().map(id => byId.get(id)).find(L => L.mode === 'circuit'), fs = finale && (finale.stages || [finale]).at(-1);
      if (!fs || finale.mode !== 'circuit' || !fs.solution) continue;
      for (const id of topic.levels.slice(0, topic.levels.indexOf(finale.id))) {
        const L = byId.get(id);
        if (L.mode !== 'circuit') continue;
        if (L.blueprint && fs.solution.nodes.some(n => n.kind === `bp:${id}`)) continue;
        for (const [k, s] of (L.stages || [L]).entries()) {
          const V = WORLDS[s.world], tests = s.tests || L.tests, want = s.expected || L.expected;
          const same = s.world === fs.world || (V.outs.map(o => o[0]).join() === WORLDS[fs.world].outs.map(o => o[0]).join() && FAMILY[s.world] && FAMILY[s.world] === FAMILY[fs.world]);
          if (!same) { out.push({ rule: 'topic-finale', level: id, part: finale.id, text: `the finale ${finale.id} plays in another world` }); break; }
          const o = optionsOf(L, s, fs.solution), bad = tests.findIndex((t, i) => { const r = run(V, t, fs.solution, o); return r.error || r.value !== want[i]; });
          if (bad >= 0) { out.push({ rule: 'topic-finale', level: id, part: finale.id, text: `the finale's board fails stage ${k + 1}, test ${bad + 1}` }); break; }
        }
      }
    }
  }
  return out;
}
