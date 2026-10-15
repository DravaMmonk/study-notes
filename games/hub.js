// The games hub: one card per game in games.js, with the player's progress, and the shared theme button.

import { GAMES } from './games.js';
import { currentTheme, nextTheme, themeLabel, applyTheme } from './kit/theme.js';

const ART = {
  // Image cards wired left to right, as on Vision Complete's board.
  pipeline: `<svg viewBox="0 0 240 120" aria-hidden="true">
    <g class="kw is-live" style="--kw:var(--w2)"><path class="kw-halo" d="M70 60C95 60 95 40 120 40"/><path class="kw-line" d="M70 60C95 60 95 40 120 40"/><path class="kw-flow" d="M70 60C95 60 95 40 120 40"/></g>
    <g class="kw is-live" style="--kw:var(--w0)"><path class="kw-halo" d="M70 60C95 60 95 86 120 86"/><path class="kw-line" d="M70 60C95 60 95 86 120 86"/><path class="kw-flow" d="M70 60C95 60 95 86 120 86"/></g>
    <g class="kw is-live" style="--kw:var(--w1)"><path class="kw-halo" d="M164 40C182 40 178 62 196 62"/><path class="kw-line" d="M164 40C182 40 178 62 196 62"/><path class="kw-flow" d="M164 40C182 40 178 62 196 62"/></g>
    <g class="kw is-dead" style="--kw:var(--w3)"><path class="kw-halo" d="M164 86C182 86 178 62 196 62"/><path class="kw-line" d="M164 86C182 86 178 62 196 62"/></g>
    <rect class="hc" x="18" y="34" width="52" height="52" rx="8"/><rect class="hi" x="27" y="43" width="34" height="34" rx="3"/><rect class="hm" x="37" y="53" width="14" height="14"/>
    <rect class="hc" x="120" y="20" width="44" height="40" rx="7"/><rect class="hi soft" x="128" y="27" width="28" height="26" rx="3"/>
    <rect class="hc" x="120" y="66" width="44" height="40" rx="7"/><rect class="hi edge" x="128" y="73" width="28" height="26" rx="3"/>
    <rect class="hc out" x="196" y="40" width="34" height="44" rx="7"/></svg>`,
  // A grid the robot walks: its cell (red) adds the two cells it reads (amber), above and to the left.
  grid: `<svg viewBox="0 0 240 120" aria-hidden="true">
    ${[0, 1, 2].map(r => [0, 1, 2, 3].map(c => `<rect class="hc${r === 1 && c === 2 ? ' self' : (r === 0 && c === 2) || (r === 1 && c === 1) ? ' read' : ''}" x="${30 + c * 48}" y="${8 + r * 36}" width="38" height="28" rx="6"/><text class="hn" x="${49 + c * 48}" y="${27 + r * 36}">${[[1, 1, 1, 1], [1, 2, 3, ''], ['', '', '', '']][r][c]}</text>`).join('')).join('')}
    <g transform="translate(150 30) scale(.9)"><path d="M16 2.5V7" class="bot-ant"/><circle cx="16" cy="2.6" r="2.2" class="bot-lamp"/><rect x="5" y="7" width="22" height="16" rx="5" class="bot-head"/><circle cx="11.5" cy="15" r="2.4" class="bot-eye"/><circle cx="20.5" cy="15" r="2.4" class="bot-eye"/><rect x="8" y="24" width="16" height="5" rx="2.5" class="bot-base"/></g></svg>`,
};

function render() {
  document.querySelector('#games').innerHTML = GAMES.map(g => {
    const done = Math.min(g.progress(), g.levels), started = done > 0;
    return `<a class="game" href="${g.href}">
      <div class="art">${ART[g.art]}</div>
      <div class="body">
        <span class="topic">${g.topic}</span>
        <h2>${g.title}<small>${g.en}</small></h2>
        <p>${g.desc}</p>
        <div class="meter" aria-label="已通过 ${done} / ${g.levels} 关"><i style="width:${(done / g.levels) * 100}%"></i></div>
        <div class="foot"><span>${done} / ${g.levels} 关</span><b>${started ? '继续' : '开始'} →</b></div>
      </div></a>`;
  }).join('');
}

function paintTheme() {
  const t = currentTheme(), b = document.querySelector('[data-theme-toggle]');
  b.textContent = themeLabel(t);
  b.title = `点一下换成${themeLabel(nextTheme(t))}`;
}

document.querySelector('[data-theme-toggle]').addEventListener('click', () => { applyTheme(nextTheme(currentTheme())); paintTheme(); });
applyTheme(currentTheme());
paintTheme();
render();
// Progress may change in another tab.
addEventListener('pageshow', render);
