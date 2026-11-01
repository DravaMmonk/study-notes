// The table board as content and saves hold it: blueprint text both ways, fitting a board to its stage, the checks on
// a board that becomes a part, and boards saved before version 3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitted, fromText, fromVersion2, portsProblem, toText } from './model/board.js';
import { migration, savesOf } from './items/migrations.js';

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

test('a fitted board reads each sensor on the card that offers it, and drops what its stage lacks', () => {
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

test('a board saved before version 3 folds its readers into the two cards', () => {
  const old = {
    nodes: [{ id: 'a', kind: 'see', value: 'up;left' }, { id: 's', kind: 'msum' }, { id: 'p', kind: 'bp:stamp' }, { id: 'x', kind: 'bp:origin' }],
    wires: [{ from: 'a#up', to: 's:0' }, { from: 'tap:start', to: 'p:2' }, { from: 'a#left', to: 's:1' }, { from: 's', to: 'out:cell' }, { from: 'x', to: 's:2' }],
    xy: { s: [10, 20] }, at: { s: 3 }, lit: [],
  };
  const b = fromVersion2(old, { 'bp:stamp': 'counter', 'bp:origin': null }, id => (id === 'start' ? 'facts' : 'view'));
  assert.deepEqual(b.nodes, [
    { id: 'view', type: 'view', params: { picks: ['up', 'left'] } },
    { id: 'facts', type: 'facts', params: { picks: ['start'] } },
    { id: 's', type: 'msum', x: 10, y: 20, slot: 3 },
    { id: 'p', type: 'counter' },
  ]);
  assert.deepEqual(b.wires, [
    { from: 'view#up', to: 's', port: '0' }, { from: 'facts#start', to: 'p', port: '2' }, { from: 'view#left', to: 's', port: '1' }, { from: 's', to: 'cell', port: 'in' },
  ]);
});

test('migration items are the functions the shared save steps run', () => {
  const kept = { stage: 1, circs: [{ nodes: [{ id: 'q', kind: 'bp:cheapest' }, { id: 'z', kind: 'bp:origin' }], wires: [{ from: 'z', to: 'q:0' }, { from: 'q', to: 'out:cell' }] }] };
  const v2 = migration({ oldBoards: { drop: ['bp:origin'], rename: { 'bp:cheapest': 'bp:slantcost' } } })(kept);
  assert.deepEqual(v2.circs[0], { nodes: [{ id: 'q', kind: 'bp:slantcost' }], wires: [{ from: 'q', to: 'out:cell' }] });
  const v3 = migration({ boards: { parts: { 'bp:slantcost': 'min' } } })(v2);
  assert.deepEqual(v3, { stage: 1, boards: [{ nodes: [{ id: 'q', type: 'min' }], wires: [{ from: 'q', to: 'cell', port: 'in' }] }] });
  assert.equal(migration({ boards: { parts: {} } })('a hand level’s state'), 'a hand level’s state');
  const [step] = savesOf([{ version: 3, ops: [{ rename: { a: 'b' } }, { data: { boards: { parts: {} } } }] }]);
  assert.deepEqual(step.ops[0], { rename: { a: 'b' } });
  assert.equal(typeof step.ops[1].data, 'function');
});

test('a built part runs the board its level was passed with, when that board reads exactly the part’s ports', async () => {
  const { readContent } = await import('../../engine/content-node.js');
  const { tableCourse, syncOwn, run } = await import('./course.js');
  const { WORLDS } = await import('./model/worlds.js');
  const { LEVELS } = tableCourse(readContent('state-graph'));
  const stamp = LEVELS.find(L => L.id === 'stamp').stages.at(-1), rocks = LEVELS.find(L => L.id === 'rocks').stages.at(-1);
  const V = WORLDS[rocks.world], answers = () => rocks.tests.map(t => run(V, t, rocks.solution, rocks).value);
  const offByOne = { ...stamp.solution, nodes: stamp.solution.nodes.map(n => (n.type === 'const' ? { ...n, params: { value: 2 } } : n)) };
  const noStart = { ...stamp.solution, wires: stamp.solution.wires.filter(w => w.from !== 'facts#start') };
  try {
    syncOwn({ stamp: { stage: 0, boards: [offByOne] } });
    assert.notDeepEqual(answers(), rocks.expected);
    // As an older save keeps it: no output node, every sensor on the view card.
    const unfitted = { nodes: stamp.solution.nodes.filter(n => n.type !== 'out').map(n => (n.type === 'facts' ? null : n.type === 'view' ? { ...n, params: { picks: ['up', 'left', 'start'] } } : n)).filter(Boolean), wires: stamp.solution.wires.map(w => (w.from === 'facts#start' ? { ...w, from: 'view#start' } : w)) };
    syncOwn({ stamp: { stage: 0, boards: [{ ...unfitted, nodes: unfitted.nodes.map(n => (n.type === 'const' ? { ...n, params: { value: 2 } } : n)) }] } });
    assert.notDeepEqual(answers(), rocks.expected);
    syncOwn({ stamp: { stage: 0, boards: [unfitted] } });
    assert.deepEqual(answers(), rocks.expected);
    syncOwn({ stamp: { stage: 0, boards: [noStart] } });
    assert.deepEqual(answers(), rocks.expected);
  } finally {
    syncOwn({});
  }
});
