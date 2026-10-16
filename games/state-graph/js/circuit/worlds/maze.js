// Mazes with keys and doors, as tables stacked in layers.

import { ORDERS, rcName } from '../../algo.js';
import { world, look, cell, yes } from '../world.js';
import { inGrid } from './grid.js';

/* ---------- two-layer maze: top layer without the key, bottom layer with it ---------- */

const keyMaze = world({
  layers: ['上层', '下层'],
  taps: {
    tu: cell('上层·上面', '上↑', [0, -1, 0]), tl: cell('上层·左边', '上←', [0, 0, -1]), bu: cell('下层·上面', '下↑', [1, -1, 0]), bl: cell('下层·左边', '下←', [1, 0, -1]),
    start: yes('是起点', '起', 'flag'), key: yes('是钥匙格', '钥', 'key'), door: yes('是门', '门', 'door'),
  },
  facts: ['start', 'key', 'door'],
  outs: [['top', '上层', [0, 0, 0]], ['bot', '下层', [1, 0, 0]]],
  here: (t, { r, c }) => [[r, c], [r, c]],
  keyAt: (t, L, r, c) => (inGrid(t, r, c) ? `${L}:${r},${c}` : null),
  mark(t, key) {
    const id = key.slice(2), isKey = id === t.key.join(','), door = t.doors.some(d => d.join(',') === id);
    return { corner: isKey ? '钥' : door ? '门' : id === '0,0' ? '起' : id === `${t.R - 1},${t.C - 1}` ? '终' : '', cls: isKey ? 'key' : door ? 'door' : '' };
  },
  fact(t, { r, c }, id) {
    switch (id) {
      case 'start': return r === 0 && c === 0;
      case 'key': return t.key[0] === r && t.key[1] === c;
      case 'door': return t.doors.some(d => d[0] === r && d[1] === c);
    }
    return null;
  },
  order: t => ORDERS.rowTL.list(t.R, t.C).map(([r, c]) => ({ r, c, id: `${r},${c}` })),
  keys: (t, x) => ({ top: `0:${x.id}`, bot: `1:${x.id}` }),
  where: x => rcName(x.id),
  answerKey: t => [`0:${t.R - 1},${t.C - 1}`, `1:${t.R - 1},${t.C - 1}`],
  answer: (t, table) => keyMaze.answerKey(t).reduce((s, k) => s + (table.get(k) ?? 0), 0),
  name: key => { const [L, id] = key.split(':'); return `${L === '1' ? '下层' : '上层'}的${rcName(id)}`; },
  label: t => `${t.R}×${t.C} · ${t.doors.length} 扇门`,
  orderText: () => ORDERS.rowTL.l,
  sample: () => ({ r: 1, c: 1, id: '1,1' }),
  scene(t, view, o = {}) {
    const g = look(view, keyMaze.answerKey(t), [], o.bench), sp = 62, sz = 54, gap = 82, layerY = L => L * (t.R * sp + gap);
    const cells = [], texts = [];
    [0, 1].forEach(L => {
      texts.push({ x: -sz / 2, y: layerY(L) - sz / 2 - 14, t: L ? '下层 · 有钥匙' : '上层 · 没钥匙', anchor: 'start', cls: 'hd' });
      for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
        const key = `${L}:${r},${c}`, m = keyMaze.mark(t, key);
        cells.push({ id: key, x: c * sp, y: layerY(L) + r * sp, w: sz, h: sz, value: g.val(key), label: m.cls === 'key' ? '钥匙' : m.cls === 'door' ? '门' : '', corner: m.cls ? '' : m.corner, cls: `${m.cls} ${g.cls(key)}`, tap: g.tap(key), aria: keyMaze.name(key) });
      }
    });
    return { cells, edges: g.arrows(rk => `${rk[0]}:${g.act.cell.id}`), texts, robot: g.robot ? [g.robot, `1${g.robot.slice(1)}`] : null };
  },
});

export { keyMaze };
