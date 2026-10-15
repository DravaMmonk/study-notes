// Ch.9: pack the backpack by hand, with two greedy shortcuts.

import { reduced, buzz, toast } from '../util.js';
import { knapBest } from '../algo.js';
import { rt } from '../runtime.js';

export function packMode(L, saved) {
  const st = { ti: 0, bags: L.tests.map((_, k) => (saved && saved.bags && saved.bags[k]) || []), tried: L.tests.map(() => new Set()), msg: null };
  const target = k => knapBest(L.tests[k]);
  const sum = (k, f) => st.bags[k].reduce((s, i) => s + L.tests[k].items[i][f], 0);
  const solved = k => sum(k, 'v') >= target(k);
  st.bags.forEach((b, k) => st.tried[k].add(b.join(',')));
  const settle = () => {
    st.tried[st.ti].add(st.bags[st.ti].join(','));
    rt.persist();
    rt.refresh();
    if (!solved(st.ti)) return;
    if (L.tests.every((_, k) => solved(k))) { setTimeout(rt.pass, reduced() ? 0 : 600); return; }
    toast(`第 ${st.ti + 1} 题完成，达到了目标价值`);
    const nx = L.tests.findIndex((_, k) => !solved(k));
    setTimeout(() => { if (rt.cur && rt.cur.ctl.st === st) { st.ti = nx; st.msg = null; rt.refresh(); } }, 1000);
  };
  return {
    st,
    save: () => ({ bags: st.bags }),
    tests: () => L.tests.map((t, k) => ({ label: `第 ${k + 1} 题 · ${t.W} kg 背包`, status: solved(k) ? 'pass' : null })),
    selectTest(k) { st.ti = k; st.msg = null; rt.refresh(); },
    custom() {
      const t = L.tests[st.ti], bag = st.bags[st.ti], used = sum(st.ti, 'w'), val = sum(st.ti, 'v'), tg = target(st.ti);
      return `<div class="pack">
        <div class="bag">
          <div class="bag-meta"><span>背包 <b>${used}</b> / ${t.W} kg</span><span class="${val >= tg ? 'hit' : ''}">价值 <b>${val}</b> · 目标 ${tg}</span></div>
          <div class="bag-bar" role="img" aria-label="背包装了 ${used} 千克，上限 ${t.W} 千克">${bag.map(k => `<i style="flex:${t.items[k].w};background:var(--t${k % 6})"><span>${t.items[k].n}</span></i>`).join('')}${t.W > used ? `<i class="free" style="flex:${t.W - used}"></i>` : ''}</div>
        </div>
        <div class="items">${t.items.map((it, k) => `<button class="itm" type="button" aria-pressed="${bag.includes(k)}" data-act="item" data-k="${k}" style="--c:var(--t${k % 6})"><span class="itm-top"><b>${it.n}</b><span class="v">价值 ${it.v}</span></span><span class="kg" aria-label="${it.w} 千克">${'<i></i>'.repeat(it.w)}<em>${it.w} kg</em></span></button>`).join('')}</div>
      </div>`;
    },
    note: () => '点物品放进或拿出背包。',
    panel() {
      const n = L.tests[st.ti].items.length;
      return `<div class="pcard"><h3>自动装包</h3><p>两种常见的捷径：按某种顺序挨个看，装得下就装。</p>
          <div class="chips two"><button class="chip" type="button" data-act="greedy" data-g="val">最贵的先放</button><button class="chip" type="button" data-act="greedy" data-g="ratio">最划算的先放</button></div>
          ${st.msg ? `<div class="msg ${st.msg.cls}">${st.msg.html}</div>` : ''}<p class="opthint">「最划算」指每千克的价值最高。</p></div>
        <div class="pcard"><h3>试过的装法<small>${st.tried[st.ti].size} / ${2 ** n} 种</small></h3><p>${n} 件物品，每件都有带和不带两种选择，一共 <b>${2 ** n}</b> 种装法。物品每多一件，装法就翻一倍。</p></div>`;
    },
    dock: () => ({ meta: `价值 <b>${sum(st.ti, 'v')}</b> · 目标 <b>${target(st.ti)}</b>`, sec: st.bags[st.ti].length ? '倒空背包' : '', secAct: 'empty' }),
    act(name, el) {
      const t = L.tests[st.ti], bag = st.bags[st.ti];
      if (name === 'item') {
        const k = +el.dataset.k;
        if (bag.includes(k)) bag.splice(bag.indexOf(k), 1);
        else {
          const left = t.W - sum(st.ti, 'w');
          if (t.items[k].w > left) { toast(`装不下：${t.items[k].n}重 ${t.items[k].w} kg，背包只剩 ${left} kg`); buzz([20, 40, 20]); return; }
          bag.push(k);
          bag.sort((p, q) => p - q);
        }
        st.msg = null;
        buzz(6);
        settle();
      }
      if (name === 'greedy') {
        const g = el.dataset.g, score = it => (g === 'val' ? it.v : it.v / it.w);
        const order = t.items.map((_, k) => k).sort((p, q) => score(t.items[q]) - score(t.items[p]));
        const nb = [];
        let left = t.W;
        for (const k of order) if (t.items[k].w <= left) { nb.push(k); left -= t.items[k].w; }
        st.bags[st.ti] = nb.sort((p, q) => p - q);
        const v = sum(st.ti, 'v'), tg = target(st.ti);
        st.msg = { cls: v >= tg ? 'good' : 'bad', html: `按「${g === 'val' ? '最贵的先放' : '最划算的先放'}」依次看 ${order.map(k => t.items[k].n).join('、')}，装得下就装。结果装了${nb.map(k => t.items[k].n).join('、')}，价值 <b>${v}</b>。${v >= tg ? '正好达到目标。' : `比目标少 <b>${tg - v}</b>。`}` };
        buzz(10);
        settle();
      }
      if (name === 'empty') { st.bags[st.ti] = []; st.msg = null; rt.persist(); rt.refresh(); }
    },
  };
}
