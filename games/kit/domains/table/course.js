// A table game's course, from its content (games/<id>/: game.json, levels, glossary; vocabulary.js says what may be
// in it): the play order and the tree from its eras (../../course.js layout), each level's number, chapter and
// introduction, its tasks as they are played (a circuit task with what its board is given, its palette and its reference
// board), the parts its levels build (each running the board it was built from: a packed part, ../../engine/boards.js),
// and the course audit's view of it. Everything it works out is a new object: the content it reads is never written.

import { packed } from '../../engine/boards.js';
import { inheritedBoard } from '../../shell/progress.js';
import { deepFreeze } from '../../engine/content.js';
import { taskLevels } from '../../engine/tasks.js';
import { trayIn } from '../../engine/trays.js';
import { defineCourse, eraLevels, layout, offer, pathLevels, reach, usable } from '../../course.js';
import { T, hydrate, lazy, tr } from './lang.js';
import { isGiven, modelsOf, partsOf } from './model/parts.js';
import { blank, clone, fitted, fromText, portsProblem, splitSrc, toText } from './model/board.js';
import { ROBOTS } from './model/robots.js';
import { WORLDS, sensorsOf, visibleSensors } from './model/worlds.js';
import { modelOf } from './model/run.js';
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

/** What a task's board may read on each card: the cells its robot sees (in reading order) and what its arm reaches; the
 *  facts the task gives. */
function offersOf(s, robot) {
  const W = WORLDS[s.world];
  const seen = visibleSensors(W, robot.vision).sort((a, b) => W.sensors[a].at[0] - W.sensors[b].at[0] || W.sensors[a].at[1] - W.sensors[b].at[1]);
  return { view: [...seen, ...(robot.arm && !s.noArm ? sensorsOf(W, 'arm') : [])], facts: s.facts };
}

/**
 * What a level's board relies on (robots.js says what each robot can do), from the reference boards of its circuit
 * tasks. view and far: cells it reads one or two rings away; facts / heads: its cell's facts, or ones that compare a
 * table's two sequences; arm / sweep / probe: what its arm brings in; cells: several cells written a step; layers,
 * rounds; order: a scan other than row by row from the top left (backwards, by length).
 */
