// The table board as content and saves hold it: blueprint text both ways, fitting a board to its task, the checks on
// a board that becomes a part; a course read of every table game leaves its content as it was; a save of a level's
// stages moves to its tasks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitted, fromText, portsProblem, toText } from './model/board.js';

const given = { offers: { view: ['up', 'left'], facts: ['start', 'rock'] }, inputs: [], outs: ['cell'] };

test('blueprint text reads into a board and writes back the same', () => {
  const lines = ['m = msum(view.up, view.left)', 'k = const[value=1]()', 'g = pass(facts.start, k)', 's = msum(m, g)', 'cell <- s'];
  const b = fromText(lines, given);
  assert.deepEqual(b.nodes.find(n => n.id === 'view').params.picks, ['up', 'left']);
  assert.deepEqual(b.nodes.find(n => n.id === 'facts').params.picks, ['start']);
  assert.deepEqual(b.nodes.find(n => n.id === 'k').params, { value: 1 });
  assert.deepEqual(b.wires.find(w => w.to === 'cell'), { from: 's', to: 'cell', port: 'in' });
  assert.deepEqual(toText(b), lines);
});

test('blueprint text names the line it cannot read', () => {
  assert.throws(() => fromText(['m = msum(view.down)', 'cell <- m'], given), e => e.line === 1 && /down/.test(e.en));
  assert.throws(() => fromText(['cell <- nope'], given), e => e.line === 1);
});

