import { resolve } from 'node:path'
// The table board as content and saves hold it: blueprint text both ways, fitting a board to its task, the checks on
// a board that becomes a part; a course read of every table game leaves its content as it was; a save of a level's
// stages moves to its tasks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainBoard } from '../../engine/contract.js';
import { readStarter } from '../../engine/content-node.js';
import { print, read, readLines } from '../../circuit/text.js';
import { workshopView } from '../../circuit/workshop-view.js';
import { tableWorks } from './work.js';
import { fitted, portsProblem } from './model/board.js';
import { modelOf } from './model/run.js';
import { partsOf } from './model/parts.js';
import { restoreRobotBoard, robotBlueprint, wiring } from './model/wiring.js';
import { WORLDS } from './model/worlds.js';
import { ROBOTS } from './model/robots.js';
import { robotWindow } from './ui/robotDrawing.js';
import { inspectRobotCase, robotConstraint } from './model/verdict.js';
import { validate } from './validate.js';

const given = { offers: { view: ['up', 'left'], facts: ['start', 'rock'] }, inputs: [], outs: ['cell'] };

const model = modelOf(partsOf({}));
const world = {
  sensors: { up: { type: 'circuit:number' }, left: { type: 'circuit:number' }, start: { type: 'circuit:boolean' }, rock: { type: 'circuit:boolean' } },
  outs: [['cell', 'Cell', '', 'circuit:number']],
};
const blueprint = robotBlueprint(model, given, world);

test('author checks use intermediate cells when the task grades the entire table', () => {
  const solution = { cell: 4 };
  const naive = { cell: 3 };
  const task = { mode: 'table:circuit', world: 'table:world-grid', ports: [], tests: [{}], expected: [8], solution, naive, checkAll: true };
  const run = (_world, _test, board) => ({ value: 8, steps: [{ writes: [['cell', board.cell]] }] });
  assert.equal(inspectRobotCase(run, task, naive, 0).ok, false);
  assert.equal(inspectRobotCase(run, task, naive, 0, { traced: true }).ok, false);
  const levels = [{ id: 'example' }];
  const check = (task) => validate({ levels, table: { run, wrong: [], played: new Map([['example', [task]]]) } });
  assert.deepEqual(check(task), [{ text: '2 runs' }]);
  assert.match(check({ ...task, checkAll: false })[0].text, /naive board passes every test/);
});

test('the robot window shows intrinsic sweep values and recorded table values', () => {
  const world = WORLDS['table:world-pieces'];
  const picture = robotWindow({
    world, test: { s: 'cats', dict: { cats: 0, ats: 2 } }, robot: ROBOTS['table:robot-broom'],
    task: { facts: [], given: { offers: { view: ['seg', 'cost'], facts: [] } } },
    cell: { i: 4, id: '4' }, shown: new Map([['0', 5], ['1', null]]), reads: new Set(['0', '2']),
    empty: new Set(['2']), lit: ['cost'],
  });
  const [prior, cost] = picture.win.arm.sweeps;
  assert.deepEqual(cost.cells.map(({ value }) => value), ['0', '2', '—', '—']);
  assert.deepEqual(prior.cells.map(({ value, state }) => [value, state]), [['5', 'read'], ['—', ''], ['', 'empty'], ['', '']]);
});

test('blueprint text reads into a board and writes back the same', () => {
  const lines = ['m = table:msum(view.up, view.left)', 'k = table:const[value=1]()', 'g = table:pass(facts.start, k)', 's = table:msum(m, g)', 'cell <- s'];
  const b = blueprint.read(lines);
  assert.deepEqual(b.nodes.find(n => n.id === 'view').params.picks, ['up', 'left']);
  assert.deepEqual(b.nodes.find(n => n.id === 'facts').params.picks, ['start']);
  assert.deepEqual(b.nodes.find(n => n.id === 'k').params, { value: 1 });
  assert.deepEqual(b.wires.find(w => w.to === 'cell'), { from: 's', to: 'cell', port: 'in' });
  const written = blueprint.write(b);
  assert.deepEqual(written.slice(0, 2), ['view[picks=[up, left]]()', 'facts[picks=[start]]()']);
  assert.deepEqual(plainBoard(blueprint.read(written)), plainBoard(b));
  assert.deepEqual(blueprint.write(blueprint.read(written)), written);
});

