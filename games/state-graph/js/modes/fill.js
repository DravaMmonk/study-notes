// Ch.2: fill each cell by hand with the number pad.

import { buzz, ICON, toast } from '../util.js';
import { evalGraph } from '../algo.js';
import { E } from '../svg.js';
import { rt } from '../runtime.js';
import { tr, lazy } from '../i18n.js';
import { W } from '../svg.js';

export function fillMode(L, saved) {
  const st = { vals: saved && saved.vals ? saved.vals : {}, sel: null, input: '', marks: {} };
  const by = Object.fromEntries(L.cells.map(c => [c.id, c]));
  const truth = evalGraph(L.cells.map(c => (c.id === L.start ? { ...c, fixed: 1 } : c)), L.edges);
  const order = truth.order, preds = id => L.edges.filter(e => e[1] === id).map(e => e[0]);
  const name = id => (by[id].grid ? tr(`第 ${+id.split(',')[0] + 1} 行第 ${+id.split(',')[1] + 1} 列的路口`, `the crossing at row ${+id.split(',')[0] + 1}, column ${+id.split(',')[1] + 1}`) : tr(`「${by[id].label}」`, `“${by[id].label}”`));
  const valOf = id => (id === L.start ? 1 : st.vals[id] ?? null);
  const empties = () => L.cells.filter(c => c.id !== L.start && valOf(c.id) === null).length;
  return {
    st,
    save: () => ({ vals: st.vals }),
    scene() {
      const pr = st.sel ? preds(st.sel) : [];
      const cells = L.cells.map(c => {
        const v = valOf(c.id);
        const cls = [c.id === L.start ? 'src' : '', st.sel === c.id ? 'sel' : '', pr.includes(c.id) ? 'pred' : '', st.marks[c.id] || ''];
        const base = by[c.id].grid
          ? { w: 58, h: 58, corner: c.id === L.start ? W.start : c.id === L.end ? W.end : '' }
          : { w: 84, h: 64, label: c.label };
        return { id: c.id, x: c.x, y: c.y, ...base, value: st.sel === c.id ? (st.input || '_') : v === null ? '' : v, cls: cls.filter(Boolean).join(' '), tap: true, aria: name(c.id) };
      });
      const edges = L.edges.map(([a, b]) => E(a, b, b === st.sel ? 'hot' : by[a].grid ? 'dim' : 'idle'));
      return { cells, edges };
    },
    note: () => st.sel ? tr(`指向${name(st.sel)}的箭头来自：${preds(st.sel).map(name).join('、')}`, `The arrows into ${name(st.sel)} come from: ${preds(st.sel).map(name).join(', ')}`) : tr(`已填 ${L.cells.length - 1 - empties()} / ${L.cells.length - 1}`, `Filled ${L.cells.length - 1 - empties()} / ${L.cells.length - 1}`),
    onCell(id) {
      if (rt.cur.running) return;
      if (id === L.start) { toast(tr('起点已经填好了：到这里的路线算 1 条', 'The start is already filled in: it counts as 1 route')); return; }
      st.sel = st.sel === id ? null : id;
      st.input = st.sel && st.vals[id] != null ? String(st.vals[id]) : '';
      rt.refresh();
    },
    panel() {
      return `<div class="pcard"><h3>${tr('规则', 'Rule')}</h3><div class="rule">${tr('到一个地点的路线数<br>= 所有指向它的地点的路线数之和', 'Routes to a place<br>= the sum of the routes to every place that points to it')}</div><p>${tr(`起点算 <b>1</b>。选中一个${L.grid ? '路口' : '地点'}后，它的「上一站」会亮起黄色虚框，指向它的箭头会变成黄色。`, `The start counts as <b>1</b>. When you select a ${L.grid ? 'crossing' : 'place'}, its “previous stops” get a dashed yellow frame and the arrows into it turn yellow.`)}</p></div>`;
    },
    dock() {
      if (st.sel) return { pad: true };
      return { meta: tr(`已填 <b>${L.cells.length - 1 - empties()}</b> / ${L.cells.length - 1}`, `Filled <b>${L.cells.length - 1 - empties()}</b> / ${L.cells.length - 1}`), go: tr('检查', 'Check'), act: 'check', goIcon: ICON.check };
    },
    padTitle: () => tr(`到${name(st.sel)}的路线数`, `Routes to ${name(st.sel)}`),
    key(k) {
      if (!st.sel) return;
      if (k === 'del') st.input = st.input.slice(0, -1);
      else if (k === 'ok') {
        st.vals[st.sel] = st.input === '' ? null : Number(st.input);
        delete st.marks[st.sel];
        rt.persist();
        const next = order.find(id => id !== L.start && valOf(id) === null);
        st.sel = next || null;
        st.input = '';
      } else if (st.input.length < 4) st.input = (st.input === '0' ? '' : st.input) + k;
      buzz(5);
      rt.refresh();
    },
    act(name2) { if (name2 === 'check') this.check(); },
    check() {
      const left = empties();
      if (left) { toast(tr(`还有 ${left} 个${L.grid ? '路口' : '地点'}没填`, `${left} ${L.grid ? 'crossing' : 'place'}${left === 1 ? ' is' : 's are'} still empty`)); buzz(20); return; }
      st.marks = {};
      const wrong = order.filter(id => valOf(id) !== truth.val[id]);
      order.forEach(id => { if (id !== L.start) st.marks[id] = wrong.includes(id) ? 'bad' : 'ok'; });
      rt.refresh();
      if (!wrong.length) { rt.pass(); return; }
      const w = wrong[0], ps = preds(w), pv = ps.map(valOf), right = truth.val[w], mine = valOf(w), n = wrong.length;
      const body = () => {
        const from = ps.map(name).join(tr('和', ' and '));
        return ps.length === 1
          ? tr(`指向${name(w)}的箭头只来自${from}，所以它和${from}一样，是 <b>${pv[0]}</b>。你填的是 <b>${mine}</b>。`, `The only arrow into ${name(w)} comes from ${from}, so it is the same as ${from}: <b>${pv[0]}</b>. You wrote <b>${mine}</b>.`)
          : tr(`指向${name(w)}的箭头来自${from}，它们的数是 ${pv.join(' 和 ')}，所以应该是 <b>${pv.join(' + ')} = ${right}</b>。你填的是 <b>${mine}</b>。`, `The arrows into ${name(w)} come from ${from}, whose numbers are ${pv.join(' and ')}, so it should be <b>${pv.join(' + ')} = ${right}</b>. You wrote <b>${mine}</b>.`);
      };
      rt.fail({ head: lazy(() => tr(`${n} 处填得不对`, `${n} cell${n === 1 ? ' is' : 's are'} wrong`)), body: lazy(() => tr(`红框是填错的格子。先看第一个：${body()}`, `The red frames mark the wrong cells. Look at the first one: ${body()}`)) });
    },
  };
}
