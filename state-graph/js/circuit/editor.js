// Circuit editor markup and drawing.
// Left: the circuit board — input terminals on top (one per lit cell), components on a two-column grid,
// output terminals at the bottom. Right: the robot's window, where the player lights cells as inputs.
// The parts list lives outside the editor (the level's brief on a desktop, under the board on a phone).
// Port ids: sources are 'tap:<id>' or '<nodeId>'; sinks are '<nodeId>:<k>' or 'out:<id>'.

import { def, wouldCycle } from './components.js';
import { ICONS } from './glyphs.js';
import { signal } from '../util.js';

export const isSink = p => p.startsWith('out:') || (!p.startsWith('tap:') && p.includes(':'));
const nodeOf = p => p.split(':')[0];
const HUES = 6; // wire colors are theme tokens: --w0…--w5 for lit inputs, --n0…--n5 for components
export const letter = id => String.fromCharCode(64 + +id.slice(1));
const iconSVG = kind => `<svg class="glyph" viewBox="0 0 48 32" aria-hidden="true">${ICONS[kind]}</svg>`;

/** 'num' or 'bool' for any port. */
export function portType(circ, taps, p) {
  if (p.startsWith('tap:')) return taps[p.slice(4)].type;
  if (p.startsWith('out:') || !p.includes(':')) return 'num';
  const n = circ.nodes.find(x => x.id === nodeOf(p));
  return def(n.kind).ins[+p.split(':')[1]];
}

/** Try to wire two ports in either order. Returns { circ } on success, { same } for two ports on one side, or { msg }. */
export function connect(circ, taps, a, b) {
  if (isSink(a) === isSink(b)) return { same: true };
  const [from, to] = isSink(a) ? [b, a] : [a, b];
  if (portType(circ, taps, from) !== portType(circ, taps, to)) {
    return { msg: portType(circ, taps, to) === 'bool' ? '条件口只接「是 / 否」信号，比如「是起点」。' : '「是 / 否」信号只能接到闸门的条件口。' };
  }
  if (!to.startsWith('out:') && wouldCycle(circ, from, nodeOf(to))) return { msg: '这样会绕成一个圈：元件要等自己算完，才能算自己。' };
  return { circ: { ...circ, wires: [...circ.wires.filter(w => w.to !== to), { from, to }] } };
}

export const unwire = (circ, sink) => ({ ...circ, wires: circ.wires.filter(w => w.to !== sink) });

/** Lit inputs: the cells the player lit, plus any input that already carries a wire. */
export const litOf = circ => [...new Set([...(circ.lit || []), ...circ.wires.filter(w => w.from.startsWith('tap:')).map(w => w.from.slice(4))])];

/** Light or unlight an input cell; unlighting also removes its wires. */
export function toggleLit(circ, tap) {
  const lit = litOf(circ);
  if (!lit.includes(tap)) return { ...circ, lit: [...lit, tap] };
  return { ...circ, lit: lit.filter(x => x !== tap), wires: circ.wires.filter(w => w.from !== `tap:${tap}`) };
}

/** Component cells: every node at its saved cell, or at the first free cell. */
export function placement(circ, slots) {
  const cell = {}, used = new Set();
  circ.nodes.forEach(n => { const a = (circ.at || {})[n.id]; if (Number.isInteger(a) && !used.has(a)) { cell[n.id] = a; used.add(a); } });
  circ.nodes.forEach(n => { if (cell[n.id] === undefined) { let a = 0; while (used.has(a)) a++; cell[n.id] = a; used.add(a); } });
  const even = v => v + (v % 2);
  const size = Math.max(slots, even(circ.nodes.length + 1), even(Math.max(-1, ...Object.values(cell)) + 1));
  return { cell, size, free: Array.from({ length: size }, (_, a) => a).filter(a => !used.has(a)) };
}

export function placeNode(circ, kind, at) {
  const id = `n${Math.max(0, ...circ.nodes.map(n => +n.id.slice(1))) + 1}`;
  return { ...circ, nodes: [...circ.nodes, { id, kind, ...(kind === 'const' ? { value: 1 } : {}) }], at: { ...circ.at, [id]: at } };
}

export function removeNode(circ, id) {
  const at = { ...circ.at };
  delete at[id];
  return { ...circ, nodes: circ.nodes.filter(n => n.id !== id), wires: circ.wires.filter(w => w.from !== id && nodeOf(w.to) !== id), at };
}

/** Move a component to another cell, swapping with whatever sits there. */
export function moveNode(circ, id, to, slots) {
  const { cell } = placement(circ, slots), at = { ...cell }, other = Object.keys(cell).find(k => cell[k] === to);
  if (other) at[other] = cell[id];
  at[id] = to;
  return { ...circ, at };
}

