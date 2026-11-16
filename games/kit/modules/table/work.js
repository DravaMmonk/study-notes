// A table game's course, from its course configuration and content package ( vocabulary.js says what may be
// in it): the play order and the tree from its eras (../../course.js layout), each level's number, chapter and
// introduction, its tasks as they are played (a circuit task with what its board is given, its palette and its reference
// board), the parts its levels build (each running the board it was built from: a packed part, ../../engine/boards.js),
// and the course audit's view of it. Everything it works out is a new object: the content it reads is never written.

import { splitSource } from '../../engine/wire-source.js';
import { packed } from '../../engine/boards.js';
import { previousCircuitTask } from '../../engine/board-view.js';
import { keptBoards } from '../../engine/kept-boards.js';
import { workshopOf } from '../../circuit/workshop-view.js';
import { inheritedBoard } from '../../shell/progress.js';
import { deepFreeze } from '../../engine/content.js';
import { taskLevels } from '../../engine/tasks.js';
import { readWorks, publicationEvents } from '../../engine/course-model.js';
import { eraLevels, levelLabels, offer, reach } from '../../course.js';
import { courseLayout } from '../../engine/course-dependencies.js';
import { T, hydrate, lazy, tr } from './lang.js';
import { builtPieces, publications, settingsOf } from '../../engine/pieces.js';
import { isGiven, modelsOf, partsOf, PRIMITIVES as primitiveParts } from './model/parts.js';
import { blank, fitted, portsProblem } from './model/board.js';
import { restoreRobotBoard, robotBlueprint } from './model/wiring.js';
import { ROBOTS } from './model/robots.js';
import { WORLDS, sensorsOf, visibleSensors } from './model/worlds.js';
import { modelOf } from './model/run.js';
import { gridScene, visionFig } from './model/scene.js';
import { figure } from './items/figures.js';

/** Worlds that are one family: the same board, read or scanned another way. */
const ROW_WORLDS = new Set(['table:world-interval']);

/** A port of a built part, from its vocabulary item (vocabulary.js port): its label, short name and type, and the sensor
 *  (or input of the board) it stands for. */
