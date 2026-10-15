// Circuit board editor: input taps on top, component slots in the middle, outputs at the bottom.
// Ports are buttons; wires are an SVG overlay measured from the rendered port dots.
// Port ids: sources are 'tap:<id>' or '<nodeId>'; sinks are '<nodeId>:<k>' or 'out:<id>'.

import { def, wouldCycle } from './components.js';
import { signal } from '../util.js';

export const isSink = p => p.startsWith('out:') || (!p.startsWith('tap:') && p.includes(':'));
const nodeOf = p => p.split(':')[0];

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

export function removeNode(circ, id) {
  return { nodes: circ.nodes.filter(n => n.id !== id), wires: circ.wires.filter(w => w.from !== id && nodeOf(w.to) !== id) };
}

export function placeNode(circ, kind, slot) {
  const id = `n${Math.max(0, ...circ.nodes.map(n => +n.id.slice(1))) + 1}`;
  return { ...circ, nodes: [...circ.nodes, { id, kind, slot, ...(kind === 'const' ? { value: 1 } : {}) }] };
}

/**
 * Board markup. ui = { taps: tap meta by id, tapIds, outs: [[id, label]], slots, pick }.
 * Ports that can complete a wire with the picked port get the class `can`.
 */
export function boardHTML(circ, ui) {
  const can = p => {
    if (!ui.pick || ui.pick === p || isSink(p) === isSink(ui.pick)) return false;
    return !!connect(circ, ui.taps, ui.pick, p).circ;
  };
  const wired = p => circ.wires.some(w => w.to === p || w.from === p);
  const cls = (p, type) => `cport ${type}${ui.pick === p ? ' picked' : ''}${can(p) ? ' can' : ''}${wired(p) ? ' wired' : ''}`;
  const taps = ui.tapIds.map(id => {
    const m = ui.taps[id], p = `tap:${id}`;
    return `<button class="${cls(p, m.type)} ctap" type="button" data-act="port" data-p="${p}" aria-label="输入口 ${m.label}"><b>${m.label}</b><span class="pv" data-pv="${p}"></span><i class="dot" data-dot="${p}"></i></button>`;
  }).join('');
  const slots = Array.from({ length: ui.slots }, (_, s) => {
    const n = circ.nodes.find(x => x.slot === s);
    if (!n) return `<button class="cslot" type="button" data-act="slot" data-s="${s}" aria-label="空位 ${s + 1}，放一个元件"><span aria-hidden="true">＋</span>放元件</button>`;
    const d = def(n.kind);
    const ins = d.ins.map((type, k) => {
      const p = `${n.id}:${k}`, lb = d.labels ? d.labels[k] : '';
      return `<button class="${cls(p, type)} cin" type="button" data-act="port" data-p="${p}" aria-label="${d.name}的输入口${lb ? ` ${lb}` : ` ${k + 1}`}"><i class="dot" data-dot="${p}"></i>${lb ? `<span>${lb}</span>` : ''}</button>`;
    }).join('');
    return `<div class="cnode${d.bp ? ' bp' : ''}${n.kind === 'const' ? ' konst' : ''}" data-node="${n.id}">
      <div class="cins">${ins}</div>
      <button class="chead" type="button" data-act="node" data-n="${n.id}"><b>${d.name}</b><small>${n.kind === 'const' ? `= ${n.value}` : d.tag}</small></button>
      <button class="${cls(n.id, 'num')} cout" type="button" data-act="port" data-p="${n.id}" aria-label="${d.name}的输出口"><span class="pv" data-pv="${n.id}"></span><i class="dot" data-dot="${n.id}"></i></button>
    </div>`;
  }).join('');
  const outs = ui.outs.map(([id, label]) => {
    const p = `out:${id}`;
    return `<button class="${cls(p, 'num')} cend" type="button" data-act="port" data-p="${p}" aria-label="输出口 ${label}"><i class="dot" data-dot="${p}"></i><b>${label}</b><span class="pv" data-pv="${p}"></span></button>`;
  }).join('');
  return `<div class="circ${ui.pick ? ' picking' : ''}" id="circ">
    <svg class="cwires" aria-hidden="true"></svg>
    <div class="crow" style="--n:${Math.min(ui.tapIds.length, 4)}">${taps}</div>
    <div class="cgrid">${slots}</div>
    <div class="crow" style="--n:${ui.outs.length}">${outs}</div>
  </div>`;
}

/** Draw every wire as a vertical S-curve between its two port dots. A wire glows when it carries a value. */
export function drawWires(root, circ, taps, pick, probe) {
  const svg = root.querySelector('.cwires'), box = root.getBoundingClientRect();
  const pt = id => { const d = root.querySelector(`[data-dot="${id}"]`); if (!d) return null; const r = d.getBoundingClientRect(); return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]; };
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  svg.innerHTML = circ.wires.map(w => {
    const a = pt(w.from), b = pt(w.to);
    if (!a || !b) return '';
    const dy = Math.max(26, Math.abs(b[1] - a[1]) * 0.5), v = probe ? probe[w.from] : undefined;
    const c = [portType(circ, taps, w.from), pick && (w.from === pick || w.to === pick) ? 'on' : '', v !== undefined && v !== null && v !== false ? 'live' : ''].filter(Boolean).join(' ');
    return `<path class="cw ${c}" d="M${a[0]} ${a[1]}C${a[0]} ${a[1] + dy} ${b[0]} ${b[1] - dy} ${b[0]} ${b[1]}"/>`;
  }).join('');
}

/** Show the values the machine computed at one cell next to each port. */
export function paintProbe(root, probe) {
  root.querySelectorAll('[data-pv]').forEach(el => {
    const k = el.dataset.pv, has = !!probe && k in probe;
    el.textContent = has ? signal(probe[k]) : '';
    el.classList.toggle('on', has);
  });
}
