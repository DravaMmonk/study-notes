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
import { topdown } from './topdown.js';
import { rounds } from './rounds.js';
import { language } from './language.js';
import { seams } from './seams.js';
import { graduate } from './graduate.js';
import { boxy } from './boxy.js';
import { tr, lazy } from '../i18n.js';
import { layout } from '../../../kit/course.js';
import { ERAS, SECTIONS, RETIRED, LABELS } from './eras.js';

export { PARTS } from './parts.js';
/**
 * The levels in play order, era by era (eras.js): each era's foundation, then its topics. A level's chapter on the map
 * is its foundation or topic, and it opens once everything it requires is solved (REQUIRES).
 */
const PLAN = layout(ERAS);
// A level the new tree (CURRICULUM.md) leaves out stays written but is not played (RETIRED).
const ALL = [...basics, ...machines, ...boxy, ...state, ...strings, ...knapsack, ...skeleton, ...sweep, ...orders, ...states, ...topdown, ...rounds, ...language, ...seams, ...graduate].filter(L => !RETIRED.includes(L.id));
const byId = new Map(ALL.map(L => [L.id, L]));
export const LEVELS = [...PLAN.order.map(id => byId.get(id)), ...ALL.filter(L => !PLAN.place.has(L.id))];
LEVELS.forEach(L => { L.ch = Math.max(0, SECTIONS.findIndex(s => s.levels.includes(L.id))); });
export const REQUIRES = PLAN.requires;
export const PLACE = PLAN.place;
export const CHAPTERS = SECTIONS;
export { LABELS };

/** A circuit level's board becomes a component for later levels: a black box (L.blueprint.f) on the level's ports. */
function registerBlueprint(L) {
  const last = (L.stages || [L]).at(-1), V = WORLDS[last.world], ports = L.blueprint.ports;
  BLUEPRINTS[`bp:${L.id}`] = {
    name: PARTS[L.unlock].name, look: L.unlock,
    desc: lazy(() => tr(`你在第 ${LABELS.get(L.id)} 关拼出的电路板，现在是一个元件。顶上的输入：${ports.map(id => V.sensors[id].label).join('、')}。`, `The circuit board you built in level ${LABELS.get(L.id)}, now a component. Inputs on top: ${ports.map(id => V.sensors[id].label).join(', ')}.`)),
    ins: ports.map(id => ({ num: 'num', bool: 'bool', nums: 'num*', bools: 'bool*', cat: 'cat' })[V.sensors[id].type]), labels: ports.map(id => V.sensors[id].short), sensors: ports,
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