export function usesOf(tasks) {
  const out = new Set();
  for (const s of tasks) {
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

// The engine finds a packed board's output by its name (params.name): an output node's is its id.
const named = new WeakMap();
const asPacked = b => {
  if (!named.has(b)) named.set(b, { ...b, nodes: b.nodes.map(n => (n.type === 'out' ? { ...n, params: { name: n.id } } : n)) });
  return named.get(b);
};

const isCircuit = T => T.mode === 'circuit';

/**
 * The course of a table game's content (content.js assemble). Returns { LEVELS, played, REQUIRES, PLACE, TRACKS,
 * CHAPTERS, LABELS, PARTS, PRIMITIVES, course, model, run, syncOwn, opening, usableIn(L, flags), offerIn(L, flags),
 * blueprints, wrong }: LEVELS each level in play order with its chapter (`ch`) and its introduction; played its tasks
 * by level id, each the level with the task's fields over it (../../engine/tasks.js taskLevels) and, for a circuit
 * task, what its board is given, its palette, its reference (and naive) board read; model the board model of its parts
 * (model/run.js modelOf: the primitives and the parts its levels build), run a test run that reports a broken board
 * instead of throwing, syncOwn(built) the boards the player passed its building levels with, opening(task, data) the
 * board a task opens on. Everything is the course's own: two courses read in one process never see each other's boards.
 */
export function tableCourse(content) {
  // The content with its texts made bilingual strings (lang.js hydrate), a copy frozen as the content is: what the
  // course works out is built beside it, never written into it.
  const { eras, trays, levels, parts: PARTS, primitives: PRIMITIVES } = deepFreeze(hydrate(content));
  // What building the course finds wrong with its content beyond its schema (validate.js reports it).
  const wrong = [];
  const say = (level, text) => wrong.push(`${level}: ${text}`);
  // Every board the content writes as blueprint text, with how it reads back on its task (domain.js blueprints); the
  // shell keeps a task's board under the task's id.
  const blueprints = [];
  // The parts the levels build (registerBuilt), and the board model over them.
  const built = {};
  const model = modelOf(partsOf(built));
  /** A run that reports a broken board instead of throwing (the checks). */
  const run = (V, t, board, o) => { try { return model.runCircuit(V, t, board, o); } catch (e) { return { error: String(e) }; } };

  // The boards the player passed the building levels with, by level id (the shell's progress.built, kept by task: a
  // level's part runs its last task's board).
  const own = new Map();
  // A kept board is fitted to its task first (a board kept by an older save may lack what the task gives, its output
  // among them). One that does not read exactly the part's ports then (kept from before the part had them) cannot be
  // the part: the part runs the level's reference board until the level is passed again.
  const fits = new WeakMap();
  const ownBoard = (id, s) => {
    const b = own.get(id);
    if (!b) return s.solution;
    if (!fits.has(b)) { const f = fitted(b, s.given); fits.set(b, portsProblem(f, s.ports) ? null : f); }
    return fits.get(b) ?? s.solution;
  };

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
  const given = new Map(levels.map(L => [L.id, L]));
  const ordered = [...plan.order.filter(id => given.has(id)).map(id => given.get(id)), ...levels.filter(L => !plan.place.has(L.id))];
  for (const id of plan.order) if (!given.has(id)) say(id, 'an era names a level that does not exist');

  /** A circuit task as played: its world's defaults, what its board is given (on the last task of a level that builds a
   *  part, the part's ports), and its reference and naive boards read from their blueprint text. */
  function circuitTask(L, s, robot, last, where) {
    const W = WORLDS[s.world];
    const task = { ...s, facts: s.facts ?? [], dirs: s.dirs ?? {}, filter: s.filter ?? 'all', remember: s.remember ?? [] };
    const ports = last && L.builds ? L.builds.ports.map(c => portOf(portCall(c), W)) : [];
    const inputs = { offers: offersOf(task, robot), inputs: ports.filter(p => p.input).map(p => p.input), outs: W.outs.map(o => o[0]) };
    const read = text => fitted(fromText(text, inputs), inputs);
    const board = (text, naive) => {
      try {
        const b = read(text);
        blueprints.push({ level: L.id, task: s.task, key: s.taskId, board: b, write: toText, read, ...(naive ? { naive } : {}) });
        return b;
      } catch (e) {
        say(where, e.en ?? String(e));
        return null;
      }
    };
    // The answers are written out; the reference board is checked against them (validate.js), never the source of them.
    if (s.expected.length !== s.tests.length) say(where, `gives ${s.expected.length} expected answers for ${s.tests.length} tests`);
    if (last && (s.onFail || s.done)) say(where, 'the last task leads on to the next (onFail, done), but no task follows it');
    return { ...task, given: inputs, ports, solution: s.solution && board(s.solution), naive: s.naive && board(s.naive, true) };
  }

  /** A fill task on a grid: the grid's places and roads, from the top left to the bottom right. */
  function gridTask(s) {
    const { R, C } = s.grid, g = gridScene(R, C);
    return { ...s, cells: g.cells.map(c => ({ id: c.id, x: c.x, y: c.y, grid: true, label: '' })), edges: g.edges.map(e => [e.a, e.b]), start: '0,0', end: `${R - 1},${C - 1}` };
  }

  // The robot's own page opens the first level played on it: the very first one meets you, later ones are upgrades.
  const met = new Set();
  const robotPage = L => {
    const r = ROBOTS[L.robot], n = 2 * r.vision + 1, upgrade = met.size > 0;
    met.add(L.robot);
    return {
      t: lazy(() => tr(`${upgrade ? '机器人升级了！新型号' : '认识你的机器人'}：<b>「${r.name}」</b>。${r.desc}图里蓝框是它的视野（${n}×${n}），红框是它脚下的格子。`,
        `${upgrade ? 'Robot upgrade! The new model' : 'Meet your robot'}: <b>${r.name}</b>. ${r.desc} In the picture, the blue frames are its view (${n}×${n}) and the red frame is the cell it stands on.`)),
      fig: visionFig(L.robot),
    };
  };

  // Each level's tasks as read (`read`; their palettes follow once the course is known), its chapter and introduction.
  const read = new Map();
  const LEVELS = ordered.map(L => {
    const tasks = taskLevels(L);
    const circuit = tasks.some(isCircuit);
    if (circuit && !ROBOTS[L.robot]) say(L.id, 'it has circuit tasks but no robot');
    const robot = ROBOTS[L.robot] ?? ROBOTS.scout;
    read.set(L.id, tasks.map((s, k) => {
      const where = tasks.length > 1 ? `${L.id} task ${s.taskId}` : L.id;
      return isCircuit(s) ? circuitTask(L, s, robot, k === tasks.length - 1, where) : s.mode === 'fill' && s.grid ? gridTask(s) : s;
    }));
    if (L.builds) registerBuilt(L, read.get(L.id).at(-1));
    const pages = L.intro.map(page => (page.fig ? { ...page, fig: figure(page.fig) } : page));
    return {
      ...L,
      ch: Math.max(0, CHAPTERS.findIndex(c => c.levels.includes(L.id))),
      intro: circuit && ROBOTS[L.robot] && !met.has(L.robot) ? [robotPage(L), ...pages] : pages,
    };
  });

  /** The part a level builds: its last task's board run as one part (packed), the player's once they pass the level. */
  function registerBuilt(L, s) {
    if (!isCircuit(s)) return say(L.id, 'it builds a part, but its last task is no circuit');
    const W = WORLDS[s.world], ports = s.ports, out = W.outs[0];
    if (!PARTS[L.unlock]) say(L.id, `builds ${L.unlock}, which game.json parts does not name`);
    const index = Object.fromEntries(ports.map((p, k) => [p.sensor ?? p.input, String(k)]));
    const idle = type => (type.startsWith('bool') ? false : null);
    built[L.unlock] = {
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

  const byId = new Map(LEVELS.map(L => [L.id, L]));
  const circuitOf = id => (read.get(id) ?? []).filter(isCircuit);
  const course = defineCourse({
    levels: LEVELS.map(L => ({ id: L.id, unlocks: L.unlock ? [L.unlock] : [] })),
    eras,
    trays,
    tray: l => trayIn(trays, byId.get(l.id).tray),
    primitives: PRIMITIVES,
    adds: l => byId.get(l.id).adds ?? [],
    needs: p => (built[p] ? p : null),
    builds: l => (byId.get(l.id).builds ? [byId.get(l.id).unlock] : []),
    // A merger's models are one part with a setting.
    concept: p => content.concept?.[p] ?? (modelsOf(p) || [p])[0],
    // A circuit level is played by its robot, in the world of its last circuit task (a topic keeps to one family of
    // worlds).
    machine: l => byId.get(l.id).robot ?? null,
    uses: l => usesOf(circuitOf(l.id)),
    can: m => ROBOTS[m]?.can ?? null,
    world: l => { const s = circuitOf(l.id).at(-1); return s ? FAMILY[s.world] ?? s.world : null; },
    naive: l => byId.get(l.id).tasks.some(s => s.naive),
    // What a level's reference boards use (the parts placed, not what the level gives).
    needed: l => { const sols = circuitOf(l.id).map(s => s.solution).filter(Boolean); return sols.length ? sols.flatMap(b => b.nodes.filter(n => !isGiven(n.type)).map(n => n.type)) : null; },
    boards: l => circuitOf(l.id).map(s => s.solution).filter(Boolean),
    showcase: l => byId.get(l.id).showcase ?? null,
    // A level that starts from an earlier level's board (`carry`) requires that level.
    carries: l => (byId.get(l.id).carry ? [byId.get(l.id).carry] : []),
    // A topic's finale is its last circuit level (a board level may follow it, like cutting the seam out). An earlier
    // circuit level of the topic, run in the same world (or one of its family, with the same outputs), is solved by the
    // finale's board; one that instead builds a core mechanism alone is, when its part is on the finale's board.
    finale: topic => {
      const end = [...topic.levels].reverse().find(id => circuitOf(id).length), fs = end && circuitOf(end).at(-1);
      if (!fs?.solution) return null;
      return {
        level: end,
        solves: id => {
          const L = byId.get(id), tasks = circuitOf(id);
          if (!tasks.length || (L.builds && fs.solution.nodes.some(n => n.type === L.unlock))) return null;
          for (const s of tasks) {
            const V = WORLDS[s.world];
            const same = s.world === fs.world || (V.outs.map(o => o[0]).join() === WORLDS[fs.world].outs.map(o => o[0]).join() && FAMILY[s.world] && FAMILY[s.world] === FAMILY[fs.world]);
            if (!same) return `the finale ${end} plays in another world`;
            const bad = s.tests.findIndex((t, i) => { const r = run(V, t, fs.solution, s); return r.error || r.value !== s.expected[i]; });
            if (bad >= 0) return `the finale's board fails ${tasks.length > 1 ? `task ${s.taskId}, ` : ''}test ${bad + 1}`;
          }
          return null;
        },
      };
    },
    abstraction: true,
  });

  // A circuit task's palette is everything it can hold (../../course.js reach): the parts its level brings in, then the
  // ones carried from earlier levels.
  const played = new Map(LEVELS.map(L => {
    const adds = L.adds ?? [], palette = [...adds, ...reach(course, L).filter(k => !adds.includes(k))];
    return [L.id, read.get(L.id).map(s => (isCircuit(s) ? { ...s, palette } : s))];
  }));

  // The shell keeps boards by task (../../shell/progress.js): a level's part runs its last task's.
  const syncOwn = (kept = {}) => {
    own.clear();
    for (const [id, tasks] of played) { const b = kept[tasks.at(-1).taskId]; if (b?.nodes) own.set(id, b); }
  };
  /** The board circuit task `s` opens on before it has one of its own, from the boards the player keeps by task
   *  (`data`): the first task's of a level that starts from another (`carry`) is that level's last task's, a task that
   *  goes on from the task before (`carries`) has that one's, else it is empty; fitted to what the task gives. */
  const opening = (s, progress) => {
    const prior = s.task === 0 ? s.carry && played.get(s.carry)?.at(-1) : s.carries && played.get(s.id)[s.task - 1];
    const from = inheritedBoard(progress, prior);
    return fitted(from?.nodes ? clone(from) : blank(), s.given);
  };

  /** The parts level L can really offer a player holding `flags` (the shell's: the unlocks of solved levels). */
  const usableIn = (L, flags) => new Set(usable(course, { id: L.id }, flags));
  /** Everything the player has for level L: what it shows, and what it folds away ({ shown, folded }). */
  const offerIn = (L, flags) => offer(course, { id: L.id }, flags);

  return { LEVELS, played, REQUIRES: plan.requires, PLACE: plan.place, TRACKS: plan.tracks, CHAPTERS, LABELS, PARTS, PRIMITIVES, course, model, run, syncOwn, opening, usableIn, offerIn, blueprints, wrong };
}
