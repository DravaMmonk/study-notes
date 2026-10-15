// Ch.2: trace every route on a one-way street map.

import { reduced, buzz, toast } from '../util.js';
import { allRoutes } from '../algo.js';
import { E } from '../svg.js';
import { rt } from '../runtime.js';

export function traceMode(L, saved) {
  const st = { route: [], found: saved && saved.found ? saved.found : [], flash: null };
  const by = Object.fromEntries(L.cells.map(c => [c.id, c])), total = allRoutes(L.start, L.end, L.edges).length;
  const has = (a, b) => L.edges.some(e => e[0] === a && e[1] === b);
  const name = id => by[id].label;
  return {
    st,
    save: () => ({ found: st.found }),
    scene() {
      const showRoute = st.route.length ? st.route : st.flash || [];
      const cells = L.cells.map(c => {
        const k = showRoute.indexOf(c.id);
        const cls = [k >= 0 ? (st.route.length ? 'sel' : 'path') : '', c.id === L.start && !st.route.length ? 'coach' : ''];
        return { id: c.id, x: c.x, y: c.y, w: 92, h: 66, label: c.label, value: k >= 0 ? k + 1 : '', cls: cls.filter(Boolean).join(' '), tap: true };
      });
      const onRoute = (a, b) => { const i = showRoute.indexOf(a); return i >= 0 && showRoute[i + 1] === b; };
      const edges = L.edges.map(([a, b]) => E(a, b, onRoute(a, b) ? (st.route.length ? 'sel' : 'good') : 'idle'));
      return { cells, edges };
    },
    note: () => st.route.length ? `当前路线：${st.route.map(name).join(' → ')}` : `从「${name(L.start)}」开始点。`,
    onCell(id) {
      st.flash = null;
      if (!st.route.length) {
        if (id !== L.start) { toast(`路线要从「${name(L.start)}」出发`); buzz(20); return; }
        st.route = [id];
      } else {
        const last = st.route[st.route.length - 1];
        if (id === last) { st.route.pop(); rt.refresh(); return; }
        if (!has(last, id)) { toast(`没有从「${name(last)}」通往「${name(id)}」的单行道`); buzz(20); return; }
        st.route.push(id);
        if (id === L.end) {
          const key = st.route.join('>');
          if (st.found.some(r => r.join('>') === key)) toast('这条路线已经找过了');
          else { st.found = [...st.found, st.route]; toast(`找到第 ${st.found.length} 条路线`); buzz(15); }
          st.flash = st.route;
          st.route = [];
          rt.persist();
          rt.refresh();
          if (st.found.length === total) setTimeout(rt.pass, reduced() ? 0 : 500);
          return;
        }
      }
      buzz(6);
      rt.refresh();
    },
    panel() {
      return `<div class="pcard"><h3>已找到的路线<small>${st.found.length} / ${total}</small></h3>
        <div class="routes">${st.found.length ? st.found.map((r, k) => `<div class="route">${k + 1}. ${r.map(name).join(' → ')}</div>`).join('') : '<div class="route empty">还没有</div>'}
        ${st.route.length ? `<div class="route now">正在走：${st.route.map(name).join(' → ')}</div>` : ''}</div></div>
        <div class="pcard"><h3>规则</h3><p>只能顺着箭头走。点到「${name(L.end)}」就记下一条路线；同一条路线只算一次。</p></div>`;
    },
    dock: () => ({ meta: `已找到 <b>${st.found.length}</b> / ${total} 条`, sec: st.route.length ? '撤销一步' : '', secAct: 'undo' }),
    act(name2) { if (name2 === 'undo') { st.route.pop(); rt.refresh(); } },
  };
}
