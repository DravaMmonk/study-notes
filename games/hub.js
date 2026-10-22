// The games hub: one card per game in games.js, with the player's progress, on the shared kit's top bar, hero and
// cards (kit/ui.css, kit/bar.js).

import { GAMES } from './games.js';
import { currentLang, tr } from './kit/lang.js';
import { wireBar } from './kit/bar.js';
import { mountBoxy } from './boxy/boxy.js';
import { mountPress } from './press/press.js';
import { mountDetach } from './detach/detach.js';
import { mountStick } from './stick/stick.js';

// Card art: each game's illustration, mounted live into its card. All four are anatomy-kit figures built into plain
// modules for this page (each folder's build.mjs): State Graph's robot Boxy, Vision Complete's filter press, Q.E.D.'s
// Detach press and Syntax Graph's composing stick.
const ART = { grid: mountBoxy, pipeline: mountPress, detach: mountDetach, stick: mountStick };
let unmount = [];

function render() {
  const en = currentLang() === 'en', pick = x => (typeof x === 'string' ? x : en ? x.en : x.zh);
  document.querySelector('#games').innerHTML = GAMES.filter(g => !g.hidden).map(g => {
    const done = Math.min(g.progress(), g.levels), started = done > 0;
    return `<a class="kit-card game" href="${g.href}">
      <div class="art" data-art="${g.art}"></div>
      <div class="kit-card-body">
        <span class="kit-card-topic">${pick(g.topic)}${g.dev ? `<em class="dev-tag">${tr('开发中', 'In development')}</em>` : ''}</span>
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
  document.querySelector('meta[name="description"]').content = tr('把课程做成解谜关卡的学习游戏：视觉完备（计算机视觉）、状态之图（动态规划）、证明完毕（形式化证明）、句法之图（英语语法）。', 'Courses turned into puzzle games: Vision Complete (computer vision), State Graph (dynamic programming), Q.E.D. (formal proof) and Syntax Graph (English grammar).');
}

wireBar({ onLang: () => { paintPage(); render(); } });
paintPage();
render();
// Progress may change in another tab.
addEventListener('pageshow', render);
