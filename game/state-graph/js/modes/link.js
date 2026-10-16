// Ch.8: link equal letters without crossing lines.

import { reduced, buzz, toast } from '../util.js';
import { lcsLen } from '../algo.js';
import { E } from '../svg.js';
import { rt } from '../runtime.js';
import { tr } from '../i18n.js';

export function linkMode(L, saved) {
  const st = { ti: 0, links: L.tests.map((_, k) => (saved && saved.links && saved.links[k]) || []), sel: null, flash: null, hint: false };
  const target = k => lcsLen(L.tests[k].a, L.tests[k].b), solved = k => st.links[k].length >= target(k);
  return {
    st,
    save: () => ({ links: st.links }),
    tests: () => L.tests.map((t, k) => ({ label: `${tr(`第 ${k + 1} 题`, `Puzzle ${k + 1}`)} · ${t.a} / ${t.b}`, status: solved(k) ? 'pass' : null })),
    selectTest(k) { st.ti = k; st.sel = null; st.flash = null; st.hint = false; rt.refresh(); },
    scene() {
      const { a, b } = L.tests[st.ti], links = st.links[st.ti], sp = 50, sz = 44, n = Math.max(a.length, b.length);
      const oa = (n - a.length) * sp / 2, ob = (n - b.length) * sp / 2, fl = st.flash ? st.flash.links : [];
      const la = new Set(links.map(l => l[0])), lb = new Set(links.map(l => l[1]));
      const isFl = (i, j) => fl.some(l => l[0] === i && l[1] === j);
      const cls = (side, idx) => {
        const linked = side === 'a' ? la.has(idx) : lb.has(idx), selected = st.sel && st.sel.side === side && st.sel.idx === idx;
        const flashed = st.flash && (side === 'a' ? st.flash.try[0] === idx || fl.some(l => l[0] === idx) : st.flash.try[1] === idx || fl.some(l => l[1] === idx));
        return ['tile', selected ? 'sel' : '', flashed ? 'bad' : linked ? 'ok' : ''].filter(Boolean).join(' ');
      };
      const cells = [
        ...[...a].map((ch, i) => ({ id: `a${i}`, x: oa + i * sp, y: 0, w: sz, h: sz, value: ch, cls: cls('a', i), tap: true, aria: tr(`上面第 ${i + 1} 个字 ${ch}`, `Top letter ${i + 1}: ${ch}`) })),
        ...[...b].map((ch, j) => ({ id: `b${j}`, x: ob + j * sp, y: 150, w: sz, h: sz, value: ch, cls: cls('b', j), tap: true, aria: tr(`下面第 ${j + 1} 个字 ${ch}`, `Bottom letter ${j + 1}: ${ch}`) })),
      ];
      const edges = links.map(([i, j]) => E(`a${i}`, `b${j}`, isFl(i, j) ? 'linkbad' : 'link'));
      if (st.flash) edges.push(E(`a${st.flash.try[0]}`, `b${st.flash.try[1]}`, 'linkbad'));
      return { cells, edges };
    },
    boardOpt: () => ({ maxScale: 1.3 }),
    note: () => (st.sel ? tr(`已选中${st.sel.side === 'a' ? '上面' : '下面'}的「${L.tests[st.ti][st.sel.side][st.sel.idx]}」，再点另一行里相同的字。`, `Selected “${L.tests[st.ti][st.sel.side][st.sel.idx]}” in the ${st.sel.side === 'a' ? 'top' : 'bottom'} row. Now click the same letter in the other row.`) : tr('连上的字从左往右读，就是两串字共有的一串。', 'Read left to right, the linked letters are a sequence the two strings share.')),
    onCell(id) {
      const side = id[0], idx = +id.slice(1), t = L.tests[st.ti], links = st.links[st.ti];
      st.flash = null;
      const at = links.findIndex(l => (side === 'a' ? l[0] : l[1]) === idx);
      if (!st.sel && at >= 0) { links.splice(at, 1); toast(tr('拆掉了一根线', 'Removed a line')); rt.persist(); rt.refresh(); return; }
      if (!st.sel || st.sel.side === side) { st.sel = st.sel && st.sel.side === side && st.sel.idx === idx ? null : { side, idx }; buzz(5); rt.refresh(); return; }
      const i = side === 'a' ? idx : st.sel.idx, j = side === 'b' ? idx : st.sel.idx;
      st.sel = null;
      if (t.a[i] !== t.b[j]) { toast(tr(`「${t.a[i]}」和「${t.b[j]}」不一样，不能连`, `“${t.a[i]}” and “${t.b[j]}” are different, so they can’t be linked`)); buzz(20); rt.refresh(); return; }
      if (links.some(l => l[0] === i || l[1] === j)) { toast(tr('每个字最多连一根线。先点它，拆掉原来的线', 'Each letter takes at most one line. Click it first to remove its line')); buzz(20); rt.refresh(); return; }
      const cross = links.filter(l => (l[0] - i) * (l[1] - j) < 0);
      if (cross.length) {
        st.flash = { links: cross, try: [i, j] };
        toast(tr('线不能交叉', 'Lines can’t cross'));
        buzz([20, 40, 20]);
        rt.refresh();
        setTimeout(() => { if (rt.cur && rt.cur.ctl.st === st && st.flash) { st.flash = null; rt.refresh(); } }, 1200);
        return;
      }
      links.push([i, j]);
      links.sort((p, q) => p[0] - q[0]);
      rt.persist();
      buzz(8);
      rt.refresh();
      if (!solved(st.ti)) return;
      if (L.tests.every((_, k) => solved(k))) { setTimeout(rt.pass, reduced() ? 0 : 500); return; }
      toast(tr(`第 ${st.ti + 1} 题完成`, `Puzzle ${st.ti + 1} done`));
      const nx = L.tests.findIndex((_, k) => !solved(k));
      setTimeout(() => { if (rt.cur && rt.cur.ctl.st === st) this.selectTest(nx); }, 900);
    },
    panel() {
      const t = L.tests[st.ti], links = st.links[st.ti];
      return `<div class="pcard"><h3>${tr('三条规则', 'Three rules')}</h3><p>${tr('1. 只能连<b>相同</b>的字<br>2. 每个字最多连<b>一根</b>线<br>3. 线<b>不能交叉</b>', '1. Only link <b>equal</b> letters<br>2. Each letter takes at most <b>one</b> line<br>3. Lines <b>can’t cross</b>')}</p></div>
        <div class="pcard"><h3>${tr('连出的公共子序列', 'Common subsequence so far')}<small>${links.length} / ${target(st.ti)}${tr(' 个字', ' letters')}</small></h3>
          <div class="diff">${links.length ? links.map(l => `<span class="dt ins">${t.a[l[0]]}</span>`).join('') : `<span class="opthint">${tr('还没有连线', 'No lines yet')}</span>`}</div></div>
        <div class="pcard"><h3>${tr('卡住了？', 'Stuck?')}</h3>${st.hint ? `<p>${L.hints[st.ti]}</p>` : `<button class="sec-btn" type="button" data-act="hint">${tr('看提示', 'Show a hint')}</button>`}</div>`;
    },
    dock: () => ({ meta: tr(`已连 <b>${st.links[st.ti].length}</b> 根 · 目标 <b>${target(st.ti)}</b> 根`, `<b>${st.links[st.ti].length}</b> lines · target <b>${target(st.ti)}</b>`), sec: st.links[st.ti].length ? tr('清空这题', 'Clear this puzzle') : '', secAct: 'clear' }),
    act(name) {
      if (name === 'hint') st.hint = true;
      if (name === 'clear') { st.links[st.ti] = []; st.sel = null; rt.persist(); }
      rt.refresh();
    },
  };
}