test('blueprint text names the line it cannot read', () => {
  assert.throws(() => blueprint.read(['m = table:msum(view.down)', 'cell <- m']), e => e.line === 1 && /down/.test(e.en));
  assert.throws(() => blueprint.read(['cell <- nope']), e => e.line === 1);
});

test('robot blueprints refuse a second wire, sink sources and unavailable sensor settings', () => {
  assert.throws(() => blueprint.read(['cell <- view.up', 'cell <- view.left']), e => e.line === 2 && /takes two wires/.test(e.en));
  assert.throws(() => blueprint.read(['m = table:mmin(cell)']), e => e.line === 1 && /has no output/.test(e.en));
  assert.throws(() => blueprint.read(['view[picks=up]()']), e => e.line === 1 && /must be a list/.test(e.en));
  assert.throws(() => blueprint.read(['view[picks=[down]]()']), e => e.line === 1 && /down/.test(e.en));
  assert.throws(() => blueprint.read(['cell <- facts.start']), e => e.line === 1 && /bool|yes/i.test(e.en));
  const withUnused = blueprint.read(['view[picks=[left, up]]()', 'cell <- view.up']);
  assert.deepEqual(withUnused.nodes[0].params.picks, ['up', 'left']);
  assert.deepEqual(blueprint.read(blueprint.write(withUnused)), withUnused);
});

test('a grouped merger stays available to blueprints under each unlocked model', () => {
  const content = readStarter(resolve(import.meta.dirname, '../../templates', import.meta.dirname.split('/').at(-1)));
  content.primitives = [...content.primitives, 'table:mmin'];
  const merge = content.levels.find((level) => level.id === 'starter/merge');
  merge.adds = [...merge.adds, 'table:mmin'];
  const course = tableWorks(content);
  const task = course.played.get('starter/merge')[0];
  const { shown, folded, types } = course.offerIn(task, new Set());
  assert.deepEqual([...shown, ...folded].filter((type) => type === 'table:msum' || type === 'table:mmin'), ['table:msum']);
  assert.deepEqual(types.filter((type) => type === 'table:msum' || type === 'table:mmin'), ['table:msum', 'table:mmin']);
  const start = fitted({ nodes: [], wires: [] }, task.given);
  const parts = wiring(course.model, { ...WORLDS[task.world], offers: task.given.offers });
  const board = readLines(['m = table:mmin(view.up, view.left)', 'cell <- m'], start, parts, types);
  assert.equal(board.nodes.find((node) => node.id === 'm')?.type, 'table:mmin');
  assert.throws(() => readLines(['m = table:mmax(view.up)'], start, parts, types), (error) => error.line === 1 && /not available/.test(error.en));
});

test('a fitted board reads each sensor on the card that offers it, and drops what its task lacks', () => {
  const b = {
    nodes: [{ id: 'view', type: 'view', params: { picks: ['left', 'start', 'gone'] }, x: 5, y: 6 }, { id: 'm', type: 'table:msum' }, { id: 'old', type: 'out' }],
    wires: [{ from: 'view#start', to: 'm', port: '0' }, { from: 'view#gone', to: 'm', port: '1' }, { from: 'm', to: 'old', port: 'in' }],
  };
  const f = fitted(b, given);
  assert.deepEqual(f.nodes.map(n => n.id), ['view', 'facts', 'cell', 'm']);
  assert.deepEqual(f.nodes[0], { id: 'view', type: 'view', params: { picks: ['left'] }, x: 5, y: 6 });
  assert.deepEqual(f.nodes[1].params.picks, ['start']);
  assert.deepEqual(f.wires, [{ from: 'facts#start', to: 'm', port: '0' }]);
});

