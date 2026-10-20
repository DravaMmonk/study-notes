// Ch.10: match each story to the machine that solves it.

import { reduced, buzz, ICON, toast } from '../util.js';
import { rt } from '../runtime.js';
import { tr } from '../i18n.js';

export function matchMode(L, saved) {
  const st = { ans: { ...((saved && saved.ans) || {}) }, marks: {} };
  const picked = () => L.stories.filter(s => st.ans[s.id]).length;
  return {
    st,
    save: () => ({ ans: st.ans }),
    custom() {
      return `<div class="stories">${L.stories.map((s, k) => {
        const mark = st.marks[s.id];
        return `<article class="story${mark ? ` ${mark}` : ''}"><span class="eyebrow">${tr('故事', 'Story')} ${k + 1}${mark === 'ok' ? tr(' · 答对了', ' · correct') : mark === 'no' ? tr(' · 再想想', ' · think again') : ''}</span><p>${s.t}</p>
          <div class="mchips" role="radiogroup" aria-label="${tr(`故事 ${k + 1} 用哪台机器`, `Which machine for story ${k + 1}`)}">${L.options.map(o => `<button class="mchip" type="button" role="radio" aria-checked="${st.ans[s.id] === o.v}" data-act="pick" data-s="${s.id}" data-o="${o.v}">${o.l}</button>`).join('')}</div>
          ${mark === 'ok' ? `<p class="why">${s.why}</p>` : mark === 'no' ? `<p class="why no">${s.hint}</p>` : ''}</article>`;
      }).join('')}</div>`;
    },
    note: () => '',
    panel: () => `<div class="pcard"><h3>${tr('元件箱速查', 'Parts at a glance')}</h3><div class="list">${L.refs.map(([n, d]) => `<div class="ref"><b>${n}</b><span>${d}</span></div>`).join('')}</div></div>`,
    dock: () => ({ meta: tr(`已选 <b>${picked()}</b> / ${L.stories.length}`, `Answered <b>${picked()}</b> / ${L.stories.length}`), go: tr('检查', 'Check'), act: 'check', goIcon: ICON.check }),
    act(name, el) {
      if (name === 'pick') { st.ans[el.dataset.s] = el.dataset.o; delete st.marks[el.dataset.s]; rt.persist(); buzz(5); rt.refresh(); return; }
      if (name !== 'check') return;
      if (picked() < L.stories.length) { toast(tr(`还有 ${L.stories.length - picked()} 个故事没选`, `${L.stories.length - picked()} more ${L.stories.length - picked() === 1 ? 'story needs' : 'stories need'} an answer`)); buzz(20); return; }
      L.stories.forEach(s => { st.marks[s.id] = st.ans[s.id] === s.a ? 'ok' : 'no'; });
      const wrong = L.stories.filter(s => st.marks[s.id] === 'no').length;
      rt.refresh();
      if (!wrong) { buzz(15); setTimeout(rt.pass, reduced() ? 0 : 700); return; }
      toast(tr(`${L.stories.length - wrong} 个对了，还有 ${wrong} 个要再想想`, `${L.stories.length - wrong} right, ${wrong} to think about again`));
      buzz([20, 40, 20]);
    },
  };
}