test('a fitted board reads each sensor on the card that offers it, and drops what its task lacks', () => {
  const b = {
    nodes: [{ id: 'view', type: 'view', params: { picks: ['left', 'start', 'gone'] }, x: 5, y: 6 }, { id: 'm', type: 'msum' }, { id: 'old', type: 'out' }],
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
  const g = { ...given, inputs: ['way3'] };
  assert.equal(portsProblem(fromText(['m = mmin(view.up, view.left, way3)', 'cell <- m'], g), ports), null);
  assert.match(String(portsProblem(fromText(['m = mmin(view.up, view.left)', 'cell <- m'], g), ports)), /way in 3|来路|way3/);
  assert.match(String(portsProblem(fromText(['m = mmin(view.up, view.left, way3, facts.rock)', 'cell <- m'], g), ports)), /rock/);
});

// A course of two levels written here: the first builds a route counter, the second runs it behind a block gate.
const t = s => ({ zh: s, en: s });
const twoLevels = () => ({
  id: 't', title: t('t'), primitives: ['msum', 'const', 'pass', 'block'],
  parts: { counter: { name: t('counter'), desc: t('d') } },
  eras: [{ id: 'e', machine: 'scout', foundation: ['build', 'reuse'], chapter: { title: t('e'), desc: t('e') } }],
  levels: [
    { id: 'build', intro: [], robot: 'scout', adds: ['msum', 'const', 'pass'], unlock: 'counter',
      builds: { ports: [{ way: { n: 1, sensor: 'up' } }, { way: { n: 2, sensor: 'left' } }, { start: { sensor: 'start' } }] },
      tasks: [{ id: 'build', mode: 'circuit', world: 'grid', facts: ['start'], tests: [{ R: 3, C: 4 }], expected: [10], solution: ['k = const[value=1]()', 'g = pass(facts.start, k)', 'm = msum(view.up, view.left, g)', 'cell <- m'] }] },
    { id: 'reuse', intro: [], robot: 'scout', adds: ['block'],
      tasks: [{ id: 'reuse', mode: 'circuit', world: 'grid', facts: ['start', 'rock'],
        tests: [{ R: 4, C: 4, rocks: [[1, 1]] }, { R: 4, C: 5, rocks: [[1, 2], [2, 0]] }, { R: 5, C: 5, rocks: [[1, 3], [2, 1], [3, 3]] }], expected: [8, 12, 10],
        solution: ['c = counter(view.up, view.left, facts.start)', 'b = block(facts.rock, c)', 'cell <- b'] }] },
  ],
});

test('carried boards use the reference until the prerequisite has passed', async () => {
  const { tableCourse } = await import('./course.js');
  const content = twoLevels();
  content.levels[1].carry = 'build';
  const table = tableCourse(content), source = table.played.get('build')[0], target = table.played.get('reuse')[0];
  const modified = { ...source.solution, nodes: source.solution.nodes.map(n => n.id === 'k' ? { ...n, params: { value: 7 } } : n) };
  const progress = { all: true, passed: [], solved: [], data: { build: modified }, built: {} };
  assert.equal(table.opening(target, progress).nodes.find(n => n.id === 'k').params.value, 1);
  const passed = { ...progress, passed: ['build'], built: { build: modified } };
  assert.equal(table.opening(target, passed).nodes.find(n => n.id === 'k').params.value, 7);
});

test('a task’s answers are written, and the reference board is checked against them', async () => {
  const { tableCourse } = await import('./course.js');
  const { validate } = await import('./validate.js');
  const course = twoLevels();
  course.levels[1].tasks[0].expected = [8, 12, 11];
  const table = tableCourse(course);
  assert.deepEqual(table.wrong, []);
  const lines = validate({ levels: table.LEVELS, table }).filter(l => l.fail).map(l => l.text);
  assert.deepEqual(lines, ['reuse test 3: the reference gives 10, expected 11']);
  course.levels[1].tasks[0].expected = [8, 12];
  assert.match(tableCourse(course).wrong[0], /reuse: gives 2 expected answers for 3 tests/);
});

test('a built part runs the board its level’s last task was passed with, when that board reads exactly the part’s ports', async () => {
  const { tableCourse } = await import('./course.js');
  const { WORLDS } = await import('./model/worlds.js');
  const { played, wrong, syncOwn, run } = tableCourse(twoLevels());
  assert.deepEqual(wrong, []);
  const builder = played.get('build').at(-1), user = played.get('reuse').at(-1);
  const V = WORLDS[user.world], answers = () => user.tests.map(t => run(V, t, user.solution, user).value);
  const offByOne = { ...builder.solution, nodes: builder.solution.nodes.map(n => (n.type === 'const' ? { ...n, params: { value: 2 } } : n)) };
  const noStart = { ...builder.solution, wires: builder.solution.wires.filter(w => w.from !== 'facts#start') };
  assert.deepEqual(answers(), user.expected, 'the written answers are the routes around the rocks');
  syncOwn({ build: offByOne });
  assert.notDeepEqual(answers(), user.expected);
  // Another read of the same content keeps boards of its own: the first read's kept board is not its part.
  const other = tableCourse(twoLevels()), otherUser = other.played.get('reuse').at(-1);
  assert.deepEqual(otherUser.tests.map(t => other.run(V, t, otherUser.solution, otherUser).value), otherUser.expected);
  assert.notDeepEqual(answers(), user.expected);
  // As an older save keeps it: no output node, every sensor on the view card.
  const unfitted = { nodes: builder.solution.nodes.filter(n => n.type !== 'out').map(n => (n.type === 'facts' ? null : n.type === 'view' ? { ...n, params: { picks: ['up', 'left', 'start'] } } : n)).filter(Boolean), wires: builder.solution.wires.map(w => (w.from === 'facts#start' ? { ...w, from: 'view#start' } : w)) };
  syncOwn({ build: { ...unfitted, nodes: unfitted.nodes.map(n => (n.type === 'const' ? { ...n, params: { value: 2 } } : n)) } });
  assert.notDeepEqual(answers(), user.expected);
  syncOwn({ build: unfitted });
  assert.deepEqual(answers(), user.expected);
  syncOwn({ build: noStart });
  assert.deepEqual(answers(), user.expected);
});

/** Every game on the table domain, and the starter a new one is copied from: [id, dir]. */
test('reading a course never writes into its content', async () => {
  const { readContent } = await import('../../engine/content-node.js');
  const { deepFreeze } = await import('../../engine/content.js');
  const { default: domain } = await import('./domain.js');
  const spec = domain.spec(deepFreeze(readContent('starter', import.meta.dirname)));
  assert.deepEqual(spec.table.wrong, []);
  assert.ok(domain.validate(spec).every(l => !l.fail));
  spec.syncOwn({});
});
