// Level registry: the ordered level list, derived answers, and level circuits exposed as blueprint components.

import { gridScene } from '../svg.js';
import { WORLDS, runCircuit } from '../circuit/worlds.js';
import { BLUEPRINTS } from '../circuit/components.js';
import { PARTS } from './parts.js';
import { ROBOTS } from '../circuit/robots.js';
import { visionFig } from './figs.js';
import { basics } from './basics.js';
import { machines } from './machines.js';
import { state } from './state.js';
import { strings } from './strings.js';
import { knapsack } from './knapsack.js';
import { skeleton } from './skeleton.js';
import { sweep } from './sweep.js';
import { orders } from './orders.js';
import { states } from './states.js';
import { graduate } from './graduate.js';

export { CHAPTERS, PARTS } from './parts.js';
export const LEVELS = [...basics, ...machines, ...state, ...strings, ...knapsack, ...skeleton, ...sweep, ...orders, ...states, ...graduate];

/** A circuit level's board becomes a component for later levels (it runs the reference board). */
function registerBlueprint(L, i) {
  const last = (L.stages || [L]).at(-1), V = WORLDS[last.world], ports = L.blueprint;
  BLUEPRINTS[`bp:${L.id}`] = {
    name: PARTS[L.unlock].name,
    desc: `你在第 ${i + 1} 关拼出的电路板，现在是一个元件。顶上的输入：${ports.map(id => V.taps[id].label).join('、')}。`,
    ins: ports.map(id => ({ num: 'num', bool: 'bool', nums: 'num*', bools: 'bool*' })[V.taps[id].type]), labels: ports.map(id => V.taps[id].short), tapIds: ports,
    out: V.outs[0][0], outType: V.outs[0][3], circuit: last.solution,
  };
}

/** The first level that uses a robot model introduces it: the very first one meets you, later ones are upgrades. */
const met = new Set();
LEVELS.filter(L => L.mode === 'circuit').forEach(L => {
  if (met.has(L.robot)) return;
  const r = ROBOTS[L.robot], n = 2 * r.vision + 1;
  L.intro = [{ t: `${met.size ? '机器人升级了！新型号' : '认识你的机器人'}：<b>「${r.name}」</b>。${r.desc}图里蓝框是它的视野（${n}×${n}），红框是它脚下的格子。`, fig: visionFig(L.robot) }, ...L.intro];
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
      const o = { ...s, dirs: L.solutionDirs || {}, ...(s.dial ? { scan: s.solutionScan } : {}), filter: s.solutionFilter || 'all', remember: s.solutionMem || [] };
      s.expected = (s.tests || L.tests).map(t => runCircuit(WORLDS[s.world], t, s.solution, o).value);
    });
    L.expected = (L.stages || [L]).at(-1).expected;
    if (L.blueprint) registerBlueprint(L, i);
  }
});
