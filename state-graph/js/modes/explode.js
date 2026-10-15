// Ch.6: compare asking recursively with filling the table.

import { reduced, buzz, fmt } from '../util.js';
import { askCalls } from '../algo.js';
import { sceneSVG, treeScene } from '../svg.js';
import { rt } from '../runtime.js';

export function explodeMode(L, saved) {
  const st = { n: saved && saved.n ? saved.n : 4, max: saved && saved.max ? saved.max : 4, answered: false };
  return {
    st,
    save: () => ({ n: st.n, max: st.max }),
    custom() {
      const ask = askCalls(st.n), table = st.n + 1;
      const tree = st.n <= 7 ? `<div class="board">${sceneSVG(treeScene(st.n), { pad: 10, label: '问路法的提问树', maxScale: 1.2 })}</div>` : `<div class="toolarge">提问树有 ${fmt(ask)} 个节点，已经画不下了</div>`;
      const strip = Array.from({ length: Math.min(st.n, 9) + 1 }, (_, i) => ({ id: `s${i}`, x: i * 54, y: 0, w: 46, h: 46, value: '', corner: i, cls: 'lit' }));
      return `<div class="duo">
        <section class="slow"><h4>问路法</h4><span class="k">提问次数</span><span class="bignum">${fmt(ask)}</span>${tree}</section>
        <section class="fast"><h4>填表法</h4><span class="k">计算次数</span><span class="bignum">${fmt(table)}</span><div class="board">${sceneSVG({ cells: strip, edges: [] }, { pad: 6, maxScale: 1 })}</div>${st.n > 9 ? `<span class="k">……一直到第 ${st.n} 级，每级一次</span>` : ''}</section>
      </div>`;
    },
    note: () => (st.n <= 7 ? '同一种颜色、同一个数字，代表同一级台阶被问了好几遍。' : `台阶数 ${st.n}：问路法要问 ${fmt(askCalls(st.n))} 次。`),
    panel() {
      const q = L.question;
      return `<div class="pcard"><h3>台阶数<small>n = ${st.n}</small></h3>
        <input class="range" id="nRange" type="range" min="1" max="40" step="1" value="${st.n}" aria-label="台阶数">
        <p>拖到 30 以上，问路法要问几百万次，填表法只要 30 多次。</p></div>
        <div class="pcard" id="whyQ" ${st.max >= 30 ? '' : 'hidden'}><h3>想一想</h3><p><b>${q.q}</b></p>${q.opts.map((o, k) => `<button class="qopt" type="button" data-act="answer" data-k="${k}">${o}</button>`).join('')}</div>`;
    },
    dock: () => ({ meta: st.max >= 30 ? '回答规则面板里的问题' : `先把台阶数拖到 <b>30</b> 以上（现在 ${st.n}）` }),
    input(v) { st.n = v; st.max = Math.max(st.max, v); rt.persist(); rt.refreshKeepRange(); },
    act(name, el) {
      if (name !== 'answer' || st.answered) return;
      if (+el.dataset.k === L.question.a) { st.answered = true; el.classList.add('right'); buzz(15); setTimeout(rt.pass, reduced() ? 0 : 500); }
      else { el.classList.remove('wrong'); void el.offsetWidth; el.classList.add('wrong'); buzz(20); }
    },
  };
}