test('a board that becomes a part reads exactly its ports', () => {
  const ports = [{ sensor: 'up', label: 'up' }, { sensor: 'left', label: 'left' }, { input: 'way3', label: 'way in 3' }];
  const read = robotBlueprint(model, { ...given, inputs: ['way3'] }, world).read;
  assert.equal(portsProblem(read(['m = table:mmin(view.up, view.left, way3)', 'cell <- m']), ports), null);
  const readsSensor = blueprint.read(['cell <- view.up']);
  assert.equal(robotConstraint({ ports: [], taskId: 'example' }, readsSensor), null);
  assert.ok(robotConstraint({ ports: [], taskId: 'example', builds: { task: 'example' } }, readsSensor));
  assert.match(String(portsProblem(read(['m = table:mmin(view.up, view.left)', 'cell <- m']), ports)), /way in 3|来路|way3/);
  assert.match(String(portsProblem(read(['m = table:mmin(view.up, view.left, way3)', 'gate = table:pass(facts.rock, m)', 'cell <- gate']), ports)), /rock/);
});

// A course of two levels written here: the first builds a route counter, the second runs it behind a block gate.
const t = s => ({ zh: s, en: s });
const counterSolution = ['k = table:const[value=1]()', 'g = table:pass(facts.start, k)', 'm = table:msum(view.up, view.left, g)', 'cell <- m'];
const counterPorts = [{ 'table:port-way': { n: 1, sensor: 'up' } }, { 'table:port-way': { n: 2, sensor: 'left' } }, { 'table:port-start': { sensor: 'start' } }];
const twoLevels = () => ({
  id: 't', title: t('t'), primitives: ['table:msum', 'table:const', 'table:pass', 'table:block'],
  partDefs: { parts: { counter: { name: t('counter'), desc: t('d'), inputs: [{ name: 'up', type: 'circuit:number' }, { name: 'left', type: 'circuit:number' }, { name: 'start', type: 'circuit:boolean' }], outputType: 'circuit:number', inside: [{ id: 'base', reference: { mode: 'table:circuit', world: 'table:world-grid', robot: 'table:robot-scout', facts: ['start'], solution: counterSolution, ports: counterPorts } }] } } },
  eras: [{ id: 'e', machine: 'table:robot-scout', levels: [{ id: 'build' }, { id: 'reuse' }], links: [{ from: 'build', to: 'reuse' }], chapter: { title: t('e'), desc: t('e') } }],
  levels: [
    { id: 'build', intro: [], robot: 'table:robot-scout', adds: ['table:msum', 'table:const', 'table:pass'],
      tasks: [{ id: 'build', publishes: [{ piece: 'counter', variant: 'base' }], mode: 'table:circuit', world: 'table:world-grid', facts: ['start'], ports: counterPorts, tests: [{ R: 3, C: 4 }], expected: [10], solution: counterSolution }] },
    { id: 'reuse', intro: [], robot: 'table:robot-scout', adds: ['table:block'],
      tasks: [{ id: 'reuse', mode: 'table:circuit', world: 'table:world-grid', facts: ['start', 'rock'],
        tests: [{ R: 4, C: 4, rocks: [[1, 1]] }, { R: 4, C: 5, rocks: [[1, 2], [2, 0]] }, { R: 5, C: 5, rocks: [[1, 3], [2, 1], [3, 3]] }], expected: [8, 12, 10],
        solution: ['c = counter(view.up, view.left, facts.start)', 'b = table:block(facts.rock, c)', 'cell <- b'] }] },
  ],
});

test('a robot circuit checks its declared interface against its referenced world', () => {
  const wrongInput = twoLevels();
  wrongInput.partDefs.parts.counter.inputs[0].type = 'circuit:boolean';
  assert.ok(tableWorks(wrongInput).wrong.some(message => message.includes('input types do not match')));
  const wrongOutput = twoLevels();
  wrongOutput.partDefs.parts.counter.outputType = 'circuit:boolean';
  assert.ok(tableWorks(wrongOutput).wrong.some(message => message.includes('output type does not match')));
});

test('a robot runs a packaged circuit without a local publishing task', () => {
  const content = twoLevels();
  content.levels[0].tasks[0].publishes = [];
  content.levels[0].adds.push('counter');
  const table = tableWorks(content);
  const task = table.played.get('reuse')[0];
  const result = table.run(WORLDS[task.world], task.tests[0], task.solution, task);
  assert.deepEqual(table.wrong, []);
  assert.equal(result.value, task.expected[0]);
});

