// Ch.5: walk back from the goal through the min-cost table to recover the cheapest route.

import { reduced, buzz } from '../util.js';
import { minCostTable, rcName } from '../algo.js';
import { E } from '../svg.js';
import { rt } from '../runtime.js';

export function backMode(L) {
  const R = L.costs.length, C = L.costs[0].length, val = minCostTable(L.costs), endId = `${R - 1},${C - 1}`;
  const st = { path: [endId], msg: { cls: '', html: `终点的数是 <b>${val.get(endId)}</b>，体力是 <b>${L.costs[R - 1][C - 1]}</b>。它是从上面来的，还是从左边来的？` } };
  const rc = id => id.split(',').map(Number);
  const cost = id => { const [r, c] = rc(id); return L.costs[r][c]; };
  return {
    st,
    save: () => ({}),
    scene() {
      const now = st.path[st.path.length - 1], [r0, c0] = rc(now), done = now === '0,0';
      const options = [[r0 - 1, c0], [r0, c0 - 1]].filter(([r, c]) => r >= 0 && c >= 0).map(p => p.join(','));
      const cells = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const id = `${r},${c}`;
        cells.push({ id, x: c * 66, y: r * 66, w: 58, h: 58, value: val.get(id), corner: L.costs[r][c], cls: [st.path.includes(id) ? 'path' : '', id === now && !done ? 'sel' : '', !done && options.includes(id) ? 'pred' : ''].filter(Boolean).join(' '), tap: true, aria: rcName(id) });
      }
      const edges = [];
      for (let k = st.path.length - 1; k > 0; k--) edges.push(E(st.path[k], st.path[k - 1], 'good'));
      return { cells, edges };
    },
    note: () => '格子中间是机器算出的最少体力，左上角小字是这一格自己的体力。',
    onCell(id) {
      const now = st.path[st.path.length - 1];
      if (now === '0,0') return;
      const [r0, c0] = rc(now), [r, c] = rc(id);
      if (!((r === r0 - 1 && c === c0) || (r === r0 && c === c0 - 1))) { st.msg = { cls: 'bad', html: '只能退到当前格子的<b>上面</b>或<b>左边</b>，也就是黄色虚框的格子。' }; buzz(20); rt.refresh(); return; }
      const need = val.get(now), got = val.get(id) + cost(now);
      if (got !== need) {
        st.msg = { cls: 'bad', html: `从${rcName(id)}过来的话：${val.get(id)} + ${cost(now)} = <b>${got}</b>，不等于当前格子的 <b>${need}</b>。所以最省力的路线不是从这里来的。` };
        buzz(20);
        rt.refresh();
        return;
      }
      st.path.push(id);
      buzz(10);
      if (id === '0,0') {
        st.msg = { cls: 'good', html: `回到起点了。正着读这条路线：${[...st.path].reverse().map(rcName).join(' → ')}。` };
        rt.refresh();
        setTimeout(rt.pass, reduced() ? 0 : 600);
        return;
      }
      st.msg = { cls: 'good', html: `${val.get(id)} + ${cost(now)} = ${need}，对。现在站在${rcName(id)}：数是 <b>${val.get(id)}</b>，体力是 <b>${cost(id)}</b>。再往回退一步。` };
      rt.refresh();
    },
    panel: () => `<div class="pcard"><h3>倒推</h3><div class="msg ${st.msg.cls}">${st.msg.html}</div></div>
      <div class="pcard"><h3>规则</h3><p>如果从某个邻居过来，那么<b>邻居的数 + 本格体力 = 本格的数</b>。找到满足这个等式的邻居，就知道路线是从哪来的。</p></div>`,
    dock: () => ({ meta: `已退回 <b>${st.path.length - 1}</b> 步`, sec: st.path.length > 1 ? '重来' : '', secAct: 'restart' }),
    act(name) { if (name === 'restart') { st.path = [endId]; st.msg = { cls: '', html: '从终点重新开始。' }; rt.refresh(); } },
  };
}
