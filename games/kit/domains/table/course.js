// A table game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and the tree from its eras (../../course.js layout), each level's number and chapter, its
// stages with what each board is given and the answers its reference board gives, the parts its levels build (each
// running the board it was built from: a packed part, ../../engine/boards.js), and the course audit's view of it.

import { packed } from '../../engine/boards.js';
import { defineCourse, eraLevels, layout, offer, pathLevels, reach, usable } from '../../course.js';
import { T, hydrate, lazy, tr } from './lang.js';
import { BUILT, isGiven, modelsOf } from './model/parts.js';
import { fitted, fromText, portsProblem, splitSrc, toText } from './model/board.js';
import { ROBOTS } from './model/robots.js';
import { WORLDS, sensorsOf, visibleSensors } from './model/worlds.js';
import { runCircuit } from './model/run.js';
import { S, validate } from '../../engine/schema.js';
import { worldTest } from './vocabulary.js';
import { gridScene, visionFig } from './model/scene.js';
import { figure } from './items/figures.js';

/** Worlds that are one family: the same board, read or scanned another way. */
const FAMILY = { grid: 'grid', gridYes: 'grid', vgrid: 'grid', pic: 'grid', align: 'align', local: 'align', strip: 'line', pile: 'line', coins: 'line', prefix: 'street', heights: 'street', rob1: 'street', rob2: 'street', knap: 'knap', roll: 'knap' };
const ROW_WORLDS = new Set(['interval']);

/** A port of a built part, from its vocabulary item (vocabulary.js port): its label, short name and type, and the sensor
 *  (or input of the board) it stands for. */
const SIGNAL_PORT = { num: 'num', bool: 'bool', nums: 'num*', bools: 'bool*', cat: 'cat' };
function portOf([name, p], W) {
  const sensor = s => W.sensors[s];
  switch (name) {
    case 'reads': return { label: sensor(p).label, short: sensor(p).short, type: SIGNAL_PORT[sensor(p).type], sensor: p, input: null };
    case 'way': return { label: T(`来路${'一二三四'[p.n - 1]}`, `way in ${p.n}`), short: 'abcd'[p.n - 1], type: 'num', sensor: p.sensor ?? null, input: p.input ?? null };
    case 'start': return { label: T('起点', 'start'), short: T('起', 'start'), type: 'bool', sensor: p.sensor, input: null };
    default: return { label: p.label, short: p.short, type: SIGNAL_PORT[sensor(p.sensor).type], sensor: p.sensor, input: null };
  }
}
const portCall = c => (typeof c === 'string' ? [c, {}] : Object.entries(c)[0]);

/** What a stage's board may read on each card: the cells its robot sees (in reading order) and what its arm reaches; the
 *  facts the stage gives. */
function offersOf(s, robot) {
  const W = WORLDS[s.world];
  const seen = visibleSensors(W, robot.vision).sort((a, b) => W.sensors[a].at[0] - W.sensors[b].at[0] || W.sensors[a].at[1] - W.sensors[b].at[1]);
  return { view: [...seen, ...(robot.arm && !s.noArm ? sensorsOf(W, 'arm') : [])], facts: s.facts };
}

/**
 * What a level's board relies on (robots.js says what each robot can do), from its reference boards, every stage. view
 * and far: cells it reads one or two rings away; facts / heads: its cell's facts, or ones that compare a table's two
 * sequences; arm / sweep / probe: what its arm brings in; cells: several cells written a step; layers, rounds; order: a
 * scan other than row by row from the top left (backwards, by length).
 */
export function usesOf(L) {
  if (L.mode !== 'circuit') return [];
  const out = new Set();
  for (const s of L.stages) {
    const V = WORLDS[s.world];
    for (const w of s.solution?.wires ?? []) {
      const [from, pick] = splitSrc(w.from);
      const m = pick && (from === 'view' || from === 'facts') ? V.sensors[pick] : null;
      if (!m) continue;
      if (m.family === 'view') out.add(Math.max(Math.abs(m.at[0]), Math.abs(m.at[1])) > 1 ? 'far' : 'view');
      else if (m.family === 'here') out.add(m.heads ? 'heads' : 'facts');
      else out.add(m.type === 'nums' || m.type === 'bools' ? 'sweep' : s.world === 'keys' || s.world === 'stock' ? 'probe' : 'arm');
    }
    if (V.outs.length > 1) out.add('cells');
    if (s.world === 'keys' || s.world === 'stock') out.add('layers');
    if (s.rounds) out.add('rounds');
    if ((s.scan && s.scan !== 'rowTL') || ROW_WORLDS.has(s.world)) out.add('order');
  }
  return [...out];
}

