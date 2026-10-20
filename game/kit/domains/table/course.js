// A course of table levels, from a game's spec: the play order and the tree from its eras (../../course.js layout),
// each level's number, chapter and derived answers (from its reference boards, run the way they are meant to run),
// the boards its levels package as parts, and the course audit's view of it: what each level's board relies on, and
// whether each topic is one problem growing.
import { defineCourse, eraLevels, layout, offer, pathLevels, reach, usable } from '../../course.js';
import { BLUEPRINTS, modelsOf } from './circuit/components.js';
import { ROBOTS } from './circuit/robots.js';
import { WORLDS, runCircuit } from './circuit/worlds.js';
import { visionFig } from './figs.js';
import { lazy, tr } from './i18n.js';
import { optionsOf, run } from './reference.js';
import { gridScene } from './svg.js';

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

/**
 * spec: {
 *   eras        the course's eras, one robot each (games/DESIGN.md 2); a topic has a `code` for its levels' numbers
 *   levels      every level, in any order
 *   retired     levels written but not played
 *   parts       { key: { name, desc } } what solving a level leaves the player (its `unlock`)
 *   primitives  the parts the course starts from
 * }
 * Returns { LEVELS, REQUIRES, PLACE, TRACKS, CHAPTERS, LABELS, PARTS, course, usableIn(L, flags), offerIn(L, flags), topicProblems() }.
 */
