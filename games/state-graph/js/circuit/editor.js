// The engine's side of the circuit board, and the robot's window. The board itself is the shared circuit editor
// (../../../kit/circuit, through board.js); these keep the engine's rules (wires and their types, lit inputs, slots)
// and draw the window where the player lights cells as inputs.
// Port ids: sources are 'tap:<id>' or '<nodeId>'; sinks are '<nodeId>:<k>' or 'out:<id>'.

import { typeError } from './components.js';
import { wouldCycle } from '../../../kit/graph.js';
import { ICONS } from './glyphs.js';
import { tr } from '../i18n.js';

export const isSink = p => p.startsWith('out:') || (!p.startsWith('tap:') && p.includes(':'));
const nodeOf = p => p.split(':')[0];
const HUES = 6; // lit inputs take the theme tokens --w0…--w5, in level order (board.js colours their cards the same)
const iconSVG = kind => `<svg class="glyph" viewBox="0 0 48 32" aria-hidden="true">${ICONS[kind]}</svg>`;

/** Try to wire two ports in either order. Returns { circ } on success, { same } for two ports on one side, or { msg }. */
export function connect(circ, io, a, b) {
  if (isSink(a) === isSink(b)) return { same: true };
  const [from, to] = isSink(a) ? [b, a] : [a, b];
  const edges = circ.wires.filter(w => !w.to.startsWith('out:')).map(w => [w.from, nodeOf(w.to)]);
  if (!to.startsWith('out:') && wouldCycle(edges, from, nodeOf(to))) return { msg: tr('这样会绕成一个圈：元件要等自己算完，才能算自己。', 'That would make a loop: a component would have to wait for its own result before it could compute it.') };
  const next = { ...circ, wires: [...circ.wires.filter(w => w.to !== to), { from, to }] }, msg = typeError(next, io);
  return msg ? { msg } : { circ: next };
}

/** Lit inputs: the cells the player lit, plus any input that already carries a wire. */
export const litOf = circ => [...new Set([...(circ.lit || []), ...circ.wires.filter(w => w.from.startsWith('tap:')).map(w => w.from.slice(4))])];

/** Light an input cell, or unlight it, which also removes its wires. */
export function toggleLit(circ, tap) {
  const lit = litOf(circ);
  if (!lit.includes(tap)) return { ...circ, lit: [...lit, tap] };
  return { ...circ, lit: lit.filter(x => x !== tap), wires: circ.wires.filter(w => w.from !== `tap:${tap}`) };
}

/**
 * Component slots on a two-column board: every component keeps its saved slot (circ.at) while that slot is free;
 * the rest take the first free slots in the order they were added. The board always ends with an empty row.
 */
export function placement(circ) {
  const cell = {}, used = new Set(), at = circ.at || {};
  circ.nodes.forEach(n => { const a = at[n.id]; if (Number.isInteger(a) && a >= 0 && !used.has(a)) { cell[n.id] = a; used.add(a); } });
  circ.nodes.forEach(n => { if (cell[n.id] === undefined) { let a = 0; while (used.has(a)) a++; cell[n.id] = a; used.add(a); } });
  const even = v => v + (v % 2), size = Math.max(4, even(Math.max(-1, ...used) + 1) + 2);
  return { cell, size, free: Array.from({ length: size }, (_, a) => a).filter(a => !used.has(a)) };
}

export function placeNode(circ, kind, at) {
  // Presets may name their components freely ('m', 'b1'…); new ones are n1, n2… after the highest n-number.
  const id = `n${Math.max(0, ...circ.nodes.map(n => /^n(\d+)$/.exec(n.id)).filter(Boolean).map(m => +m[1])) + 1}`;
  return { ...circ, nodes: [...circ.nodes, { id, kind, ...(kind === 'const' ? { value: 1 } : {}) }], at: { ...placement(circ).cell, [id]: at } };
}

export function removeNode(circ, id) {
  const at = { ...placement(circ).cell };
  delete at[id];
  return { ...circ, nodes: circ.nodes.filter(n => n.id !== id), wires: circ.wires.filter(w => w.from !== id && nodeOf(w.to) !== id), at };
}

/** A lit input's colour: one palette, in level order. */
const sourceColor = (ui, src) => `var(--w${ui.avail.filter(id => ui.lit.includes(id)).indexOf(src.slice(4)) % HUES})`;

/**
 * The robot's window: the board around the robot. A tap on a cell lights it as an input (blue);
 * the robot's own cells are framed red. Values follow the test board or the run.
 * ui.win = { robot, wins: [{ label, n, cells }], arm, facts, note }
 */
