// The games hub: one card per game in games.js, with the player's progress, on the shared kit's top bar, hero and
// cards (kit/ui.css, kit/bar.js).

import { GAMES } from './games.js';
import { currentLang, tr } from './kit/lang.js';
import { wireBar } from './kit/bar.js';
import { mountBoxy } from './boxy/boxy.js';
import { mountPress } from './press/press.js';

// Card art: each game's illustration, mounted live into its card. Two are built into plain modules for this page:
// State Graph's robot Boxy (boxy/build.mjs) and Vision Complete's filter press (press/build.mjs). Q.E.D.'s is a still
// drawing: two premises wired through Detach into the goal.
const mountProof = (el) => {
  const card = (x, y, w, text, cls = '') => `<g class="qed-card ${cls}" transform="translate(${x} ${y})"><rect width="${w}" height="34" rx="8"/><text x="${w / 2}" y="22">${text}</text></g>`;
  el.innerHTML = `<svg class="qed-art" viewBox="0 0 320 170" aria-hidden="true"><path d="M86 42C120 42 120 82 150 82M86 122C120 122 120 98 150 98"/><path class="is-done" d="M226 90H262"/>${card(10, 25, 76, 'A → B')}${card(10, 105, 76, 'A')}${card(150, 73, 76, 'MP', 'is-rule')}${card(262, 73, 48, '∎', 'is-goal')}</svg>`;
  return () => { el.innerHTML = ''; };
};
const ART = { grid: mountBoxy, pipeline: mountPress, proof: mountProof };
let unmount = [];

function render() {
  const en = currentLang() === 'en', pick = x => (typeof x === 'string' ? x : en ? x.en : x.zh);
  document.querySelector('#games').innerHTML = GAMES.map(g => {
    const done = Math.min(g.progress(), g.levels), started = done > 0;
    return `<a class="kit-card game" href="${g.href}">
      <div class="art" data-art="${g.art}"></div>
      <div class="kit-card-body">
        <span class="kit-card-topic">${pick(g.topic)}</span>
        <h2 class="kit-card-title">${en ? g.en : g.title}<small lang="${en ? 'zh-CN' : 'en'}">${en ? g.title : g.en}</small></h2>
        <p class="kit-card-desc">${pick(g.desc)}</p>
        <div class="meter" aria-label="${tr(`已通过 ${done} / ${g.levels} 关`, `${done} of ${g.levels} levels cleared`)}"><i style="width:${(done / g.levels) * 100}%"></i></div>
        <div class="kit-card-foot"><span>${tr(`${done} / ${g.levels} 关`, `${done} / ${g.levels} levels`)}</span><b>${started ? tr('继续', 'Continue') : tr('开始', 'Start')} →</b></div>
      </div></a>`;
  }).join('');
  unmount.forEach(stop => stop());
  unmount = [...document.querySelectorAll('#games [data-art]')].map(el => ART[el.dataset.art](el, { lang: currentLang() }));
}

function paintPage() {
  document.title = tr('游戏 — 学习笔记', 'Games — Study Notes');
  document.querySelector('meta[name="description"]').content = tr('把课程做成解谜关卡的学习游戏：视觉完备（计算机视觉）、状态之图（动态规划）、证明完毕（形式化证明）。', 'Courses turned into puzzle games: Vision Complete (computer vision), State Graph (dynamic programming) and Q.E.D. (formal proof).');
}

wireBar({ onLang: () => { paintPage(); render(); } });
paintPage();
render();
// Progress may change in another tab.
addEventListener('pageshow', render);
