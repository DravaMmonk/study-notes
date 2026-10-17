// Ch.5: walk back from the goal through the min-cost table to recover the cheapest route.

import { reduced, buzz } from '../util.js';
import { minCostTable, rcName } from '../algo.js';
import { E } from '../svg.js';
import { rt } from '../runtime.js';
import { tr, lazy } from '../i18n.js';

export function backMode(L) {
  const R = L.costs.length, C = L.costs[0].length, val = minCostTable(L.costs), endId = `${R - 1},${C - 1}`;
  const st = { path: [endId], msg: { cls: '', html: lazy(() => tr(`终点的数是 <b>${val.get(endId)}</b>，体力是 <b>${L.costs[R - 1][C - 1]}</b>。它是从上面来的，还是从左边来的？`, `The end cell holds <b>${val.get(endId)}</b> and its own energy is <b>${L.costs[R - 1][C - 1]}</b>. Did the route come from above, or from the left?`)) } };
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
    /** How to read the board, in the brief. */
    legend: () => tr('格子中间是机器算出的最少体力，左上角小字是这一格自己的体力。', 'The big number in each cell is the least energy the machine computed; the small number in the corner is the cell’s own energy.'),
    onCell(id) {
      const now = st.path[st.path.length - 1];
      if (now === '0,0') return;
      const [r0, c0] = rc(now), [r, c] = rc(id);
      if (!((r === r0 - 1 && c === c0) || (r === r0 && c === c0 - 1))) { st.msg = { cls: 'bad', html: lazy(() => tr('只能退到当前格子的<b>上面</b>或<b>左边</b>，也就是黄色虚框的格子。', 'You can only step back to the cell <b>above</b> or to the <b>left</b> of the current one: the ones with a dashed yellow frame.')) }; buzz(20); rt.refresh(); return; }
      const need = val.get(now), got = val.get(id) + cost(now);
      if (got !== need) {
        st.msg = { cls: 'bad', html: lazy(() => tr(`从${rcName(id)}过来的话：${val.get(id)} + ${cost(now)} = <b>${got}</b>，不等于当前格子的 <b>${need}</b>。所以最省力的路线不是从这里来的。`, `Coming from ${rcName(id)}: ${val.get(id)} + ${cost(now)} = <b>${got}</b>, which is not the current cell’s <b>${need}</b>. So the cheapest route did not come this way.`)) };
        buzz(20);
        rt.refresh();
        return;
      }
      st.path.push(id);
      buzz(10);
      if (id === '0,0') {
        const path = [...st.path].reverse();
        st.msg = { cls: 'good', html: lazy(() => tr(`回到起点了。正着读这条路线：${path.map(rcName).join(' → ')}。`, `Back at the start. Read forwards, the route is: ${path.map(rcName).join(' → ')}.`)) };
        rt.refresh();
        setTimeout(rt.pass, reduced() ? 0 : 600);
        return;
      }
      st.msg = { cls: 'good', html: lazy(() => tr(`${val.get(id)} + ${cost(now)} = ${need}，对。现在站在${rcName(id)}：数是 <b>${val.get(id)}</b>，体力是 <b>${cost(id)}</b>。再往回退一步。`, `${val.get(id)} + ${cost(now)} = ${need}, correct. Now you are at ${rcName(id)}: its number is <b>${val.get(id)}</b> and its energy is <b>${cost(id)}</b>. Step back once more.`)) };
      rt.refresh();
    },
    panel: () => `<div class="pcard"><h3>${tr('倒推', 'Walking back')}</h3><div class="msg ${st.msg.cls}">${st.msg.html}</div></div>
      <div class="pcard"><h3>${tr('规则', 'Rule')}</h3><p>${tr('如果从某个邻居过来，那么<b>邻居的数 + 本格体力 = 本格的数</b>。找到满足这个等式的邻居，就知道路线是从哪来的。', 'If the route came from a neighbor, then <b>the neighbor’s number + this cell’s energy = this cell’s number</b>. Find the neighbor that makes this true and you know where the route came from.')}</p></div>`,
    dock: () => ({ meta: tr(`已退回 <b>${st.path.length - 1}</b> 步`, `Stepped back <b>${st.path.length - 1}</b>`), sec: st.path.length > 1 ? tr('重来', 'Start over') : '', secAct: 'restart' }),
    act(name) { if (name === 'restart') { st.path = [endId]; st.msg = { cls: '', html: lazy(() => tr('从终点重新开始。', 'Starting again from the end.')) }; rt.refresh(); } },
  };
}