const SIGNAL_PORT = { 'circuit:number': 'circuit:number', 'circuit:boolean': 'circuit:boolean', 'table:numbers': 'table:number-input', 'table:booleans': 'table:boolean-input', 'table:category': 'table:category' };
function portOf([name, p], W) {
  const sensor = s => W.sensors[s];
  switch (name) {
    case 'table:port-reads': return { label: sensor(p).label, short: sensor(p).short, type: SIGNAL_PORT[sensor(p).type], sensor: p, input: null };
    case 'table:port-way': return { label: T(`来路${'一二三四'[p.n - 1]}`, `way in ${p.n}`), short: 'abcd'[p.n - 1], type: 'circuit:number', sensor: p.sensor ?? null, input: p.input ?? null };
    case 'table:port-start': return { label: T('起点', 'start'), short: T('起', 'start'), type: 'circuit:boolean', sensor: p.sensor, input: null };
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
      const [from, pick] = splitSource(w.from);
      const m = pick && (from === 'view' || from === 'facts') ? V.sensors[pick] : null;
      if (!m) continue;
      if (m.family === 'view') out.add(Math.max(Math.abs(m.at[0]), Math.abs(m.at[1])) > 1 ? 'far' : 'view');
      else if (m.family === 'here') out.add(m.heads ? 'heads' : 'facts');
      else out.add(m.type === 'table:numbers' || m.type === 'table:booleans' ? 'sweep' : s.world === 'table:world-keys' || s.world === 'table:world-stock' ? 'probe' : 'arm');
    }
    if (V.outs.length > 1) out.add('cells');
    if (s.world === 'table:world-keys' || s.world === 'table:world-stock') out.add('layers');
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

const isCircuit = T => T.mode === 'table:circuit';

/**
 * The course of a table game's content (content.js assemble). Returns { LEVELS, played, REQUIRES, PLACE, TRACKS,
 * CHAPTERS, LABELS, PARTS, PRIMITIVES, course, model, run, syncOwn, opening, offerIn(L, flags),
 * blueprints, wrong }: LEVELS each level in play order with its chapter (`ch`) and its introduction; played its tasks
 * by level id, each the level with the task's fields over it (../../engine/tasks.js taskLevels) and, for a circuit
 * task, what its board is given, its palette, its reference (and naive) board read; model the board model of its parts
 * (model/run.js modelOf: the primitives and the parts its levels build), run a test run that reports a broken board
 * instead of throwing, syncOwn(built) the boards the player passed its building levels with, opening(task, data) the
 * board a task opens on. Everything is the course's own: two courses read in one process never see each other's boards.
 */
export const tableWorks = (content) => readWorks(content, prepareTableWorks)

export function* prepareTableWorks(content) {
  // The content with its texts made bilingual strings (lang.js hydrate), a copy frozen as the content is: what the
  // course works out is built beside it, never written into it.
  const hydrated = deepFreeze(hydrate(content));
  const { eras, primitives: PRIMITIVES } = hydrated;
  // What building the course finds wrong with its content beyond its schema (validate.js reports it).
  const wrong = [];
  const say = (level, text) => wrong.push(`${level}: ${text}`);
  // An implementation with ports is a robot circuit. Other piece entries are ideas taught by a task.
  const pieces = builtPieces(hydrated.partDefs);
  const PARTS = Object.fromEntries(Object.entries(pieces).map(([type, p]) => [type, { name: p.name, desc: p.desc }]));
  const levelOf = new Map(hydrated.levels.flatMap(L => L.tasks.map(t => [t.id, L])));
  const unlocking = new Map();
  const implementations = publications(hydrated.levels, pieces);
  for (const entry of implementations) if (entry.task) {
    const L = levelOf.get(entry.task);
    if (unlocking.has(L.id)) say(L.id, `it unlocks both ${unlocking.get(L.id).type} and ${entry.type}`);
    else unlocking.set(L.id, entry);
  }
  const levels = hydrated.levels.map(L => {
    const award = unlocking.get(L.id);
    return award ? { ...L, unlock: award.type, ...(award.reference.ports ? { builds: { task: award.task } } : {}) } : L;
  });
  // Every board the content writes as blueprint text, with how it reads back on its task (domain.js blueprints); the
  // shell keeps a task's board under the task's id.
  const blueprints = [];
  // The parts the levels build (registerBuilt), and the board model over them.
  const built = {};
  const model = modelOf(partsOf(built, hydrated.partDefs));
  /** A run that reports a broken board instead of throwing (the checks). */
  const run = (V, t, board, o) => { try { return model.runCircuit(V, t, board, o); } catch (e) { return { error: String(e) }; } };

  // A stored board that still fits the published interface takes precedence over the package's reference.
  const publishingTasks = new Set();
  const own = keptBoards(key => publishingTasks.has(key));
  const fits = new WeakMap();
  const ownBoard = (task, artifact) => {
    const b = own.board(task);
    if (!b) return artifact.solution();
    if (!fits.has(b)) {
      const view = workshopOf(b)?.view;
      const active = view && { parts: view.board.wiring(artifact, view), knows: view.partOf };
      const fitted = restoreRobotBoard(model, artifact, b, active);
      fits.set(b, fitted && !portsProblem(fitted, artifact.ports) ? fitted : null);
    }
    return fits.get(b) ?? artifact.solution();
  };

  const LABELS = levelLabels(eras);
  /** The map's chapters, one per era: named after its robot (or the era's own title where there is none). */
  const CHAPTERS = eras.map((era, e) => ({
    era: era.id,
    kicker: lazy(() => tr(`第 ${e} 代`, `Era ${e}`)),
    name: era.machine ? ROBOTS[era.machine].name : era.chapter.title,
    desc: era.chapter.desc,
    levels: eraLevels(era),
  }));

  const plan = courseLayout(content);
  const given = new Map(levels.map(L => [L.id, L]));
  for (const entry of implementations) if (entry.reference.ports) registerBuilt(entry);
  const ordered = plan.order.filter(id => given.has(id)).map(id => given.get(id));
  for (const id of plan.order) if (!given.has(id)) say(id, 'an era names a level that does not exist');

  /** A circuit task as played: its world's defaults, what its board is given (on a task that builds a part, the part's
   *  ports), and its reference and naive boards read from their blueprint text. */
  function circuitTask(L, s, robot, last, where) {
    const W = WORLDS[s.world];
    const task = { ...s, facts: s.facts ?? [], dirs: s.dirs ?? {}, filter: s.filter ?? 'all', remember: s.remember ?? [] };
    const ports = (s.ports ?? []).map(c => portOf(portCall(c), W));
    const inputs = { offers: offersOf(task, robot), inputs: ports.filter(p => p.input).map(p => p.input), outs: W.outs.map(o => o[0]) };
    const { read, write } = robotBlueprint(model, inputs, W);
    const board = (text, naive) => {
      try {
        const b = read(text);
        blueprints.push({ level: L.id, task: s.task, key: s.taskId, board: b, write, read, ...(naive ? { naive } : {}) });
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
    const tasks = taskLevels(L, content.taskPositions);
    const circuit = tasks.some(isCircuit);
    if (circuit && !ROBOTS[L.robot]) say(L.id, 'it has circuit tasks but no robot');
    const robot = ROBOTS[L.robot] ?? ROBOTS['table:robot-scout'];
    read.set(L.id, tasks.map((s, k) => {
      const where = tasks.length > 1 ? `${L.id} task ${s.taskId}` : L.id;
      return isCircuit(s) ? circuitTask(L, s, robot, k === tasks.length - 1, where) : s.mode === 'table:fill' && s.grid ? gridTask(s) : s;
    }));
    const pages = L.intro.map(page => (page.fig ? { ...page, fig: figure(page.fig) } : page));
    return {
      ...L,
      ch: Math.max(0, CHAPTERS.findIndex(c => c.levels.includes(L.id))),
      intro: circuit && ROBOTS[L.robot] && !met.has(L.robot) ? [robotPage(L), ...pages] : pages,
    };
  });

  /** Register a package circuit by its own interface. A publishing task can supply the stored board. */
  function registerBuilt({ type, task, level, reference }) {
    const W = WORLDS[reference.world];
    const robot = ROBOTS[reference.robot];
    if (!W || !robot) return say('pieces.json', `${type} needs a valid reference world and robot`);
    if (built[type]) return say('pieces.json', `${type} defines more than one robot circuit`);
    const out = W.outs[0];
    const source = levelOf.get(task)?.tasks.find(s => s.id === task);
    const labels = source?.ports?.map(c => portOf(portCall(c), W));
    const ports = reference.ports.map((c, index) => {
      const port = portOf(portCall(c), W);
      return labels?.[index]?.sensor === port.sensor && labels?.[index]?.input === port.input
        ? { ...port, label: labels[index].label, short: labels[index].short } : port;
    });
    const declaration = pieces[type];
    if (declaration.inputs?.length !== ports.length || declaration.inputs.some((port, index) => port.type !== ports[index].type)) {
      return say('pieces.json', `${type} input types do not match its reference ports`);
    }
    if (declaration.outputType !== out[3]) return say('pieces.json', `${type} output type does not match its reference world`);
    const given = {
      offers: offersOf({ ...reference, facts: reference.facts ?? [] }, robot),
      inputs: ports.filter(p => p.input).map(p => p.input),
      outs: W.outs.map(o => o[0]),
    };
    let board;
    const artifact = { ...reference, given, ports, solution: () => (board ??= robotBlueprint(model, given, W).read(reference.solution)) };
    const index = Object.fromEntries(ports.map((p, k) => [p.sensor ?? p.input, String(k)]));
    const idle = type => (type.startsWith('circuit:boolean') ? false : null);
    const setting = settingsOf(pieces[type]).find(x => x.key === 'value')?.default;
    const running = () => ownBoard(task, artifact);
    built[type] = {
      ...PARTS[type], level, artifact, setting,
      ins: declaration.inputs.map(p => p.type), labels: ports.map(p => p.short), portLabels: ports.map(p => p.label), sensors: ports.map(p => p.sensor), inputs: ports.map(p => p.input),
      out: out[0], outType: declaration.outputType,
      part: packed({
        circuit: () => asPacked(running()),
        inputs: ports.map((_, k) => String(k)),
        outputs: [out[0]],
        parts: model.partOf,
        inside: ctx => ({ ...ctx, ports: index }),
        ...(setting !== undefined && { params: ['value'], defaults: { value: setting } }),
        idle: port => idle(ports[+port].type),
      }),
    };
  }

  for (const [type, part] of Object.entries(built)) {
    try { part.artifact.solution(); }
    catch (error) { say('pieces.json', `${type}: ${error.en ?? error.message}`); }
  }

  const byId = new Map(LEVELS.map(L => [L.id, L]));
  const circuitOf = id => (read.get(id) ?? []).filter(isCircuit);
  const course = yield {
    levels: LEVELS.map(L => ({ ...L, unlocks: L.unlock ? [L.unlock] : [] })), plan,
    publications: publicationEvents(content.levels, implementations.filter(entry => built[entry.type]), content.taskPositions),
    concepts: Object.fromEntries([...Object.keys(primitiveParts), ...Object.keys(pieces)].map(p => [p, (modelsOf(p) || [p])[0]])),
    machine: l => byId.get(l.id).robot ?? null,
    uses: l => usesOf(circuitOf(l.id)),
    can: m => ROBOTS[m]?.can ?? null,
    needed: l => { const sols = circuitOf(l.id).filter(s => l.task === undefined || s.task === l.task).map(s => s.solution).filter(Boolean); return sols.length ? sols.flatMap(b => b.nodes.filter(n => !isGiven(n.type)).map(n => n.type)) : null; },
    boards: l => circuitOf(l.id).map(s => s.solution).filter(Boolean),
  };

  // A circuit task's palette is everything it can hold (../../course.js reach): the parts its level brings in, then the
  // ones carried from earlier levels.
  const played = new Map(LEVELS.map(L => {
    const adds = L.adds ?? [], palette = [...adds, ...reach(course, L).filter(k => !adds.includes(k))];
    return [L.id, read.get(L.id).map(s => (isCircuit(s) ? { ...s, palette } : s))];
  }));

  for (const { task, level } of implementations) if (played.has(level)) publishingTasks.add(task);
  /** The board circuit task `s` opens on before it has one of its own, from the boards the player keeps by task
   *  (`data`): the first task's of a level that starts from another (`carry`) is that level's last task's, a task that
   *  goes on from the task before (`carries`) has that one's, else it is empty; fitted to what the task gives. */
  const opening = (s, progress, active) => {
    const prior = s.task === 0 || s.carries ? previousCircuitTask(s, (id) => played.get(id)) : undefined;
    const from = inheritedBoard(progress, prior);
    return restoreRobotBoard(model, s, from, active) ?? fitted(blank(), s.given);
  };

  /** All usable types, with each switchable family shown as one tray item. */
  const offerIn = (level, flags) => {
    const { shown, folded, types } = offer(course, { id: level.id, task: level.task }, flags);
    const first = (type) => {
      const models = modelsOf(type);
      return !models || type === types.find((name) => models.includes(name));
    };
    return { shown: shown.filter(first), folded: folded.filter(first), types };
  };

  /** Settings offered by open tasks on the selected robot, in their actual playable forms. */
  const settingsIn = (type, { scope, flags, open }) => {
    const tasks = [...played.values()].flat().filter(s => isCircuit(s) && (!scope || s.robot === scope) && open(s));
    const available = tasks.map(task => ({ task, types: offerIn(task, flags).types }));
    const merger = modelsOf(type);
    if (merger) {
      const values = merger.filter(mode => available.some(({ types }) => types.includes(mode)));
      return values.length ? [{
        key: 'model', label: T('模式', 'Mode'),
        values: values.map(value => ({ value, label: model.def(value).tag })),
      }] : [];
    }
    const values = [...new Set(available.filter(({ types }) => types.includes(type))
      .flatMap(({ task }) => model.valueOptions(type, task) ?? []))];
    return values.length ? [{ key: 'value', label: T('数值', 'Value'), values: values.map(value => ({ value, label: String(value) })) }] : [];
  };

  return { LEVELS, played, REQUIRES: plan.requires, PLACE: plan.place, TRACKS: plan.tracks, ROWS: plan.rows, CHAPTERS, LABELS, PARTS, PRIMITIVES, course, model, run, syncOwn: own.sync, opening, offerIn, settingsIn, blueprints, wrong };
}