test('a configurable robot part opens and runs the same setting, including its default', () => {
  const content = twoLevels();
  content.partDefs.parts.counter.settings = { value: { control: 'number', default: 2 } };
  const { model, played, syncOwn } = tableWorks(content);
  const builder = played.get('build')[0];
  const reuse = played.get('reuse')[0];
  // The passing board may hold a different value from the one the enclosing card declares.
  syncOwn({ build: { ...builder.solution, nodes: builder.solution.nodes.map(node => node.id === 'k' ? { ...node, params: { value: 4 } } : node) } });
  const part = model.built.counter.part;
  for (const [params, value] of [[{}, 2], [{ value: 3 }, 3], [{ value: 0 }, 0]]) {
    const graph = { ...reuse.solution, nodes: reuse.solution.nodes.map(node => node.id === 'c' ? { ...node, params } : node) };
    const run = model.runCircuit(WORLDS[reuse.world], reuse.tests[0], graph, reuse);
    assert.equal(run.value, reuse.expected[0] * value);
    assert.equal(part.board(params).nodes.find(node => node.id === 'k').params.value, value);
  }
});

test('robot workshop blueprints round-trip and restore with the same ports and signal checks', () => {
  const table = tableWorks(twoLevels());
  const task = table.played.get('reuse')[0];
  const V = WORLDS[task.world];
  const base = { partOf: table.model.partOf, board: {
    ticks: true,
    wiring: (_, view) => wiring(table.model, { sensors: V.sensors, outs: V.outs, offers: task.given.offers, workshop: view.workshop }),
  } };
  const piece = {
    id: 'user_value', graph: { nodes: [], wires: [] }, inputs: [], outputs: ['cell'],
    outputSignals: { cell: 'circuit:number' }, name: 'Saved value',
  };
  const viewFor = (definition) => workshopView(base, { pieces: { [piece.id]: definition } }, () => true, table.model.partOf).view;
  const view = viewFor(piece);
  const parts = view.board.wiring(task);
  const opening = fitted({ nodes: [], wires: [] }, task.given);
  const source = `p = ${piece.id}()\ncell <- p`;
  const { graph, errors } = read(source, opening, parts, [piece.id]);
  assert.equal(errors, undefined);
  assert.deepEqual(plainBoard(read(print(graph, parts), opening, parts, [piece.id]).graph), plainBoard(graph));
  assert.deepEqual(plainBoard(restoreRobotBoard(table.model, task, graph, { knows: view.partOf, parts })), plainBoard(graph));
  assert.match(read(`p = ${piece.id}[value=2]()`, opening, parts, [piece.id]).errors[0].en, /has no setting/);
  const other = viewFor({ ...piece, outputSignals: { cell: 'circuit:boolean' } });
  assert.equal(restoreRobotBoard(table.model, task, graph, { knows: other.partOf, parts: other.board.wiring(task) }), null);
});

test('the parts box lists only choices open on its selected robot', () => {
  const content = twoLevels();
  content.levels[0].tasks[0].consts = [1, 2];
  content.levels[1].robot = 'table:robot-ranger';
  content.levels[1].adds.push('table:mmin');
  content.levels[1].tasks[0].consts = [3];
  const table = tableWorks(content);
  const values = (type, options) => table.settingsIn(type, { flags: new Set(), open: () => true, ...options })[0]?.values.map(({ value }) => value);
  assert.deepEqual(values('table:msum', { scope: 'table:robot-scout' }), ['table:msum']);
  assert.deepEqual(values('table:msum', { scope: 'table:robot-ranger' }), ['table:msum', 'table:mmin']);
  assert.deepEqual(values('table:const', { scope: 'table:robot-scout' }), [1, 2]);
  assert.deepEqual(values('table:const', { scope: 'table:robot-ranger' }), [3]);
  assert.equal(values('table:msum', { scope: 'table:robot-ranger', open: () => false }), undefined);
});

