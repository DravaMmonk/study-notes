// What the robot reads, drawn as HTML: its view, the facts about its own cell, its arm. On a board the input cards
// hold it (and clicking a sensor adds or removes its output on its card); on a desktop the window beside the test
// board shows it too.

import { ICONS } from './glyphs.js';
import { tr } from '../lang.js';
import { markIcon, markOf } from './svg.js';

const HUES = 6; // read sensors take the theme tokens --w0…--w5, in level order (board.js colours readers the same)
const iconSVG = kind => `<svg class="glyph" viewBox="0 0 48 32" aria-hidden="true">${ICONS[kind]}</svg>`;

/** A read sensor's colour: one palette, in the order the level offers them. */
const sourceColor = (ui, id) => `var(--w${ui.avail.filter(x => ui.lit.includes(x)).indexOf(id) % HUES})`;

/**
 * What the robot reads: the board around it, the facts about its own cell, its arm. A sensor the circuit reads
 * (ui.lit) is marked; the robot's own cell is framed red. Values follow the test board or the run. It only shows.
 * ui = { sensors, avail, lit, win: { robot, wins: [{ label, n, cells }], arm, facts }, pickable? } — with `pickable`,
 * whatever the robot can read is a button that adds or removes its output on the input card. `part` draws one card's
 * share alone (on a phone, inside that card): 'view' the window and the arm, 'facts' the cell's facts.
 */
export function viewHTML(ui, part = null) {
  const lit = ui.lit, w = ui.win, vision = (w.wins[0].n - 1) / 2;
  const tag = id => `<span class="tag" style="--c:${sourceColor(ui, id)}">${ui.sensors[id].short}</span>`;
  const cellHTML = (x, opts = {}) => {
    const can = !!x.sensor && ui.avail.includes(x.sensor), on = can && lit.includes(x.sensor);
    // World marks (key, door, rock…) and read states get a v- prefix, so page-wide rules such as the keypad's .key or
    // the empty-state .empty never reach a cell.
    const cls = ['vcell', ...String(x.cls || '').split(' ').filter(Boolean).map(c => `v-${c}`), x.key === null ? 'off' : '', on ? 'on' : '', x.out ? 'self' : '', x.state && `v-${x.state}`].filter(Boolean).join(' ');
    // A special cell (start, end, a key, a door…) carries its icon in the corner, like on the test board; the value
    // stays where every other cell has it.
    const mk = x.key !== null && markOf(x), corner = mk && !x.mark ? '' : x.corner;
    const v = x.key === null ? tr('界外', 'out') : x.value, inner = `${mk ? markIcon(mk) : ''}${corner !== '' && corner !== undefined && corner !== null && x.key !== null ? `<span class="vc">${corner}</span>` : ''}<span class="vv${String(v).length > 4 ? ' long' : ''}">${v}</span>${on ? tag(x.sensor) : ''}${opts.bot ? `<svg class="vbot" viewBox="0 0 32 32" aria-hidden="true">${w.robot.look}</svg>` : ''}${opts.label ? `<span class="vl">${opts.label}</span>` : ''}`;
    const style = opts.area ? ` style="grid-area:${opts.area}"` : '';
    // With `ui.pickable`, a cell the robot can read is a button: clicking it adds or removes its output on 视野.
    return ui.pickable && can
      ? `<button class="${cls} can" type="button" data-act="pick" data-v="${x.sensor}"${style} aria-pressed="${on}" title="${ui.sensors[x.sensor].label}">${inner}</button>`
      : `<span class="${cls}"${style}>${inner}</span>`;
  };
  const wins = w.wins.map((win, k) => `<div class="vblock">${win.label ? `<span class="vsub">${win.label}</span>` : ''}
    <div class="vwin n${win.n}">${win.cells.map(x => cellHTML(x, { area: `${x.r + 1}/${x.c + 1}`, bot: !k && x.r === vision && x.c === vision })).join('')}</div></div>`).join('');
  const arm = !w.arm ? '' : w.arm.sweeps ? sweepHTML(w.arm, ui, lit, tag) : `<div class="varm"><span class="vsub">${w.robot.armName} · ${w.arm.label}</span><div class="varm-row">${w.arm.cells.map(x => cellHTML(x, { label: x.label })).join('')}</div></div>`;
  // With `ui.pickable` a fact is a button too: clicking it adds or removes its output on 本格信息.
  const facts = w.facts.map(f => {
    const m = ui.sensors[f.id], on = lit.includes(f.id), inner = `${iconSVG(m.icon)}<span>${m.label}</span><span class="vv">${f.value}</span>${on ? tag(f.id) : ''}`;
    return ui.pickable
      ? `<button class="vfact${on ? ' on' : ''}" type="button" data-act="pick" data-v="${f.id}" aria-pressed="${on}">${inner}</button>`
      : `<span class="vfact${on ? ' on' : ''}">${inner}</span>`;
  }).join('');
  // The robot's window and the cell's facts side by side (both are tapped to light inputs), then the arm under them on
  // a phone and beside them in the strip under the board on a desktop.
  const factsHTML = facts ? `<div class="vpart vfacts"><span class="vsub">${tr('本格信息', 'This cell')}</span>${facts}</div>` : '';
  if (part === 'view') return `<div class="vpart vmain"><div class="vwins">${wins}</div></div>${arm ? `<div class="vpart vextra">${arm}</div>` : ''}`;
  if (part === 'facts') return `<div class="vpart vfacts">${facts}</div>`;
  return `<div class="vtop${facts ? ' has-facts' : ''}"><div class="vpart vmain"><div class="vwins">${wins}</div></div>${factsHTML}</div>${arm ? `<div class="vpart vextra">${arm}</div>` : ''}`;
}

/**
 * A sweeping arm: each sweep is one sensor, the whole strip of cells it passes over (dimmed where the level's filter
 * drops a cell).
 */
function sweepHTML(arm, ui, lit, tag) {
  const strip = sw => (sw.cells.length ? sw.cells.map(x => `<span class="vcell sm${x.out ? ' v-out' : ''}${x.state ? ` v-${x.state}` : ''}">${x.mark ? markIcon(x.mark) : ''}${x.label !== undefined ? `<span class="vc">${x.label}</span>` : ''}<span class="vv">${x.value}</span></span>`).join('') : `<em class="vnone">${tr('一格也没有', 'no cells at all')}</em>`);
  const sweeps = arm.sweeps.map(sw => {
    const can = ui.avail.includes(sw.sensor), on = can && lit.includes(sw.sensor), body = `<span class="vsl">${sw.label}</span><span class="vstrip">${strip(sw)}</span>${on ? tag(sw.sensor) : ''}`;
    return ui.pickable && can ? `<button class="vsweep${on ? ' on' : ''}" type="button" data-act="pick" data-v="${sw.sensor}" aria-pressed="${on}">${body}</button>` : `<span class="vsweep${on ? ' on' : ''}">${body}</span>`;
  }).join('');
  return `<div class="varm sweeps"><span class="vsub">${tr('扫描臂', 'Sweep arm')} · ${arm.label}</span>${sweeps}</div>`;
}