export function tableCourse({ eras, levels, retired = [], parts, primitives }) {
  const PARTS = parts;
  /**
   * A level's number, as in CURRICULUM.md: on an era's main path the era and its place ('1-4'; the foundation runs on
   * into the practice), in a topic the topic's letter and its place ('S2'), and C1, C2… for an era's challenges.
   */
  const LABELS = new Map(eras.flatMap((era, e) => [
    ...pathLevels([...era.foundation, ...(era.practice ?? [])]).map((id, k) => [id, `${e}-${k + 1}`]),
    ...(era.topics ?? []).flatMap(t => t.levels.map((id, k) => [id, `${t.code}${k + 1}`])),
    ...(era.challenges ?? []).map((c, k) => [c.level, `C${k + 1}`]),
  ]));

  /** The map's chapters, one per era in play order: named after the era's robot (or the era's own title where there is
   *  none), and its levels. */
  const CHAPTERS = eras.map((era, e) => ({
    era: era.id,
    kicker: lazy(() => tr(`第 ${e} 代`, `Era ${e}`)),
    name: era.machine ? ROBOTS[era.machine].name : era.chapter.title,
    desc: era.chapter.desc,
    levels: eraLevels(era),
  }));

  // The levels in play order, era by era: each era's foundation, then its topics. A level's chapter on the map is its
  // era, and it opens once everything it requires is solved (REQUIRES).
  const plan = layout(eras);
  const ALL = levels.filter(L => !retired.includes(L.id));
  const byId = new Map(ALL.map(L => [L.id, L]));
  const LEVELS = [...plan.order.map(id => byId.get(id)), ...ALL.filter(L => !plan.place.has(L.id))];
  LEVELS.forEach(L => { L.ch = Math.max(0, CHAPTERS.findIndex(s => s.levels.includes(L.id))); });

  /**
   * A circuit level's board becomes a component for later levels: a black box (L.blueprint.f) on the level's ports. A port
   * is the sensor the level's board reads there, or, for a part meant for any table, { label, short, type, sensor }: a
   * name of its own, and the sensor its level wires there (the check in validate.js). blueprint.value: the part carries a
   * number set on its card, starting at this one; f(ins, value) receives it.
   */
  const PORT_TYPE = { num: 'num', bool: 'bool', nums: 'num*', bools: 'bool*', cat: 'cat' };
  function registerBlueprint(L) {
    const last = (L.stages || [L]).at(-1), V = WORLDS[last.world];
    const ports = L.blueprint.ports.map(p => (typeof p === 'string' ? { label: V.sensors[p].label, short: V.sensors[p].short, type: V.sensors[p].type, sensor: p } : p));
    BLUEPRINTS[`bp:${L.id}`] = {
      name: PARTS[L.unlock].name, look: L.unlock, value: L.blueprint.value,
      desc: lazy(() => tr(`你拼出的电路板，现在是一个元件。顶上的输入：${ports.map(p => p.label).join('、')}。`, `The circuit board you built, now a component. Inputs on top: ${ports.map(p => p.label).join(', ')}.`)),
      ins: ports.map(p => PORT_TYPE[p.type] || p.type), labels: ports.map(p => p.short), sensors: ports.map(p => p.sensor ?? null),
      out: V.outs[0][0], outType: V.outs[0][3], f: L.blueprint.f,
    };
  }

  /** The first level that uses a robot model introduces it: the very first one meets you, later ones are upgrades. */
  const met = new Set();
  LEVELS.filter(L => L.mode === 'circuit').forEach(L => {
    if (met.has(L.robot)) return;
    const r = ROBOTS[L.robot], n = 2 * r.vision + 1;
    const upgrade = met.size > 0;
    L.intro = [{
      t: lazy(() => tr(`${upgrade ? '机器人升级了！新型号' : '认识你的机器人'}：<b>「${r.name}」</b>。${r.desc}图里蓝框是它的视野（${n}×${n}），红框是它脚下的格子。`,
        `${upgrade ? 'Robot upgrade! The new model' : 'Meet your robot'}: <b>${r.name}</b>. ${r.desc} In the picture, the blue frames are its view (${n}×${n}) and the red frame is the cell it stands on.`)),
      fig: visionFig(L.robot),
    }, ...L.intro];
    met.add(L.robot);
  });

  LEVELS.forEach((L, i) => {
    if (L.mode === 'fill' && L.grid) {
      const { R, C } = L.grid, g = gridScene(R, C);
      L.cells = g.cells.map(c => ({ id: c.id, x: c.x, y: c.y, grid: true, label: '' }));
      L.edges = g.edges.map(e => [e.a, e.b]);
      L.start = '0,0';
      L.end = `${R - 1},${C - 1}`;
    }
    if (L.mode === 'circuit') {
      // Answers come from the reference board of each stage, run the way the reference is meant to run.
      (L.stages || [L]).forEach(s => {
        if (!s.solution) return;
        const o = { ...s, dirs: L.solutionDirs || {}, ...(s.dial ? { scan: s.solutionScan } : {}), filter: s.solutionFilter || 'all', remember: s.solutionMem || [], layers: s.solution && s.solution.layers, answerLayers: s.solution && s.solution.answerLayers, maxLayers: s.maxLayers };
        s.expected = (s.tests || L.tests).map(t => runCircuit(WORLDS[s.world], t, s.solution, o).value);
      });
      L.expected = (L.stages || [L]).at(-1).expected;
      if (L.blueprint) registerBlueprint(L);
    }
  });

  const course = defineCourse({
    levels: LEVELS.map(L => ({ id: L.id, unlocks: L.unlock ? [L.unlock] : [] })),
    eras,
    primitives,
    adds: l => [...new Set((byId.get(l.id).stages || [byId.get(l.id)]).flatMap(s => s.adds || []))],
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
    // What a level's reference boards use, and what its spec folds away anyway (../../course.js offer).
    needed: l => { const sols = (byId.get(l.id).stages || [byId.get(l.id)]).map(s => s.solution).filter(Boolean); return sols.length ? sols.flatMap(s => s.nodes.map(n => n.kind)) : null; },
    folds: l => byId.get(l.id).fold || [],
  });

  /**
   * A stage's palette is everything it can hold (../../course.js reach): the parts its level brings in up to this stage,
   * then the ones carried from earlier levels.
   */
  LEVELS.filter(L => L.mode === 'circuit').forEach(L => {
    const own = course.adds(L), carried = reach(course, L).filter(k => !own.includes(k));
    let had = [];
    (L.stages || [L]).forEach(s => { had = [...new Set([...had, ...(s.adds || [])])]; s.palette = [...had, ...carried]; });
  });

  /** The parts level L can really offer a player holding `flags` (the shell's: unlocks of solved levels, and grants). */
  const usableIn = (L, flags) => new Set(usable(course, { id: L.id }, flags));
  /** Everything the player has for level L: what it shows, and what it folds away ({ shown, folded }). */
  const offerIn = (L, flags) => offer(course, { id: L.id }, flags);

  /**
   * A topic grows from a small version of its finale: the finale's reference board, run on each earlier circuit level of
   * the topic (same world, same outputs), must pass that level's tests. An earlier level that instead builds one core
   * mechanism alone passes when the part it builds is on the finale's board. Problems as the course audit reports them.
   */
  function topicProblems() {
    const out = [];
    for (const era of eras) {
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

  return { LEVELS, REQUIRES: plan.requires, PLACE: plan.place, TRACKS: plan.tracks, CHAPTERS, LABELS, PARTS, course, usableIn, offerIn, topicProblems };
}