/** The boards the player passed the building levels with, by level id (the shell's progress.built: a level's
 *  { stage, boards }, the last stage's board the one its part runs). */
const OWN = new Map();
export function syncOwn(built = {}) {
  OWN.clear();
  for (const [id, kept] of Object.entries(built)) { const b = kept?.boards?.at(-1); if (b?.nodes) OWN.set(id, b); }
}
// A kept board is fitted to its stage first (a board kept by an older save may lack what the stage gives, its output
// among them). One that does not read exactly the part's ports then (kept from before the part had them) cannot be
// the part: the part runs the level's reference board until the level is passed again.
const fits = new WeakMap();
const ownBoard = (id, s) => {
  const b = OWN.get(id);
  if (!b) return s.solution;
  if (!fits.has(b)) { const f = fitted(b, s.given); fits.set(b, portsProblem(f, s.ports) ? null : f); }
  return fits.get(b) ?? s.solution;
};
// The engine finds a packed board's output by its name (params.name): an output node's is its id.
const named = new WeakMap();
const asPacked = b => {
  if (!named.has(b)) named.set(b, { ...b, nodes: b.nodes.map(n => (n.type === 'out' ? { ...n, params: { name: n.id } } : n)) });
  return named.get(b);
};

/**
 * The course of a table game's content (content.js assemble). Returns { LEVELS, REQUIRES, PLACE, TRACKS, CHAPTERS,
 * LABELS, PARTS, PRIMITIVES, course, usableIn(L, flags), offerIn(L, flags), problems(), blueprints, wrong }.
 */