/** One color per source: lit inputs from one palette in level order, components from another by their number. */
export function sourceColor(ui, src) {
  if (!src.startsWith('tap:')) return `var(--n${(+src.slice(1) - 1) % HUES})`;
  return `var(--w${ui.avail.filter(id => ui.lit.includes(id)).indexOf(src.slice(4)) % HUES})`;
}
const sourceTag = (ui, src) => (src.startsWith('tap:') ? ui.taps[src.slice(4)].short : letter(src));

/**
 * The whole editor. ui = { taps, avail, lit, outs, slots, pick, wire, palette, win }
 */
export function editorHTML(circ, ui) {
  const lit = litOf(circ), from = new Map(circ.wires.map(w => [w.to, w.from]));
  const can = p => !!ui.pick && ui.pick !== p && isSink(p) !== isSink(ui.pick) && !!connect(circ, ui.taps, ui.pick, p).circ;
  const portCls = (p, type) => `cport ${type}${ui.pick === p ? ' picked' : ''}${can(p) ? ' can' : ''}${from.has(p) || circ.wires.some(w => w.from === p) ? ' wired' : ''}`;
  const sinkTag = (p, fallback) => (from.has(p) ? `<span class="tag" style="--c:${sourceColor(ui, from.get(p))}">${sourceTag(ui, from.get(p))}</span>` : fallback);

  const terms = ui.avail.filter(id => lit.includes(id)).map(id => {
    const m = ui.taps[id], p = `tap:${id}`;
    return `<button class="${portCls(p, m.type)} cterm" type="button" data-act="port" data-p="${p}" style="--c:${sourceColor(ui, p)}" aria-label="输入 ${m.label}" title="从圆点拉线到元件">
      <span class="tag">${m.short}</span><b>${m.label}</b><span class="pv" data-pv="${p}"></span><i class="dot" data-dot="${p}"></i></button>`;
  }).join('');

  const { cell, size } = placement(circ, ui.slots), byCell = Object.fromEntries(Object.entries(cell).map(([id, a]) => [a, id]));
  const cells = Array.from({ length: size }, (_, a) => {
    const id = byCell[a];
    if (!id) return `<div class="ccell" data-at="${a}"><button class="cslot" type="button" data-act="slot" data-s="${a}" aria-label="空位，放一个元件"><span aria-hidden="true">＋</span></button></div>`;
    const n = circ.nodes.find(x => x.id === id), d = def(n.kind), color = sourceColor(ui, id);
    const ins = d.ins.map((type, k) => {
      const p = `${id}:${k}`, lb = d.labels ? d.labels[k] : '';
      return `<button class="${portCls(p, type)} cin" type="button" data-act="port" data-p="${p}" aria-label="${letter(id)} 的输入${lb ? ` ${lb}` : ` ${k + 1}`}" title="${from.has(p) ? '点一下拆掉这根线' : type === 'bool' ? '条件口：接「是 / 否」' : '输入口'}"><i class="dot" data-dot="${p}"></i>${sinkTag(p, lb ? `<span class="pl">${lb}</span>` : '')}</button>`;
    }).join('');
    return `<div class="ccell" data-at="${a}"><div class="cnode${d.bp ? ' bp' : ''}${n.kind === 'const' ? ' konst' : ''}" data-drag="${id}" style="--c:${color}">
      <div class="cins">${ins}</div>
      <button class="chead" type="button" data-act="node" data-n="${id}" title="${d.desc}"><em class="cid">${letter(id)}</em><b>${d.name}</b><small>${n.kind === 'const' ? `= ${n.value}` : d.tag}</small></button>
      <button class="${portCls(id, 'num')} cout" type="button" data-act="port" data-p="${id}" aria-label="${letter(id)} 的输出" title="从这里拉线"><span class="pv" data-pv="${id}"></span><i class="dot" data-dot="${id}"></i></button>
    </div></div>`;
  }).join('');

  const outs = ui.outs.map(([id, label]) => {
    const p = `out:${id}`;
    return `<button class="${portCls(p, 'num')} cend" type="button" data-act="port" data-p="${p}" aria-label="输出 ${label}"><i class="dot" data-dot="${p}"></i>${sinkTag(p, '')}<b>${label}</b><span class="pv" data-pv="${p}"></span></button>`;
  }).join('');

  return `<div class="cedit${ui.pick ? ' picking' : ''}" id="circ">
    <div class="cmain">
      <div class="cboard" id="cboard">
        <svg class="cwires" aria-hidden="true"></svg>
        <div class="cterms">${terms || '<p class="cempty">点右边视野里的格子，把它变成输入</p>'}</div>
        ${ui.palette.length ? `<div class="cgrid">${cells}</div>` : ''}
        <div class="couts" style="--n:${ui.outs.length}">${outs}</div>
      </div>
      <aside class="cview" id="cview">${viewHTML(circ, ui)}</aside>
    </div>
  </div>`;
}

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
    const cls = ['vcell', x.cls, x.key === null ? 'off' : '', can ? 'can' : '', on ? 'on' : '', x.out ? 'self' : '', x.state].filter(Boolean).join(' ');
    const inner = `${x.corner !== '' && x.corner !== undefined && x.key !== null ? `<span class="vc">${x.corner}</span>` : ''}<span class="vv">${x.key === null ? '界外' : x.value}</span>${on ? tag(x.tap) : ''}${opts.bot ? `<svg class="vbot" viewBox="0 0 32 32" aria-hidden="true">${w.robot.look}</svg>` : ''}${opts.label ? `<span class="vl">${opts.label}</span>` : ''}`;
    const style = opts.area ? ` style="grid-area:${opts.area}"` : '';
    return can
      ? `<button class="${cls}" type="button"${style} data-act="lit" data-t="${x.tap}" aria-pressed="${on}" aria-label="${on ? '取消输入' : '点亮输入'} ${ui.taps[x.tap].label}">${inner}</button>`
      : `<span class="${cls}"${style}>${inner}</span>`;
  };
  const wins = w.wins.map((win, k) => `<div class="vblock">${win.label ? `<span class="vsub">${win.label}</span>` : ''}
    <div class="vwin n${win.n}">${win.cells.map(x => cellHTML(x, { area: `${x.r + 1}/${x.c + 1}`, bot: !k && x.r === vision && x.c === vision })).join('')}</div></div>`).join('');
  const arm = w.arm ? `<div class="varm"><span class="vsub">伸缩臂 · ${w.arm.label}</span><div class="varm-row">${w.arm.cells.map(x => cellHTML(x, { label: x.label })).join('')}</div></div>` : '';
  const facts = w.facts.map(f => {
    const m = ui.taps[f.id], on = lit.includes(f.id);
    return `<button class="vfact${on ? ' on' : ''}" type="button" data-act="lit" data-t="${f.id}" aria-pressed="${on}">${iconSVG(m.icon)}<span>${m.label}</span><span class="vv">${f.value}</span>${on ? tag(f.id) : ''}</button>`;
  }).join('');
  return `<div class="vhead"><svg class="vlook" viewBox="0 0 32 32" aria-hidden="true">${w.robot.look}</svg><div><b>${w.robot.name}</b><small>视野 ${w.wins[0].n}×${w.wins[0].n}${w.robot.arm ? ' · 伸缩臂' : ''}</small></div></div>
    <div class="vnote">${w.note} · 点格子选输入</div>
    ${wins}${arm}
    ${facts ? `<div class="vfacts"><span class="vsub">本格信息</span>${facts}</div>` : ''}`;
}

