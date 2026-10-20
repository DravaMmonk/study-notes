// Ch.9: pack the backpack by hand, with two greedy shortcuts.

import { reduced, buzz, toast } from '../util.js';
import { knapBest } from '../algo.js';
import { rt } from '../runtime.js';
import { T, tr, lazy } from '../i18n.js';

const GREEDY = { val: T('最贵的先放', 'Priciest first'), ratio: T('最划算的先放', 'Best value first') };

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
    toast(tr(`第 ${st.ti + 1} 题完成，达到了目标价值`, `Puzzle ${st.ti + 1} done: you reached the target value`));
    const nx = L.tests.findIndex((_, k) => !solved(k));
    setTimeout(() => { if (rt.cur && rt.cur.ctl.st === st) { st.ti = nx; st.msg = null; rt.refresh(); } }, 1000);
  };
  return {
    st,
    save: () => ({ bags: st.bags }),
    tests: () => L.tests.map((t, k) => ({ label: tr(`第 ${k + 1} 题 · ${t.W} kg 背包`, `Puzzle ${k + 1} · ${t.W} kg backpack`), status: solved(k) ? 'pass' : null })),
    selectTest(k) { st.ti = k; st.msg = null; rt.refresh(); },
    custom() {
      const t = L.tests[st.ti], bag = st.bags[st.ti], used = sum(st.ti, 'w'), val = sum(st.ti, 'v'), tg = target(st.ti);
      return `<div class="pack">
        <div class="bag">
          <div class="bag-meta"><span>${tr('背包', 'Backpack')} <b>${used}</b> / ${t.W} kg</span><span class="${val >= tg ? 'hit' : ''}">${tr('价值', 'Value')} <b>${val}</b> · ${tr('目标', 'target')} ${tg}</span></div>
          <div class="bag-bar" role="img" aria-label="${tr(`背包装了 ${used} 千克，上限 ${t.W} 千克`, `The backpack holds ${used} kg of ${t.W} kg`)}">${bag.map(k => `<i style="flex:${t.items[k].w};background:var(--t${k % 6})"><span>${t.items[k].n}</span></i>`).join('')}${t.W > used ? `<i class="free" style="flex:${t.W - used}"></i>` : ''}</div>
        </div>
        <div class="items">${t.items.map((it, k) => `<button class="itm" type="button" aria-pressed="${bag.includes(k)}" data-act="item" data-k="${k}" style="--c:var(--t${k % 6})"><span class="itm-top"><b>${it.n}</b><span class="v">${tr('价值', 'value')} ${it.v}</span></span><span class="kg" aria-label="${it.w} ${tr('千克', 'kg')}">${'<i></i>'.repeat(it.w)}<em>${it.w} kg</em></span></button>`).join('')}</div>
      </div>`;
    },
    panel() {
      const n = L.tests[st.ti].items.length;
      return `<div class="pcard"><h3>${tr('自动装包', 'Auto-pack')}</h3><p>${tr('两种常见的捷径：按某种顺序挨个看，装得下就装。', 'Two popular shortcuts: go through the items in some order and pack each one that still fits.')}</p>
          <div class="chips two"><button class="chip" type="button" data-act="greedy" data-g="val">${GREEDY.val}</button><button class="chip" type="button" data-act="greedy" data-g="ratio">${GREEDY.ratio}</button></div>
          ${st.msg ? `<div class="msg ${st.msg.cls}">${st.msg.html}</div>` : ''}<p class="opthint">${tr('「最划算」指每千克的价值最高。', '“Best value” means the highest value per kilogram.')}</p></div>
        <div class="pcard"><h3>${tr('试过的装法', 'Packings tried')}<small>${st.tried[st.ti].size} / ${2 ** n}</small></h3><p>${tr(`${n} 件物品，每件都有带和不带两种选择，一共 <b>${2 ** n}</b> 种装法。物品每多一件，装法就翻一倍。`, `${n} items, each either taken or left behind: <b>${2 ** n}</b> packings in all. Every extra item doubles the number of packings.`)}</p></div>`;
    },
    dock: () => ({ meta: tr(`价值 <b>${sum(st.ti, 'v')}</b> · 目标 <b>${target(st.ti)}</b>`, `Value <b>${sum(st.ti, 'v')}</b> · target <b>${target(st.ti)}</b>`), sec: st.bags[st.ti].length ? tr('倒空背包', 'Empty the backpack') : '', secAct: 'empty' }),
    act(name, el) {
      const t = L.tests[st.ti], bag = st.bags[st.ti];
      if (name === 'item') {
        const k = +el.dataset.k;
        if (bag.includes(k)) bag.splice(bag.indexOf(k), 1);
        else {
          const left = t.W - sum(st.ti, 'w');
          if (t.items[k].w > left) { toast(tr(`装不下：${t.items[k].n}重 ${t.items[k].w} kg，背包只剩 ${left} kg`, `It won’t fit: ${t.items[k].n} (${t.items[k].w} kg), with only ${left} kg of room left`)); buzz([20, 40, 20]); return; }
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
        const names = ks => ks.map(k => t.items[k].n);
        st.msg = { cls: v >= tg ? 'good' : 'bad', html: lazy(() => tr(`按「${GREEDY[g]}」依次看 ${names(order).join('、')}，装得下就装。结果装了${names(nb).join('、')}，价值 <b>${v}</b>。${v >= tg ? '正好达到目标。' : `比目标少 <b>${tg - v}</b>。`}`, `“${GREEDY[g]}” looks at ${names(order).join(', ')} in that order and packs whatever fits. It packed ${names(nb).join(', ')}, for a value of <b>${v}</b>. ${v >= tg ? 'That hits the target exactly.' : `That is <b>${tg - v}</b> short of the target.`}`)) };
        buzz(10);
        settle();
      }
      if (name === 'empty') { st.bags[st.ti] = []; st.msg = null; rt.persist(); rt.refresh(); }
    },
  };
}