export function tableCourse(content) {
  const { eras, levels, parts: PARTS, primitives: PRIMITIVES } = hydrate(content);
  // What building the course finds wrong with its content beyond its schema (validate.js reports it).
  const wrong = [];
  const say = (level, text) => wrong.push(`${level}: ${text}`);
  // Every board the content writes as blueprint text, with how it reads back on its stage (domain.js blueprints); a
  // stage's board is kept in the level's save as { stage, boards }.
  const blueprints = [];

  /** A level's number, as in CURRICULUM.md: on an era's main path the era and its place ('1-4'), in a topic its letter
   *  and place ('S2'), and C1, C2… for an era's challenges. */
  const LABELS = new Map(eras.flatMap((era, e) => [
    ...pathLevels([...era.foundation, ...(era.practice ?? [])]).map((id, k) => [id, `${e}-${k + 1}`]),
    ...(era.topics ?? []).flatMap(t => t.levels.map((id, k) => [id, `${t.code}${k + 1}`])),
    ...(era.challenges ?? []).map((c, k) => [c.level, `C${k + 1}`]),
  ]));
  /** The map's chapters, one per era: named after its robot (or the era's own title where there is none). */
  const CHAPTERS = eras.map((era, e) => ({
    era: era.id,
    kicker: lazy(() => tr(`第 ${e} 代`, `Era ${e}`)),
    name: era.machine ? ROBOTS[era.machine].name : era.chapter.title,
    desc: era.chapter.desc,
    levels: eraLevels(era),
  }));

  const plan = layout(eras);
  const byId = new Map(levels.map(L => [L.id, L]));
  const LEVELS = [...plan.order.filter(id => byId.has(id)).map(id => byId.get(id)), ...levels.filter(L => !plan.place.has(L.id))];
  for (const id of plan.order) if (!byId.has(id)) say(id, 'an era names a level that does not exist');

  LEVELS.forEach(L => {
    L.ch = Math.max(0, CHAPTERS.findIndex(c => c.levels.includes(L.id)));
    L.intro = L.intro.map(page => (page.fig ? { ...page, fig: figure(page.fig) } : page));
    if (L.mode === 'fill' && L.grid) {
      const { R, C } = L.grid, g = gridScene(R, C);
      Object.assign(L, { cells: g.cells.map(c => ({ id: c.id, x: c.x, y: c.y, grid: true, label: '' })), edges: g.edges.map(e => [e.a, e.b]), start: '0,0', end: `${R - 1},${C - 1}` });
    }
    if (L.mode === 'circuit') stagesOf(L);
  });

  /** A circuit level's stages, each complete: its world and settings, tests, what its board is given, its reference
   *  board and the answers it gives. A level of one stage writes it among its own fields. */
  function stagesOf(L) {
    const robot = ROBOTS[L.robot];
    const written = L.stages ?? [L];
    L.stages = written.map((s, k) => {
      const last = k === written.length - 1;
      const stage = {
        ...s,
        facts: s.facts ?? [],
        tests: s.tests ?? L.tests,
        dirs: s.dirs ?? {},
        filter: s.filter ?? 'all',
        remember: s.remember ?? [],
        checkAll: s.checkAll ?? L.checkAll,
        hints: s.hints ?? L.hints,
      };
      const ports = last && L.builds ? L.builds.ports.map(c => portOf(portCall(c), WORLDS[s.world])) : [];
      stage.given = { offers: offersOf(stage, robot), inputs: ports.filter(p => p.input).map(p => p.input), outs: WORLDS[s.world].outs.map(o => o[0]) };
      if (last) stage.ports = ports;
      const read = text => fitted(fromText(text, stage.given), stage.given);
      const board = (text, naive) => {
        try {
          const b = read(text);
          blueprints.push({ level: L.id, board: b, write: toText, read, ...(naive ? { naive } : {}), save: kept => ({ stage: k, boards: Object.assign(Array(k + 1).fill(null), { [k]: kept }) }) });
          return b;
        } catch (e) {
          say(L.id, e.en ?? String(e));
          return null;
        }
      };
      if (s.solution) stage.solution = board(s.solution);
      if (last && L.naive) L.naiveBoard = board(L.naive, true);
      return stage;
    });
    // The answers are written out; the reference board is checked against them (validate.js), never the source of them.
    L.stages.forEach((s, k) => {
      if (!written[k].tests) for (const p of validate(S.list(worldTest(s.world), { min: 1 }), L.tests)) say(L.id, `tests${p.at === '(root)' ? '' : p.at}: ${p.says} (a test of the ${s.world} world, stage ${k + 1})`);
      if (s.expected.length !== s.tests?.length) say(L.id, `stage ${k + 1} gives ${s.expected.length} expected answers for ${s.tests?.length ?? 0} tests`);
    });
    if (L.builds) registerBuilt(L);
  }

  /** The part a level builds: its board run as one part (packed), on the player's board once they pass the level. */
  function registerBuilt(L) {
    const s = L.stages.at(-1), W = WORLDS[s.world], ports = s.ports, out = W.outs[0];
    if (!PARTS[L.unlock]) say(L.id, `builds ${L.unlock}, which game.json parts does not name`);
    const index = Object.fromEntries(ports.map((p, k) => [p.sensor ?? p.input, String(k)]));
    const idle = type => (type.startsWith('bool') ? false : null);
    BUILT[L.unlock] = {
      name: PARTS[L.unlock]?.name ?? L.unlock, desc: PARTS[L.unlock]?.desc ?? '', level: L.id,
      ins: ports.map(p => p.type), labels: ports.map(p => p.short), portLabels: ports.map(p => p.label), sensors: ports.map(p => p.sensor), inputs: ports.map(p => p.input),
      out: out[0], outType: out[3], setting: L.builds.setting,
      board: () => ownBoard(L.id, s),
      part: {
        ...packed({ circuit: () => asPacked(ownBoard(L.id, s)), inputs: ports.map((_, k) => String(k)), outputs: [out[0]], inside: ctx => ({ ...ctx, ports: index }) }),
        params: L.builds.setting !== undefined ? ['value'] : [],
        idle: port => idle(ports[+port].type),
      },
    };
  }

  // The robot's own page opens the first level played on it: the very first one meets you, later ones are upgrades.
  const met = new Set();
  LEVELS.filter(L => L.mode === 'circuit').forEach(L => {
    if (met.has(L.robot)) return;
    const r = ROBOTS[L.robot], n = 2 * r.vision + 1, upgrade = met.size > 0;
    L.intro = [{
      t: lazy(() => tr(`${upgrade ? '机器人升级了！新型号' : '认识你的机器人'}：<b>「${r.name}」</b>。${r.desc}图里蓝框是它的视野（${n}×${n}），红框是它脚下的格子。`,
        `${upgrade ? 'Robot upgrade! The new model' : 'Meet your robot'}: <b>${r.name}</b>. ${r.desc} In the picture, the blue frames are its view (${n}×${n}) and the red frame is the cell it stands on.`)),
      fig: visionFig(L.robot),
    }, ...L.intro];
    met.add(L.robot);
  });

  const stagesFlat = L => (L.mode === 'circuit' ? L.stages : []);
  const course = defineCourse({
    levels: LEVELS.map(L => ({ id: L.id, unlocks: L.unlock ? [L.unlock] : [] })),
    eras,
    primitives: PRIMITIVES,
    adds: l => [...new Set([...(byId.get(l.id).adds ?? []), ...stagesFlat(byId.get(l.id)).flatMap(s => s.adds ?? [])])],
    needs: p => (BUILT[p] ? p : null),
    builds: l => (byId.get(l.id).builds ? [byId.get(l.id).unlock] : []),
    // A merger's models are one part with a setting.
    concept: p => content.concept?.[p] ?? (modelsOf(p) || [p])[0],
    // A circuit level is played by its robot, in the world of its last stage (a topic keeps to one family of worlds).
    machine: l => byId.get(l.id).robot ?? null,
    uses: l => usesOf(byId.get(l.id)),
    can: m => ROBOTS[m]?.can ?? null,
    world: l => { const L = byId.get(l.id); return L.mode === 'circuit' ? FAMILY[L.stages.at(-1).world] ?? L.stages.at(-1).world : null; },
    naive: l => Boolean(byId.get(l.id).naive),
    // What a level's reference boards use (the parts placed, not what the level gives), and what it folds anyway.
    needed: l => { const sols = stagesFlat(byId.get(l.id)).map(s => s.solution).filter(Boolean); return sols.length ? sols.flatMap(b => b.nodes.filter(n => !isGiven(n.type)).map(n => n.type)) : null; },
    boards: l => stagesFlat(byId.get(l.id)).map(s => s.solution).filter(Boolean),
    folds: l => byId.get(l.id).fold || [],
    showcase: l => byId.get(l.id).showcase ?? null,
    abstraction: true,
  });

  // A stage's palette is everything it can hold (../../course.js reach): the parts its level brings in up to this stage,
  // then the ones carried from earlier levels.
  LEVELS.filter(L => L.mode === 'circuit').forEach(L => {
    const own = course.adds(L), carried = reach(course, L).filter(k => !own.includes(k));
    let had = [...(L.adds ?? [])];
    L.stages.forEach(s => { had = [...new Set([...had, ...(s.adds ?? [])])]; s.palette = [...had, ...carried]; });
  });

  /** The parts level L can really offer a player holding `flags` (the shell's: unlocks of solved levels, and grants). */
  const usableIn = (L, flags) => new Set(usable(course, { id: L.id }, flags));
  /** Everything the player has for level L: what it shows, and what it folds away ({ shown, folded }). */
  const offerIn = (L, flags) => offer(course, { id: L.id }, flags);

  /**
   * The table's own rules, as the course audit reports them. A level that starts from an earlier level's board (`carry`) requires that level. A topic grows from a small
   * version of its finale: the finale's reference board, run on each earlier circuit level of the topic (same world,
   * same outputs), passes that level's tests; an earlier level that instead builds one core mechanism alone passes when
   * the part it builds is on the finale's board.
   */
  function audit() {
    const out = [];
    const before = id => { const seen = new Set(), todo = [...(plan.requires.get(id) ?? [])]; while (todo.length) { const x = todo.pop(); if (!seen.has(x)) { seen.add(x); todo.push(...(plan.requires.get(x) ?? [])); } } return seen; };
    for (const L of LEVELS.filter(x => x.carry)) if (!before(L.id).has(L.carry)) out.push({ rule: 'carry-unseen', level: L.id, part: L.carry });
    for (const era of eras) {
      for (const topic of era.topics ?? []) {
        // The finale is the topic's last circuit level (a board level may follow it, like cutting the seam out).
        const finale = [...topic.levels].reverse().map(id => byId.get(id)).find(L => L?.mode === 'circuit'), fs = finale?.stages.at(-1);
        if (!fs?.solution) continue;
        for (const id of topic.levels.slice(0, topic.levels.indexOf(finale.id))) {
          const L = byId.get(id);
          if (L?.mode !== 'circuit') continue;
          if (L.builds && fs.solution.nodes.some(n => n.type === L.unlock)) continue;
          for (const [k, s] of L.stages.entries()) {
            const V = WORLDS[s.world];
            const same = s.world === fs.world || (V.outs.map(o => o[0]).join() === WORLDS[fs.world].outs.map(o => o[0]).join() && FAMILY[s.world] && FAMILY[s.world] === FAMILY[fs.world]);
            if (!same) { out.push({ rule: 'topic-finale', level: id, part: finale.id, text: `the finale ${finale.id} plays in another world` }); break; }
            const bad = s.tests.findIndex((t, i) => { const r = run(V, t, fs.solution, s); return r.error || r.value !== s.expected[i]; });
            if (bad >= 0) { out.push({ rule: 'topic-finale', level: id, part: finale.id, text: `the finale's board fails stage ${k + 1}, test ${bad + 1}` }); break; }
          }
        }
      }
    }
    return out;
  }

  return { LEVELS, REQUIRES: plan.requires, PLACE: plan.place, TRACKS: plan.tracks, CHAPTERS, LABELS, PARTS, PRIMITIVES, course, usableIn, offerIn, problems: audit, blueprints, wrong };
}

/** A run that reports a broken board instead of throwing (the checks). */
export const run = (V, t, board, o) => { try { return runCircuit(V, t, board, o); } catch (e) { return { error: String(e) }; } };