/**
 * Wires as vertical S-curves over a halo the color of the board, colored by source. A wire carrying a number shows
 * dots flowing down it; one carrying 「—」 is dashed. Each wire has a wide invisible stroke to click it by.
 */
export function drawWires(board, circ, ui, probe, rubber) {
  const svg = board.querySelector('.cwires'), box = board.getBoundingClientRect();
  const pt = id => { const d = board.querySelector(`[data-dot="${id}"]`); if (!d) return null; const r = d.getBoundingClientRect(); return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]; };
  const curve = (a, b) => { const dy = Math.max(24, Math.abs(b[1] - a[1]) * 0.5); return `M${a[0]} ${a[1]}C${a[0]} ${a[1] + dy} ${b[0]} ${b[1] - dy} ${b[0]} ${b[1]}`; };
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const paths = circ.wires.map(w => {
    const a = pt(w.from), b = pt(w.to);
    if (!a || !b) return '';
    const v = probe ? probe[w.from] : undefined, focus = (ui.pick && (w.from === ui.pick || w.to === ui.pick)) || ui.wire === w.to;
    const live = v !== undefined && v !== null && v !== false, dead = v === null;
    const cls = [portType(circ, ui.taps, w.from), focus ? 'on' : '', (ui.pick || ui.wire) && !focus ? 'dim' : '', dead ? 'dead' : ''].filter(Boolean).join(' ');
    const d = curve(a, b);
    return `<g class="cwg${ui.wire === w.to ? ' sel' : ''}"><path class="cw-halo" d="${d}"/><path class="cw ${cls}" style="stroke:${sourceColor(ui, w.from)}" d="${d}"/>${live ? `<path class="cw-flow" d="${d}"/>` : ''}<path class="cw-hit" data-act="wire" data-w="${w.to}" d="${d}"><title>点一下选中这根线</title></path></g>`;
  });
  if (rubber) {
    const a = pt(rubber.from), b = [rubber.x - box.left, rubber.y - box.top];
    if (a) paths.push(`<path class="cw rubber" d="${isSink(rubber.from) ? curve(b, a) : curve(a, b)}"/>`);
  }
  svg.innerHTML = paths.join('');
}

/** Show the values the machine computed at one cell next to each port. */
export function paintProbe(root, probe) {
  root.querySelectorAll('[data-pv]').forEach(el => {
    const k = el.dataset.pv, has = !!probe && k in probe;
    el.textContent = has ? signal(probe[k]) : '';
    el.classList.toggle('on', has);
  });
}
