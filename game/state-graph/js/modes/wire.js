// Ch.1: wire arrows between cells by tapping two cells, then run the flow.

import { buzz, toast } from '../util.js';
import { evalGraph } from '../algo.js';
import { E } from '../svg.js';
import { rt, Anim } from '../runtime.js';
import { tr, lazy } from '../i18n.js';

export function wireMode(L, saved) {
  const st = { edges: saved && saved.edges ? saved.edges : [], sel: null, vals: null, cur: null, hot: [], cycle: null };
  const by = Object.fromEntries(L.cells.map(c => [c.id, c]));
  const has = (a, b) => st.edges.some(e => e[0] === a && e[1] === b);
  const reset = () => { st.vals = null; st.cur = null; st.hot = []; st.cycle = null; };
  return {
    st,
    save: () => ({ edges: st.edges }),
    tip: () => (L.coach ? L.coach(st) : null),
    scene() {
      const coach = L.coach ? L.coach(st).cell : null;
      const cells = L.cells.map(c => {
        const src = c.fixed !== undefined, v = src ? c.fixed : st.vals && c.id in st.vals ? st.vals[c.id] : '·';
        const cls = [src ? 'src' : '', c.goal !== undefined ? 'goal' : '', st.sel === c.id ? 'sel' : '', st.cur === c.id ? 'hot' : '', st.vals && !src && st.cur !== c.id && c.id in st.vals ? 'lit' : '', st.cycle && st.cycle.includes(c.id) ? 'bad' : '', coach === c.id ? 'coach' : ''];
        return { id: c.id, x: c.x, y: c.y, w: 92, h: 76, label: c.label, value: v, sub: c.goal !== undefined ? tr(`需要 ${c.goal}`, `needs ${c.goal}`) : '', cls: cls.filter(Boolean).join(' '), tap: true, aria: tr(`${c.label}格子`, `${c.label} cell`) };
      });
      const edges = st.edges.map(([a, b]) => E(a, b, st.hot.some(e => e[0] === a && e[1] === b) ? 'hot' : st.cycle && st.cycle.includes(a) && st.cycle.includes(b) ? 'bad' : 'idle'));
      return { cells, edges };
    },
    note: () => st.sel ? tr(`已选中「${by[st.sel].label}」。再点另一个格子连箭头，或者再点它一次取消选中。`, `“${by[st.sel].label}” is selected. Click another cell to draw an arrow, or click it again to deselect it.`) : st.edges.length ? tr(`已连 ${st.edges.length} 根箭头。`, `${st.edges.length} arrow${st.edges.length === 1 ? '' : 's'} drawn.`) : tr('还没有箭头。', 'No arrows yet.'),
    onCell(id) {
      if (rt.cur.running) return;
      if (!st.sel) st.sel = id;
      else if (st.sel === id) st.sel = null;
      else {
        if (by[id].fixed !== undefined) { toast(tr('源格子里的数是固定的，不能往里连箭头', 'A source cell’s number is fixed; no arrow can point into it')); buzz(20); st.sel = null; }
        else {
          const a = st.sel;
          if (has(a, id)) { st.edges = st.edges.filter(e => !(e[0] === a && e[1] === id)); toast(tr('拆掉了一根箭头', 'Removed an arrow')); }
          else st.edges = [...st.edges, [a, id]];
          st.sel = null;
          reset();
          buzz(10);
        }
      }
      rt.persist();
      rt.refresh();
    },
    panel() {
      return `<div class="pcard"><h3>${tr('规则', 'Rule')}</h3><div class="rule">${tr('格子里的数 = 所有指向它的箭头送来的数之和<br><em>没有箭头指向的格子 = 0</em>', 'A cell’s number = the sum of the numbers all its incoming arrows bring<br><em>A cell no arrow points to = 0</em>')}</div></div>
        <div class="pcard"><h3>${tr('箭头', 'Arrows')}<small>${st.edges.length}${tr(' 根', '')}</small></h3>
          ${st.edges.length ? `<div class="routes">${st.edges.map(([a, b]) => `<div class="route now">${by[a].label} → ${by[b].label}</div>`).join('')}</div>` : `<p>${tr('还没有箭头。点一个格子，再点另一个格子。', 'No arrows yet. Click one cell, then another.')}</p>`}
          <button class="sec-btn" type="button" data-act="clear" ${st.edges.length ? '' : 'disabled'}>${tr('拆掉全部箭头', 'Remove all arrows')}</button></div>`;
    },
    dock: () => ({ meta: `${L.cells.filter(c => c.goal !== undefined).map(c => tr(`目标需要 <b>${c.goal}</b>`, `Target needs <b>${c.goal}</b>`)).join(' · ')}`, go: tr('运行', 'Run'), act: 'run' }),
    act(name) {
      if (name === 'clear') { st.edges = []; st.sel = null; reset(); rt.persist(); rt.refresh(); }
      if (name === 'run') this.run();
    },
    async run() {
      st.sel = null;
      reset();
      const res = evalGraph(L.cells, st.edges);
      if (res.cycle) {
        st.cycle = res.cycle;
        rt.refresh();
        rt.fail({ head: lazy(() => tr('箭头绕成了圈', 'The arrows form a loop')), body: lazy(() => tr(`这几个格子互相等着对方先算：${res.cycle.map(id => `「${by[id].label}」`).join('、')}。谁也算不出来，机器停住了。拆掉其中一根箭头试试。`, `These cells are each waiting for another to go first: ${res.cycle.map(id => `“${by[id].label}”`).join(', ')}. None of them can ever be computed, so the machine stopped. Try removing one of those arrows.`)) });
        return;
      }
      rt.startRun();
      st.vals = {};
      for (const s of res.steps) {
        st.vals[s.id] = s.v;
        if (by[s.id].fixed !== undefined) continue;
        st.cur = s.id;
        st.hot = s.ins;
        rt.renderBoard();
        await Anim.wait(700);
      }
      st.cur = null; st.hot = [];
      rt.endRun();
      rt.refresh();
      const wrong = L.cells.filter(c => c.goal !== undefined && res.val[c.id] !== c.goal);
      if (!wrong.length) rt.pass();
      else {
        const c = wrong[0];
        const got = res.val[c.id];
        rt.fail({ head: lazy(() => tr(`目标得到了 ${got}`, `The target got ${got}`)), body: lazy(() => tr(`目标格子需要 <b>${c.goal}</b>，现在收到的是 <b>${got}</b>。${got === 0 ? '它没有收到任何箭头。' : '数一数，有哪些箭头指向了它？'}`, `The target cell needs <b>${c.goal}</b>, but it is receiving <b>${got}</b>. ${got === 0 ? 'No arrow reaches it at all.' : 'Count them: which arrows point into it?'}`)) });
      }
    },
  };
}