test('carried boards use the reference until the prerequisite has passed', async () => {
  const { tableWorks } = await import('./work.js');
  const content = twoLevels();
  content.levels[1].carry = 'build';
  const table = tableWorks(content), source = table.played.get('build')[0], target = table.played.get('reuse')[0];
  const modified = { ...source.solution, nodes: source.solution.nodes.map(n => n.id === 'k' ? { ...n, params: { value: 7 } } : n) };
  const progress = { all: true, passed: [], solved: [], data: { build: modified }, built: {} };
  assert.equal(table.opening(target, progress).nodes.find(n => n.id === 'k').params.value, 1);
  const passed = { ...progress, passed: ['build'], built: { build: modified } };
  assert.equal(table.opening(target, passed).nodes.find(n => n.id === 'k').params.value, 7);
});

test('a task’s answers are written, and the reference board is checked against them', async () => {
  const { tableWorks } = await import('./work.js');
  const { validate } = await import('./validate.js');
  const course = twoLevels();
  course.levels[1].tasks[0].expected = [8, 12, 11];
  const table = tableWorks(course);
  assert.deepEqual(table.wrong, []);
  const lines = validate({ levels: table.LEVELS, table }).filter(l => l.fail).map(l => l.text);
  assert.deepEqual(lines, ['reuse test 3: the reference gives 10, expected 11']);
  course.levels[1].tasks[0].expected = [8, 12];
  assert.match(tableWorks(course).wrong[0], /reuse: gives 2 expected answers for 3 tests/);
});

test('a built part runs the board its level’s last task was passed with, when that board reads exactly the part’s ports', async () => {
  const { tableWorks } = await import('./work.js');
  const { WORLDS } = await import('./model/worlds.js');
  const { played, wrong, syncOwn, run } = tableWorks(twoLevels());
  assert.deepEqual(wrong, []);
  const builder = played.get('build').at(-1), user = played.get('reuse').at(-1);
  const V = WORLDS[user.world], answers = () => user.tests.map(t => run(V, t, user.solution, user).value);
  const offByOne = { ...builder.solution, nodes: builder.solution.nodes.map(n => (n.type === 'table:const' ? { ...n, params: { value: 2 } } : n)) };
  const noStart = { ...builder.solution, wires: builder.solution.wires.filter(w => w.from !== 'facts#start') };
  assert.deepEqual(answers(), user.expected, 'the written answers are the routes around the rocks');
  syncOwn({ build: offByOne });
  assert.notDeepEqual(answers(), user.expected);
  // Another read of the same content keeps boards of its own: the first read's kept board is not its part.
  const other = tableWorks(twoLevels()), otherUser = other.played.get('reuse').at(-1);
  assert.deepEqual(otherUser.tests.map(t => other.run(V, t, otherUser.solution, otherUser).value), otherUser.expected);
  assert.notDeepEqual(answers(), user.expected);
  // As an older save keeps it: no output node, every sensor on the view card.
  const unfitted = { nodes: builder.solution.nodes.filter(n => n.type !== 'out').map(n => (n.type === 'facts' ? null : n.type === 'view' ? { ...n, params: { picks: ['up', 'left', 'start'] } } : n)).filter(Boolean), wires: builder.solution.wires.map(w => (w.from === 'facts#start' ? { ...w, from: 'view#start' } : w)) };
  syncOwn({ build: { ...unfitted, nodes: unfitted.nodes.map(n => (n.type === 'table:const' ? { ...n, params: { value: 2 } } : n)) } });
  assert.notDeepEqual(answers(), user.expected);
  syncOwn({ build: unfitted });
  assert.deepEqual(answers(), user.expected);
  syncOwn({ build: noStart });
  assert.deepEqual(answers(), user.expected);
  const stalePort = { ...offByOne, wires: [...offByOne.wires, { from: 'facts#start', to: 'cell', port: 'gone' }] };
  syncOwn({ build: stalePort });
  assert.deepEqual(answers(), user.expected);

});

/** Every game on the table domain, and the starter a new one is copied from: [id, dir]. */
test('reading a course never writes into its content', async () => {
  const { deepFreeze } = await import('../../engine/content.js');
  const { default: domain } = await import('./runtime.js');
  const spec = domain.spec(deepFreeze(readStarter(resolve(import.meta.dirname, '../../templates', import.meta.dirname.split('/').at(-1)))));
  assert.deepEqual(spec.table.wrong, []);
  assert.ok(domain.validate(spec).every(l => !l.fail));
  spec.syncOwn({});
});
