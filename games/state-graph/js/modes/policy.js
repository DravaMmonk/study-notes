// Ch.16: the arrows grow by themselves — on a map whose values have settled, walk the robot to the treasure by always
// stepping to the best neighbour; then every cell shows its arrow.

import { buzz, reduced, signal } from '../util.js';
import { E } from '../svg.js';
import { rt } from '../runtime.js';
import { rcName } from '../algo.js';
import { settle, policy, tileAt } from '../circuit/worlds/value.js';
import { ROBOTS } from '../circuit/robots.js';

export function policyMode(L) {
  const t = L.map, table = settle(t), st = { k: 0, path: [L.starts[0].join()], msg: null, done: false };
  const val = id => table.get(id);
  const near = id => { const [r, c] = id.split(',').map(Number); return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([y, x]) => y >= 0 && x >= 0 && y < t.R && x < t.C && tileAt(t, y, x) !== 'wall').map(p => p.join()); };
  const here = () => st.path.at(-1);
  const best = id => Math.max(...near(id).map(val));
  return {
    st,
    save: () => ({}),
    scene() {
      const on = new Set(st.path), opts = st.done ? [] : near(here()), cells = [];
      for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
        const id = `${r},${c}`, k = tileAt(t, r, c);
        cells.push({ id, x: c * 64, y: r * 64, w: 56, h: 56, value: k === 'wall' ? '' : signal(val(id)), label: { gold: '宝藏', trap: '陷阱' }[k] || '', cls: [k === 'wall' ? 'rock' : k === 'floor' ? 'lit' : k, on.has(id) ? 'path' : '', opts.includes(id) ? 'pred' : ''].filter(Boolean).join(' '), tap: opts.includes(id), aria: rcName(id) });
      }
      const edges = [];
      for (let q = 0; q + 1 < st.path.length; q++) edges.push(E(st.path[q], st.path[q + 1], 'good'));
      if (st.done) policy(t, table).forEach(([a, b]) => edges.push(E(a, b, 'sel')));
      return { cells, edges, robot: st.done ? null : here(), look: ROBOTS.scout.look };
    },
    boardOpt: () => ({ minScale: 0.7, maxScale: 1.15 }),
    note: () => (st.done ? '每一格都长出了一根箭头：指向四个邻居里价值最大的那一格。从任何一格出发，顺着箭头走，都能到宝藏。' : `起点 ${st.k + 1} / ${L.starts.length}：点一个虚线框的邻居，让机器人走过去。`),
    panel: () => `<div class="pcard"><h3>怎么走<small>起点 ${Math.min(st.k + 1, L.starts.length)} / ${L.starts.length}</small></h3><p>每一格的数，是站在这里有多好：离宝藏越近越大，每远一步打个九折。机器人每一步都走到<b>四个邻居里数最大</b>的那一格。</p>${st.msg ? `<div class="msg ${st.msg.cls}">${st.msg.html}</div>` : ''}</div>`,
    dock: () => ({ meta: st.done ? '全部走到了' : `已经走了 <b>${st.path.length - 1}</b> 步`, sec: st.done ? '' : '这个起点重走', secAct: 'again' }),
    onCell(id) {
      if (st.done) return;
      const now = here();
      if (!near(now).includes(id)) return;
      if (val(id) < best(now)) { st.msg = { cls: 'bad', html: `${rcName(id)}的价值是 <b>${signal(val(id))}</b>，可旁边还有 <b>${signal(best(now))}</b> 的格子。走那一格离宝藏更近。` }; buzz(20); rt.refresh(); return; }
      st.path.push(id);
      buzz(8);
      if (tileAt(t, ...id.split(',').map(Number)) === 'gold') {
        st.k++;
        if (st.k < L.starts.length) { st.msg = { cls: 'good', html: `到了，走了 ${st.path.length - 1} 步。换一个起点。` }; st.path = [L.starts[st.k].join()]; }
        else { st.done = true; st.msg = { cls: 'good', html: '三个起点都走到了宝藏。' }; setTimeout(rt.pass, reduced() ? 0 : 1600); }
      } else st.msg = null;
      rt.refresh();
    },
    act(name) { if (name === 'again') { st.path = [L.starts[st.k].join()]; st.msg = null; rt.refresh(); } },
  };
}