export function viewHTML(circ, ui) {
  const lit = litOf(circ), w = ui.win, vision = (w.wins[0].n - 1) / 2;
  const tag = id => `<span class="tag" style="--c:${sourceColor(ui, `tap:${id}`)}">${ui.taps[id].short}</span>`;
  const cellHTML = (x, opts = {}) => {
    const can = !!x.tap && ui.avail.includes(x.tap), on = can && lit.includes(x.tap);
    // World marks (key, door, rock…) and read states get a v- prefix, so page-wide rules such as the keypad's .key or
    // the empty-state .empty never reach a cell.
    const cls = ['vcell', ...String(x.cls || '').split(' ').filter(Boolean).map(c => `v-${c}`), x.key === null ? 'off' : '', can ? 'can' : '', on ? 'on' : '', x.out ? 'self' : '', x.state && `v-${x.state}`].filter(Boolean).join(' ');
    const v = x.key === null ? tr('界外', 'out') : x.value, inner = `${x.corner !== '' && x.corner !== undefined && x.key !== null ? `<span class="vc">${x.corner}</span>` : ''}<span class="vv${String(v).length > 4 ? ' long' : ''}">${v}</span>${on ? tag(x.tap) : ''}${opts.bot ? `<svg class="vbot" viewBox="0 0 32 32" aria-hidden="true">${w.robot.look}</svg>` : ''}${opts.label ? `<span class="vl">${opts.label}</span>` : ''}`;
    const style = opts.area ? ` style="grid-area:${opts.area}"` : '';
    return can
      ? `<button class="${cls}" type="button"${style} data-act="lit" data-t="${x.tap}" aria-pressed="${on}" aria-label="${on ? tr('取消输入', 'Remove input') : tr('点亮输入', 'Light input')} ${ui.taps[x.tap].label}">${inner}</button>`
      : `<span class="${cls}"${style}>${inner}</span>`;
  };
  const wins = w.wins.map((win, k) => `<div class="vblock">${win.label ? `<span class="vsub">${win.label}</span>` : ''}
    <div class="vwin n${win.n}">${win.cells.map(x => cellHTML(x, { area: `${x.r + 1}/${x.c + 1}`, bot: !k && x.r === vision && x.c === vision })).join('')}</div></div>`).join('');
  const arm = !w.arm ? '' : w.arm.sweeps ? sweepHTML(w.arm, ui, lit, tag) : `<div class="varm"><span class="vsub">${w.robot.armName} · ${w.arm.label}</span><div class="varm-row">${w.arm.cells.map(x => cellHTML(x, { label: x.label })).join('')}</div></div>`;
  const facts = w.facts.map(f => {
    const m = ui.taps[f.id], on = lit.includes(f.id);
    return `<button class="vfact${on ? ' on' : ''}" type="button" data-act="lit" data-t="${f.id}" aria-pressed="${on}">${iconSVG(m.icon)}<span>${m.label}</span><span class="vv">${f.value}</span>${on ? tag(f.id) : ''}</button>`;
  }).join('');
  return `<div class="vhead"><svg class="vlook" viewBox="0 0 32 32" aria-hidden="true">${w.robot.look}</svg><div><b>${w.robot.name}</b><small>${tr('视野', 'Vision')} ${w.wins[0].n}×${w.wins[0].n}${w.robot.arm ? ` · ${w.robot.armName}` : ''}</small></div></div>
    <div class="vnote">${w.note}</div>
    <div class="vwins">${wins}</div>${arm}
    ${facts ? `<div class="vfacts"><span class="vsub">${tr('本格信息', 'This cell')}</span>${facts}</div>` : ''}`;
}

/**
 * A sweeping arm: each sweep is one input, the whole strip of cells it passes over (dimmed where the filter drops a
 * cell). The player lights a sweep by tapping its strip; a level may let the player pick the arm's filter.
 */
function sweepHTML(arm, ui, lit, tag) {
  const strip = sw => (sw.cells.length ? sw.cells.map(x => `<span class="vcell sm${x.out ? ' v-out' : ''}${x.state ? ` v-${x.state}` : ''}">${x.label !== undefined ? `<span class="vc">${x.label}</span>` : ''}<span class="vv">${x.value}</span></span>`).join('') : `<em class="vnone">${tr('一格也没有', 'no cells at all')}</em>`);
  const sweeps = arm.sweeps.map(sw => {
    const can = ui.avail.includes(sw.tap), on = can && lit.includes(sw.tap), body = `<span class="vsl">${sw.label}</span><span class="vstrip">${strip(sw)}</span>${on ? tag(sw.tap) : ''}`;
    return can ? `<button class="vsweep${on ? ' on' : ''}" type="button" data-act="lit" data-t="${sw.tap}" aria-pressed="${on}" aria-label="${on ? tr('取消输入', 'Remove input') : tr('点亮输入', 'Light input')} ${ui.taps[sw.tap].label}">${body}</button>` : `<span class="vsweep">${body}</span>`;
  }).join('');
  const filters = arm.filters ? `<div class="vfilts" role="radiogroup" aria-label="${tr('扫描臂的筛选', 'Sweep arm filter')}"><span class="vsub">${tr('筛选', 'Filter')}</span>${arm.filters.map(f => `<button class="vfilt" type="button" role="radio" aria-checked="${arm.filter === f.v}" data-act="filter" data-v="${f.v}">${f.l}</button>`).join('')}</div>` : '';
  return `<div class="varm sweeps"><span class="vsub">${tr('扫描臂', 'Sweep arm')} · ${arm.label}</span>${sweeps}${filters}</div>`;
}
