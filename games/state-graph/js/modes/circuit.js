// Circuit levels: a robot walks the table cell by cell and runs the player's circuit board on each cell.
// The player reads the robot's inputs with input parts (视野读取器, 本格信息读取器, 臂读取器, each set on its card),
// wires components on the shared circuit editor (the one Vision Complete uses, ../../../kit/circuit, through
// `ctl.board` and ../circuit/board.js), and the board writes the robot's cell. The robot's view only shows.
// Before a run the test board is a sandbox: the player types numbers into cells and puts the robot anywhere, and the
// robot's cell shows the circuit's answer at once. Running clears the board and the robot starts from its usual cell.
// A level may have several stages: a new world with new inputs (when a run fails on purpose), or a new question on
// the same board (when every test passes; `carry` keeps the circuit). A stage may give the player a scan-order dial,
// a filter for the sweeping arm, or scan in rounds until the table settles.

import { $, buzz, toast, signal, wide } from '../util.js';
import { rt, Anim } from '../runtime.js';
import { WORLDS, runCircuit, windowOf, visibleSensors, sensorsOf, MAX_ROUNDS } from '../circuit/worlds.js';
import { ROBOTS } from '../circuit/robots.js';
import { def, blank, evaluate, clone, modelsOf, isInput, isViewReader, familyOf, layerOf as readerLayer, picksOf, withPicks, splitSrc, srcType, sinkType, fits, CARDS, cardOf } from '../circuit/components.js';
import { viewHTML, removeNode, placeNode, readsOf } from '../circuit/editor.js';
import { toGraph, fromGraph, create, partsFor } from '../circuit/board.js';
import { placement } from '../../../kit/circuit/model.js';
import { lookIcon, lookSVG } from '../circuit/looks.js';
import { PARTS } from '../levels/parts.js';
import { usableIn } from '../levels/course.js';
import { tr, lazy } from '../i18n.js';

const MERGES = ['msum', 'mmin', 'mmax'];
/** A level's parts as the player picks them: each family of models (the mergers, the comparators) is one entry, the
 *  first of them, whose model is then chosen on the card. */
const shelf = palette => palette.filter(k => { const m = modelsOf(k); return !m || k === palette.find(x => m.includes(x)); });
/**
 * A board as saved by an earlier version, on readers: an input lit in the robot's view (a wire straight from
 * 'tap:<id>') becomes a reader set to that sensor, in the place its card had; the first 「某层」 cards ('peek:dr,dc')
 * and readers set by square ('-1,0') read the view sensor there; on a table the player stacks, a view reader is a
 * layered one. A sensor the world no longer has comes off, and so do its wires. Every wire from a reader names the
 * sensor it reads ('n3#up').
 */
function asInputParts(c, s, W) {
  const taps = [...new Set([...(c.lit || []), ...c.wires.filter(w => w.from.startsWith('tap:')).map(w => w.from.slice(4))])].filter(id => W.sensors[id]);
  const used = c.nodes.map(x => /^n(\d+)$/.exec(x.id)).filter(Boolean).map(x => +x[1]);
  let next = Math.max(0, ...used);
  const kindOf = id => ({ view: W.layered ? 'seem' : 'see', here: 'fact', arm: 'arm' })[W.sensors[id].family];
  const ids = Object.fromEntries(taps.map(id => [id, `n${++next}`]));
  const xy = { ...(c.xy || {}) };
  taps.forEach(id => { if (xy[`tap:${id}`]) { xy[ids[id]] = xy[`tap:${id}`]; delete xy[`tap:${id}`]; } });
  const bySquare = p => (/^-?\d+,-?\d+$/.test(p) ? W.sensorAt[p] || null : p);
  const renamed = {};
  const fix = n => {
    if (n.kind.startsWith('peek:')) n = { id: n.id, kind: 'seel', value: n.kind.slice(5) };
    if (W.layered && n.kind === 'see') n = { ...n, kind: 'seem', value: `self|${n.value}` };
    if (!isInput(n.kind)) return n;
    const was = picksOf(n), now = was.map(p => bySquare(p));
    const ok = now.filter((p, k) => p && W.sensors[p] && W.sensors[p].family === familyOf(n.kind) && now.indexOf(p) === k);
    was.forEach((p, k) => { if (now[k] && ok.includes(now[k])) renamed[`${n.id}#${p}`] = `${n.id}#${now[k]}`; });
    return ok.length ? withPicks(n, ok) : null;
  };
  const nodes = [...c.nodes, ...taps.map(id => ({ id: ids[id], kind: kindOf(id), value: W.layered && W.sensors[id].family === 'view' ? `self|${id}` : id }))].map(fix).filter(Boolean);
  const kept = new Set(nodes.map(n => n.id)), byId = new Map(nodes.map(n => [n.id, n]));
  const named = from => {
    if (renamed[from]) return renamed[from];
    const n = byId.get(from);
    return n && isInput(n.kind) && picksOf(n).length ? `${from}#${picksOf(n)[0]}` : from;
  };
  const wires = c.wires.map(w => (w.from.startsWith('tap:') ? { ...w, from: ids[w.from.slice(4)] || w.from } : w)).map(w => ({ ...w, from: named(w.from) }))
    .filter(w => { const [id, pick] = splitSrc(w.from); return kept.has(id) && (pick === null || picksOf(byId.get(id)).includes(pick)) && (w.to.startsWith('out:') || kept.has(w.to.split(':')[0])); });
  return { ...c, lit: [], nodes, wires, xy };
}
/** The models a part can swap to in place, keeping its wires (a merger's, a comparator's), within the level's palette. */
const swapsOf = (kind, palette) => { const m = modelsOf(kind); return m ? m.filter(k => k === kind || palette.includes(k)) : []; };
/** How that one merger entry reads, when the level has more than one model of it. */
const mergerEntry = models => ({
  label: lazy(() => def(models[0]).name),
  tag: lazy(() => models.map(k => def(k).tag).join(' / ')),
  icon: lookIcon('merger'),
  look: 'merger',
  desc: lazy(() => tr(`把接进来的几个数汇成一个。放上后在卡片上选型号：${models.map(k => def(k).tag).join('、')}；换型号时连线不变。`, `Merges the numbers wired into it into one. Pick its model on the card once placed: ${models.map(k => def(k).tag).join(', ')}; the wires stay when you swap.`)),
});

export function circuitMode(L, saved, { flags } = {}) {
  const stages = L.stages || [L];
  const st = {
    stage: saved && saved.stage ? saved.stage : 0,
    circs: stages.map((s, k) => asInputParts((saved && saved.circs && saved.circs[k]) || (s.preset ? clone(s.preset) : blank()), s, WORLDS[s.world])),
    // What the machine is set to (scan order, the arm's filter, the rewrite directions) is the level's, never the player's.
    dirs: { ...(L.solutionDirs || L.dirs || {}) },
    scan: stages.map((s) => (s.dial ? s.solutionScan : null)),
    filter: stages.map((s) => s.solutionFilter || 'all'),
    armed: false, ti: 0, status: [], view: null,
    typed: {}, robot: null, sel: null, input: '',
  };
  const robot = ROBOTS[L.robot];
  // A part is in the palette once the level that builds it is solved (../levels/course.js); a bench has no flags.
  const allowed = flags ? usableIn(L, flags) : null;
  const stage = () => stages[st.stage], V = () => WORLDS[stage().world], circ = () => st.circs[st.stage];
  /** The level's components this player can use: built (or primitive), in the stage's order. */
  const offeredParts = () => stage().palette.filter(k => !allowed || allowed.has(k));
  const tests = () => stage().tests || L.tests, expected = () => stage().expected || L.expected;
  const opt = () => ({ ...stage(), dirs: st.dirs, ...(stage().dial ? { scan: st.scan[st.stage] } : {}), filter: st.filter[st.stage], remember: stage().solutionMem || [], layers: circ().layers || 1, maxLayers: stage().maxLayers || 8, answerLayers: circ().answerLayers || [0], boardWidth: rt.boardWidth || 0 });
  const io = () => ({ sensors: V().sensors, outs: V().outs });
  const label = t => (L.testLabel || V().label)(t);
  const busy = () => rt.cur.running;
  const changed = () => { st.status = tests().map(() => null); st.view = null; st.armed = false; rt.persist(); };
  st.status = tests().map(() => null);
  const setCirc = c => { st.circs[st.stage] = c; changed(); };
  const shownStep = () => { const v = st.view; if (!v || !v.k) return null; return v.res.steps[v.focus ?? v.k - 1]; };

  /**
   * The sensors an input card offers on stage s: 视野 ('see') the cells the robot sees, in reading order, then what its
   * arm reaches (when the level lets it use its arm); 本格信息 ('fact') the level's facts about its own cell.
   */
  const offeredIn = (s, kind) => {
    const W = WORLDS[s.world];
    if (kind === 'fact') return s.facts || [];
    if (familyOf(kind) !== 'view') return [];
    const seen = visibleSensors(W, robot.vision).sort((a, b) => W.sensors[a].at[0] - W.sensors[b].at[0] || W.sensors[a].at[1] - W.sensors[b].at[1]);
    return [...seen, ...(robot.arm && !s.noArm ? sensorsOf(W, 'arm') : [])];
  };
  const offered = kind => offeredIn(stage(), kind);
  /**
   * The two fixed input cards, 视野 and 本格信息, on every board (a card with nothing to offer is left off). A reader
   * an older save still has folds into them: its sensors become the card's outputs, and its wires follow.
   */
  function toCards(c, s) {
    const W = WORLDS[s.world], offer = { view: offeredIn(s, 'see'), facts: offeredIn(s, 'fact') }, picks = { view: [], facts: [] }, moved = {}, xy = { ...(c.xy || {}) }, rest = [];
    for (const n of c.nodes) {
      if (!isInput(n.kind)) { rest.push(n); continue; }
      if (readerLayer(n) !== 'self') continue;
      picksOf(n).forEach((p, k) => {
        const card = cardOf(W.sensors[p]?.family);
        if (!card || !offer[card].includes(p)) return;
        if (!picks[card].includes(p)) picks[card].push(p);
        moved[`${n.id}#${p}`] = `${card}#${p}`;
        if (!k) moved[n.id] = `${card}#${p}`;
        if (!xy[card] && c.xy?.[n.id]) xy[card] = c.xy[n.id];
      });
    }
    const cards = Object.entries(CARDS).filter(([id]) => offer[id].length).map(([id, kind]) => withPicks({ id, kind, value: '' }, offer[id].filter(p => picks[id].includes(p))));
    const ids = new Set([...rest, ...cards].map(n => n.id));
    const wires = c.wires.map(w => ({ ...w, from: moved[w.from] ?? w.from })).filter(w => {
      const [f, p] = splitSrc(w.from), card = cards.find(x => x.id === f);
      return ids.has(f) && (!card || picksOf(card).includes(p)) && (w.to.startsWith('out:') || ids.has(w.to.split(':')[0]));
    });
    return { ...c, nodes: [...cards, ...rest], wires, xy };
  }
  st.circs = st.circs.map((c, k) => toCards(c, stages[k]));
  const fresh = () => toCards(blank(), stage());
  /** Every part the player can place: the level's components (the input cards are always there). */
  const paletteAll = () => offeredParts();
  /** What a reader can read: [sensor, label]. */
  const inputOptions = kind => offered(kind).map(id => [id, V().sensors[id].label]);
  /** A new reader reads something sensible: the cell above, the first fact, the first arm reading. */
  const firstOf = kind => {
    const o = offered(kind), up = V().sensorAt['-1,0'], first = familyOf(kind) === 'view' && o.includes(up) ? up : o[0] ?? null;
    return kind === 'seem' && first ? `self|${first}` : first;
  };
  /** Every sensor a reader reads, from the bench's (or the run's) point of view, wired or not. */
  const asNode = n => (n.kind ? n : { id: n.id, kind: n.type, value: n.value });
  /** 视野's box: a blank square for each cell the robot sees, the view sensor there; lit when the card reads it. */
  const gridOf = node => {
    const v = robot.vision, Vw = V(), picks = picksOf(node), can = offered(node.kind), self = readerLayer(node) === 'self', cells = [];
    for (let dr = -v; dr <= v; dr++) for (let dc = -v; dc <= v; dc++) {
      // On its own layer the robot's cell is the one being worked out: it cannot be read yet.
      const key = Vw.sensorAt[`${dr},${dc}`] || null, ok = !!key && can.includes(key) && !(self && !dr && !dc);
      cells.push({ dr, dc, key, ok, on: ok && picks.includes(key), self: !dr && !dc });
    }
    return { n: 2 * v + 1, cells };
  };
  /** An input card reads one more sensor, or one fewer: each is an output of its own, in the card's order (the view's
   *  reading order, then the arm; the level's facts), and the wires from a sensor taken off come off with it. */
  const togglePick = (id, pick) => {
    const c = circ(), n = c.nodes.find(x => x.id === id);
    if (!n) return;
    const picks = picksOf(n), order = offered(n.kind);
    const next = picks.includes(pick) ? picks.filter(p => p !== pick) : [...picks, pick].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    setCirc({ ...c, nodes: c.nodes.map(x => (x.id === id ? withPicks(x, next) : x)), wires: c.wires.filter(w => { const [f, p] = splitSrc(w.from); return f !== id || next.includes(p); }) });
  };
  /** One of a reader's outputs reads another sensor: its wires follow, unless the new sensor's signal does not fit them. */
  const setPick = (id, from, to) => {
    const c = circ(), n = c.nodes.find(x => x.id === id), picks = picksOf(n);
    if (!picks.includes(from) || picks.includes(to)) return;
    const nodes = c.nodes.map(x => (x.id === id ? withPicks(x, picks.map(p => (p === from ? to : p))) : x));
    const moved = c.wires.map(w => (w.from === `${id}#${from}` ? { ...w, from: `${id}#${to}` } : w)), next = { ...c, nodes, wires: moved };
    const fit = w => w.from !== `${id}#${to}` || fits(sinkType(next, io(), w.to), srcType(next, io(), w.from));
    setCirc({ ...next, wires: moved.filter(fit) });
  };
  /** One more output on a reader, reading the first sensor it does not read yet. */
  const addPick = id => {
    const n = circ().nodes.find(x => x.id === id), free = offered(n.kind).find(f => !picksOf(n).includes(f));
    if (free) togglePick(id, free);
  };
  /** A sensor picked anywhere (the view, the inputs window, a card): its card gains or loses that output. */
  const pickSensor = id => { const card = cardOf(V().sensors[id]?.family); if (card) togglePick(card, id); };
  /** What 视野's arm reaches, as picks on its card: [{ key, label, on, v }]. */
  const armOf = node => { const h = here(), picks = picksOf(node); return offered('see').filter(id => V().sensors[id].family === 'arm').map(id => ({ key: id, label: V().sensors[id].label, on: picks.includes(id), v: signal(readPick(node, id, h)) })); };
  /** A view reader reads the square (dr, dc) of its box, or stops reading it. */
  const setPos = (id, dr, dc) => { const pick = V().sensorAt[`${dr},${dc}`]; if (pick) togglePick(id, pick); };
  /** The layers a layered view reader can read: this one, each layer the table has, or the one whose number is wired in. */
  const layerChoices = () => [['self', tr('本层', 'this layer')], ...Array.from({ length: opt().layers }, (_, m) => [String(m), tr(`层 ${m}`, `layer ${m}`)]), ['port', tr('接进来的层号', 'the number wired in')]];
  const layerOf = n => String(readerLayer(n));
  const setLayer = (id, choice) => {
    const c = circ(), n = c.nodes.find(x => x.id === id), own = V().sensorAt['0,0'];
    // On its own layer a reader cannot read the robot's cell: that sensor comes off (the cell above, if it was all).
    let picks = picksOf(n).filter(p => choice !== 'self' || p !== own);
    if (!picks.length) picks = [V().sensorAt['-1,0']];
    const next = choice === 'port' ? { ...n, kind: 'seel', value: picks.join(';') } : { ...n, kind: 'seem', value: `${choice}|${picks.join(';')}` };
    // Without a layer port, whatever was wired into it comes off; so do the wires from a sensor it no longer reads.
    const wires = c.wires.filter(w => (choice === 'port' || w.to !== `${id}:0`) && (splitSrc(w.from)[0] !== id || picks.includes(splitSrc(w.from)[1])));
    setCirc({ ...c, nodes: c.nodes.map(x => (x.id === id ? next : x)), wires });
  };
  /** The kinds a kind check can be set to: those of the sensor wired into it, or every kind this world has. */
  const kindsOf = id => {
    const w = circ().wires.find(x => x.to === `${id}:0`), sid = w && (w.from.startsWith('tap:') ? w.from.slice(4) : splitSrc(w.from)[1]);
    const all = Object.values(V().sensors).filter(x => x.type === 'cat'), from = sid && V().sensors[sid] && V().sensors[sid].cats ? [V().sensors[sid]] : all;
    return [...new Map(from.flatMap(x => x.cats).map(([v, l]) => [v, [v, l]])).values()];
  };

  /** Sensors this robot can read here: the cells it sees, its arm, and the level's facts about its own cell. */
  const avail = () => [...offered('see'), ...offered('arm'), ...offered('fact')];

  /** Sandbox: typed numbers on the board, the robot where the player put it, and its answer computed live. */
  function sandbox() {
    const t = tests()[st.ti], Vw = V(), o = opt(), cell = st.robot || Vw.sample(t, o), keys = Vw.keys(t, cell);
    const shown = new Map(Vw.base ? Vw.base(t, o) : []), reads = new Set(), empty = new Set(), probe = {};
    Object.entries(st.typed).forEach(([k, v]) => shown.set(k, v));
    const get = key => { reads.add(key); if (shown.has(key)) return shown.get(key); empty.add(key); return null; };
    const { out } = evaluate(circ(), (id, layer) => Vw.read(t, cell, id, get, o, layer), Vw.outs.map(x => x[0]), probe);
    Object.entries(keys).forEach(([id, key]) => shown.set(key, out[id]));
    return { cell, at: Object.values(keys), shown, reads, empty, probe, typed: new Set(Object.keys(st.typed)), sel: st.sel };
  }

  /** Where the robot is and what the table holds: on the sandbox, or at the step of the run being shown. */
  function here() {
    const t = tests()[st.ti], Vw = V(), o = opt(), v = st.view, s = shownStep(), box = s ? null : sandbox();
    const cell = s ? s.cell : box.cell, shown = box ? box.shown : new Map(v.res.base);
    if (v) v.res.steps.slice(0, (v.focus ?? v.k - 1) + 1).forEach(x => (x.writes || []).forEach(([key, val]) => shown.set(key, val)));
    return { t, Vw, o, v, s, box, cell, shown, probe: box ? box.probe : s.probe };
  }
  /** What a reader's sensor reads there, wired or not (on a layer wired in: the number on that wire). */
  function readPick(n, pick, h = here()) {
    const { t, Vw, o, cell, shown, probe } = h, get = key => (shown.has(key) ? shown.get(key) : null);
    let layer = readerLayer(n);
    if (layer === 'port') { const w = circ().wires.find(x => x.to === `${n.id}:0`); layer = w && probe && w.from in probe ? probe[w.from] : null; }
    return layer === null ? null : Vw.read(t, cell, pick, get, o, layer);
  }
  /** The robot's window: live during a run or an inspection, otherwise around the robot on the sandbox. */
  function win() {
    const { t, Vw, o, s, box, cell, shown } = here();
    const reads = s ? new Set(s.reads) : box.reads, isEmpty = key => (s ? s.empty === key : box.empty.has(key));
    const mark = x => ({ ...x, value: x.key !== null && shown.has(x.key) ? signal(shown.get(x.key)) : '', state: isEmpty(x.key) ? 'empty' : reads.has(x.key) ? 'read' : '' });
    const w = windowOf(Vw, t, cell, robot.vision, o);
    w.wins = w.wins.map(x => ({ ...x, cells: x.cells.map(mark) }));
    if (w.arm && w.arm.cells) w.arm.cells = w.arm.cells.map(mark);
    if (w.arm && w.arm.sweeps) w.arm.sweeps = w.arm.sweeps.map(x => ({ ...x, cells: x.cells.map(mark) }));
    if (w.arm && (stage().noArm || !robot.arm)) w.arm = null;
    if (w.arm) w.arm.filter = o.filter;
    w.facts = (stage().facts || []).map(id => ({ id, value: signal(Vw.read(t, cell, id, key => shown.get(key) ?? null, o)) }));
    w.robot = robot;
    w.probe = box ? box.probe : s.probe;
    // A run that stopped on a cell not computed yet (`halted`) never computed what came after it.
    w.halted = !!(s && s.empty !== undefined);
    return w;
  }
  const ui = () => ({ sensors: V().sensors, avail: avail(), lit: readsOf(circ()), outs: V().outs, palette: offeredParts(), win: win(), sideView: wide(), pickable: true });
  /** The world's inputs and outputs as the shared editor sees them (../circuit/board.js). */
  const terms = () => ({ sensors: V().sensors, avail: avail(), outs: V().outs });
  /** The hint for this failure, worded again in the current language whenever the fail sheet is redrawn. */
  const hintFor = () => {
    const s = stage(), c = circ(), fails = rt.cur.fails;
    const pick = () => (L.diagnose ? L.diagnose(c, st) : null) || (s.hints ? s.hints[Math.min(Math.max(fails - 1, 0), s.hints.length - 1)] : null);
    return pick() ? lazy(pick) : null;
  };

  function openNode(id) {
    const n = circ().nodes.find(x => x.id === id), d = def(n.kind);
    const vals = n.kind === 'const' ? `<div class="chips" role="radiogroup" aria-label="${tr('数值', 'Value')}">${(stage().consts || [0, 1, 2, 3, 4, 5]).map(v => `<button class="chip" type="button" role="radio" aria-checked="${n.value === v}" data-act="val" data-v="${v}">${v}</button>`).join('')}</div>` : '';
    // A kind check is set to one kind (of the sensor wired into it).
    const kinds = n.kind === 'is' ? `<div class="optlabel">${tr('是哪一类', 'Which kind')}</div><div class="chips" role="radiogroup">${kindsOf(id).map(([v, l]) => `<button class="chip" type="button" role="radio" aria-checked="${n.value === v}" data-act="kind" data-v="${v}">${l}</button>`).join('')}</div>` : '';
    // An input part is set on its card: a view reader by a square of its box (and, layered, a layer), a cell or arm
    // reader by what it reads.
    const choices = n.kind === 'seem' || n.kind === 'seel' ? layerChoices() : [], g = isViewReader(n.kind) ? gridOf(n) : null;
    const mode = choices.length ? `<div class="optlabel">${tr('读哪一层', 'Which layer')}</div><div class="chips" role="radiogroup">${choices.map(([k, l]) => `<button class="chip" type="button" role="radio" aria-checked="${layerOf(n) === k}" data-act="layer" data-k="${k}">${l}</button>`).join('')}</div>` : '';
    const box = g ? `<div class="optlabel">${tr('读哪几格（每一格一个输出口）', 'Which cells (an output for each)')}</div><div class="rgrid" style="--rn:${g.n}">${g.cells.map(x => rcellHTML(x, 'pos')).join('')}</div>` : '';
    // 视野's arm and 本格信息's facts: each picked one is an output of its own.
    const picks = picksOf(n), opts = n.kind === 'fact' ? inputOptions('fact') : n.kind === 'see' ? armOf(n).map(a => [a.key, a.label]) : [];
    const pick = opts.length ? `<div class="optlabel">${n.kind === 'fact' ? tr('读哪几条（每一条一个输出口）', 'Which facts (an output for each)') : tr('手臂够到的（每一个一个输出口）', 'What the arm reaches (an output for each)')}</div><div class="chips">${opts.map(([v, l]) => `<button class="chip" type="button" aria-pressed="${picks.includes(v)}" data-act="pick" data-v="${v}">${l}</button>`).join('')}</div>` : '';
    const fixed = id in CARDS;
    // A merge can change its model in place: the wires stay, only the way it merges changes.
    const swaps = swapsOf(n.kind, offeredParts());
    const swap = swaps.length > 1 ? `<div class="optlabel">${tr('型号（换型号时连线不变）', 'Model (the wires stay when you swap)')}</div><div class="chips" role="radiogroup" aria-label="${tr('型号', 'Model')}">${swaps.map(k => `<button class="chip" type="button" role="radio" aria-checked="${k === n.kind}" data-act="swap" data-k="${k}">${def(k).tag}</button>`).join('')}</div>` : '';
    rt.openSheet(`<div><div class="kicker sig">${d.bp ? tr('零件', 'Part') : tr('元件', 'Component')}</div><h3 class="sh" id="sheetTitle">${d.name}</h3></div>
      <div class="prose"><p>${d.desc}</p></div>${mode}${box}${pick}${vals}${kinds}${swap}
      <div class="acts">${fixed ? '' : `<button class="btn sec" type="button" data-act="del">${tr('拿掉这个元件', 'Remove this component')}</button>`}<button class="btn pri" type="button" data-close data-primary>${tr('好', 'OK')}</button></div>`, {
      val: el => { setCirc({ ...circ(), nodes: circ().nodes.map(x => (x.id === id ? { ...x, value: +el.dataset.v } : x)) }); rt.closeSheet(); rt.refresh(); },
      kind: el => { setValue(id, el.dataset.v); buzz(6); rt.refresh(); openNode(id); },
      pick: el => { togglePick(id, el.dataset.v); buzz(6); rt.refresh(); openNode(id); },
      layer: el => { setLayer(id, el.dataset.k); buzz(6); rt.refresh(); openNode(id); },
      pos: el => { const [dr, dc] = el.dataset.d.split(',').map(Number); setPos(id, dr, dc); buzz(6); rt.refresh(); openNode(id); },
      swap: el => { setCirc({ ...circ(), nodes: circ().nodes.map(x => (x.id === id ? { ...x, kind: el.dataset.k } : x)) }); buzz(8); rt.closeSheet(); rt.refresh(); },
      del: () => { setCirc(removeNode(circ(), id)); rt.closeSheet(); rt.refresh(); },
    }, () => openNode(id));
  }

  /** A square of a view reader's box: what the cell holds now, its mark, lit when the reader reads it. */
  const rcellHTML = (x, act) => `<button class="rcell${x.on ? ' on' : ''}${x.self ? ' self' : ''}" type="button" data-act="${act}" data-d="${x.dr},${x.dc}"${x.ok ? '' : ' disabled'} aria-pressed="${x.on}" aria-label="${x.dr},${x.dc}"></button>`;
  /** Set a part's value; a reader set to read one thing (an arm reader) keeps its wires, now from what it reads. */
  const setValue = (id, v) => {
    const c = circ(), n = c.nodes.find(x => x.id === id);
    const wires = isInput(n.kind) ? c.wires.map(w => (splitSrc(w.from)[0] === id ? { ...w, from: `${id}#${v}` } : w)) : c.wires;
    setCirc({ ...c, nodes: c.nodes.map(x => (x.id === id ? { ...x, value: v } : x)), wires });
  };

  /** Pick a part for an empty slot: the level's parts, each with what it does. */
  function openSlot(at) {
    const fresh = stage().fresh || [];
    const models = offeredParts().filter(k => MERGES.includes(k));
    const rows = shelf(paletteAll()).map(kind => {
      const d = def(kind), one = MERGES.includes(kind) && models.length > 1 ? mergerEntry(models) : null;
      const isNew = one ? models.some(k => fresh.includes(k)) : fresh.includes(kind);
      return `<button class="pal" type="button" data-act="put" data-k="${kind}"><span class="pal-ic">${lookSVG(one ? one.look : kind)}</span><span class="pal-tx"><b>${one ? one.label : d.name}${isNew ? `<em>${tr('新', 'new')}</em>` : ''}</b><small>${one ? one.desc : d.desc}</small></span></button>`;
    }).join('');
    rt.openSheet(`<div><div class="kicker sig">${tr('元件', 'Components')}</div><h3 class="sh" id="sheetTitle">${tr(`放进第 ${at + 1} 格`, `Put in slot ${at + 1}`)}</h3></div>
      <div class="list">${rows}</div>
      <div class="acts"><button class="btn sec" type="button" data-close>${tr('取消', 'Cancel')}</button></div>`, {
      put: el => { const k = el.dataset.k; setCirc(placeNode(circ(), k, at, isInput(k) ? firstOf(k) : undefined)); buzz(8); rt.closeSheet(); rt.refresh(); },
    }, () => openSlot(at));
  }

  /** First step whose outputs differ from the reference circuit's; scanning in rounds, the first cell that settled wrong. */
  function firstMismatch(t, res) {
    if (!stage().solution || L.noTrace) return null;
    const ref = runCircuit(V(), t, stage().solution, opt());
    if (stage().rounds) {
      const key = [...ref.table.keys()].find(x => res.table.get(x) !== ref.table.get(x));
      if (key === undefined) return null;
      const q = res.steps.map(x => x.at.includes(key)).lastIndexOf(true);
      return { q: q < 0 ? res.steps.length - 1 : q, key, want: ref.table.get(key), got: res.table.get(key) };
    }
    for (let q = 0; q < res.steps.length; q++) {
      const z = res.steps[q].writes.findIndex(([, v], j) => ref.steps[q].writes[j][1] !== v);
      if (z >= 0) return { q, z, want: ref.steps[q].writes[z][1], got: res.steps[q].writes[z][1] };
    }
    return null;
  }

  /** Why test k failed; lazy, so an open fail sheet can be redrawn in the other language. */
  function explain(k, t, res, mm) {
    const Vw = V(), o = opt(), failed = lazy(() => tr(`测试 ${k + 1} 没通过`, `Test ${k + 1} failed`));
    if (res.error && res.error.diverge) {
      return {
        head: lazy(() => tr('表一直停不下来', 'The table never settles')),
        body: lazy(() => tr(`测试 ${k + 1} 中，机器扫了 ${MAX_ROUNDS} 轮，表还在变。照这块电路板，有些格子会越算越大（或越算越小），永远不会稳定下来。`,
          `In test ${k + 1}, the machine scanned ${MAX_ROUNDS} rounds and the table was still changing. With this circuit board, some cells keep growing (or shrinking) and will never settle down.`)),
      };
    }
    if (res.error) {
      return {
        head: lazy(() => tr('读到了空格子', 'Read an empty cell')),
        body: lazy(() => tr(`测试 ${k + 1} 中，机器算到<b>${Vw.where(res.error.cell)}</b>时，电路要读<b>${Vw.name(res.error.key)}</b>，可那里还空着。机器是按「${Vw.orderText(o)}」的顺序算的，读之前，那个格子必须已经算好。`,
          `In test ${k + 1}, when the machine reached <b>${Vw.where(res.error.cell)}</b>, the circuit tried to read <b>${Vw.name(res.error.key)}</b>, but that cell was still empty. The machine works in the order “${Vw.orderText(o)}”, so a cell must already be computed before anything reads it.`)),
      };
    }
    if (mm && mm.key !== undefined) {
      return {
        head: failed,
        body: lazy(() => tr(`${label(t)}：表稳定下来以后，<b>${Vw.name(mm.key)}</b>应该是 <b>${signal(mm.want)}</b>，你的电路板算出了 <b>${signal(mm.got)}</b>。棋盘上标红的就是这一格。`,
          `${label(t)}: once the table settles, <b>${Vw.name(mm.key)}</b> should be <b>${signal(mm.want)}</b>, but your circuit board computed <b>${signal(mm.got)}</b>. It is the cell marked in red on the board.`)),
      };
    }
    if (mm) {
      const s = res.steps[mm.q];
      return {
        head: failed,
        body: lazy(() => tr(`${label(t)}：机器在<b>${Vw.where(s.cell)}</b>出了错。「${Vw.outs[mm.z][1]}」应该是 <b>${signal(mm.want)}</b>，你的电路算出了 <b>${signal(mm.got)}</b>。棋盘停在了这一格；电路板上的小数字，是机器在这一格算出的值。`,
          `${label(t)}: the machine went wrong at <b>${Vw.where(s.cell)}</b>. “${Vw.outs[mm.z][1]}” should be <b>${signal(mm.want)}</b>, but your circuit computed <b>${signal(mm.got)}</b>. The board has stopped on this cell; the small numbers on the circuit board are the values the machine computed here.`)),
      };
    }
    if (Vw.layered && res.value === null) return { head: failed, body: lazy(() => tr('测试棋盘上还没有勾选任何一层：勾上的层，终点的数加起来才是答案。', 'No layer is ticked on the test board: the answer is the end cells of the ticked layers, added up.')) };
    const why = () => (L.explain ? L.explain(t, res, st) : '');
    return {
      head: failed,
      body: lazy(() => tr(`${label(t)}：答案应该是 <b>${signal(expected()[k])}</b>，机器算出了 <b>${signal(res.value)}</b>。${why()}`, `${label(t)}: the answer should be <b>${signal(expected()[k])}</b>, but the machine computed <b>${signal(res.value)}</b>. ${why()}`)),
      extra: L.counter ? lazy(() => L.counter(t, res, o)) : '',
    };
  }

  /** Every test of a stage passed and another stage follows: say what it showed, then move on (keeping the board). */
  function stageDone() {
    const s = stage(), n = stages.length, d = s.done || {};
    buzz([15, 40, 15]);
    rt.openSheet(`<div><div class="kicker good">${tr(`阶段 ${st.stage + 1}/${n} · 完成`, `Stage ${st.stage + 1}/${n} · done`)}</div><h3 class="sh" id="sheetTitle">${d.head || tr('这一阶段通过了', 'This stage is cleared')}</h3></div>
      <div class="prose">${(d.body || []).map(p => `<p>${p}</p>`).join('')}</div>
      <div class="acts"><button class="btn pri" type="button" data-act="next" data-primary>${tr(`进入阶段 ${st.stage + 2}`, `On to stage ${st.stage + 2}`)}</button></div>`, {
      next: () => {
        const prev = circ();
        st.stage++;
        if (stage().carry && !st.circs[st.stage].nodes.length) {
          // Keep the board, minus any input the new stage's robot no longer has.
          const ok = new Set(avail()), c = clone(prev);
          st.circs[st.stage] = { ...c, lit: (c.lit || []).filter(x => ok.has(x)), wires: c.wires.filter(w => !w.from.startsWith('tap:') || ok.has(w.from.slice(4))) };
        }
        st.ti = 0;
        changed();
        rt.closeSheet();
        rt.refresh();
        if (stage().unlockToast) toast(stage().unlockToast);
      },
    });
  }

  const ctl = {
    st,
    save: () => ({ stage: st.stage, circs: st.circs }),
    tests: () => tests().map((t, k) => ({ label: `${tr('测试', 'Test')} ${k + 1} · ${label(t)}`, status: st.status[k] })),
    selectTest(k) { st.ti = k; st.view = null; st.typed = {}; st.robot = null; st.sel = null; rt.refresh(); },
    scene() {
      const t = tests()[st.ti], v = st.view;
      return { ...V().scene(t, v, { ...opt(), ...(v && v.end && v.pass && L.trace ? L.trace(t) : {}), bench: v ? null : sandbox() }), look: robot.look };
    },
    boardOpt: () => L.boardOpt || { minScale: 0.7, maxScale: 1.25 },
    /** The hints behind the brief's 提示 button: this stage's, in order. */
    hints: () => stage().hints || L.hints || null,
    /** Under the test board: what the last run found. How the board works is in the encyclopedia. */
    note() {
      const v = st.view, Vw = V();
      if (!v) return '';
      const s = shownStep();
      if (!v.end) return s ? tr(`${s.round ? `第 ${s.round} 轮 · ` : ''}正在算${Vw.where(s.cell)}`, `${s.round ? `Round ${s.round} · ` : ''}Computing ${Vw.where(s.cell)}`) : '';
      if (v.focus !== null && v.focus !== undefined) return tr(`正在看${Vw.where(s.cell)}，再点一次取消。`, `Looking at ${Vw.where(s.cell)}. Click again to leave.`);
      if (v.halt) return tr(`机器在${Vw.where(s.cell)}出了错。`, `The machine went wrong at ${Vw.where(s.cell)}.`);
      const rounds = v.res.rounds ? tr(`扫了 ${v.res.rounds} 轮，最后一轮一格也没变。`, `Scanned ${v.res.rounds} round${v.res.rounds === 1 ? '' : 's'}; the last round changed nothing. `) : '';
      return `${rounds}${v.pass ? tr(`答案 ${signal(v.res.value)}，正确。`, `Answer ${signal(v.res.value)}: correct.`) : tr(`机器算出 ${signal(v.res.value)}，应该是 ${signal(expected()[st.ti])}。`, `The machine computed ${signal(v.res.value)}; it should be ${signal(expected()[st.ti])}.`)}`;
    },
    after: () => `${st.view && st.view.end && !busy() ? `<button class="sec-btn backbench" type="button" data-act="sandbox">${tr('回到棋盘测试', 'Back to the test board')}</button>` : ''}${L.after ? L.after(tests()[st.ti], st.view, st) : ''}`,
    tip() {
      const c = circ();
      const g = L.guide ? L.guide(c, readsOf(c)) : null;
      if (g) return { text: g };
      const s = stage(), text = [stages.length > 1 && s.ask ? `<b>${tr(`阶段 ${st.stage + 1}/${stages.length}`, `Stage ${st.stage + 1}/${stages.length}: `)}</b>${s.ask}` : '', s.tip || ''].filter(Boolean).join(' ');
      return text ? { text } : null;
    },
    panelStage: true,
    sideView: true,
    /** The board, played on the shared circuit editor: the graph it shows, how a change comes back, new parts, sheets. */
    board: {
      graph: () => toGraph(circ(), terms()),
      // Each stage's board has its own undo history.
      stage: () => st.stage,
      parts: () => partsFor(circ(), terms()),
      probe: () => win().probe,
      /** Whether the run stopped on a cell not computed yet, before computing the rest. */
      reading: () => ({ halted: win().halted }),
      change(next, { keep } = {}) {
        if (busy()) return;
        const c = fromGraph(next, circ());
        // A card moved only changes where it sits: kept, but the tests need not run again.
        if (keep) { st.circs[st.stage] = c; rt.persist(); } else setCirc(c);
        rt.refresh();
      },
      // A new input part comes set to something it can read.
      create: (graph, kind, at) => create(graph, kind, at, isInput(kind) ? firstOf(kind) : undefined),
      inputOptions: kind => inputOptions(kind),
      sensors: () => V().sensors,
      kinds: id => kindsOf(id),
      // The editor's nodes carry `type`; the engine's helpers read `kind`.
      gridOf: node => gridOf(asNode(node)),
      setPos(id, dr, dc) { if (busy()) return; setPos(id, dr, dc); buzz(6); rt.refresh(); },
      layerChoices: kind => (kind === 'seem' || kind === 'seel' ? layerChoices() : []),
      layerOf: node => layerOf(asNode(node)),
      setLayer(id, choice) { if (busy()) return; setLayer(id, choice); buzz(6); rt.refresh(); },
      reset() { setCirc(fresh()); rt.refresh(); },
      palette: () => {
        const all = paletteAll(), fresh = stage().fresh || [], models = all.filter(k => MERGES.includes(k));
        return shelf(all).map(kind => {
          const d = def(kind);
          // A part that shares its name with a family shown as one entry (「任一是」 beside the mergers) says its model.
          const twin = !modelsOf(kind) && all.some(k => k !== kind && modelsOf(k) && def(k).name === d.name);
          const item = { type: kind, name: twin ? lazy(() => `${d.name} · ${d.tag}`) : d.name, label: d.tag && kind !== 'const' && !d.bp ? lazy(() => `${d.name} · ${d.tag}`) : d.name, desc: d.desc, icon: lookIcon(kind), tag: kind === 'const' ? tr('一个数', 'a number') : d.tag, fresh: fresh.includes(kind) };
          if (!MERGES.includes(kind) || models.length < 2) return item;
          const m = mergerEntry(models);
          return { ...item, ...m, name: m.label, fresh: models.some(k => fresh.includes(k)) };
        });
      },
      consts: () => stage().consts || [0, 1, 2, 3, 4, 5],
      /** The models a merger can swap to in place (its wires stay). */
      swaps: kind => swapsOf(kind, offeredParts()),
      setValue(id, v) { if (busy()) return; setValue(id, v); buzz(6); rt.refresh(); },
      togglePick(id, pick) { if (busy()) return; togglePick(id, pick); buzz(6); rt.refresh(); },
      setPick(id, from, to) { if (busy()) return; setPick(id, from, to); buzz(6); rt.refresh(); },
      addPick(id) { if (busy()) return; addPick(id); buzz(6); rt.refresh(); },
      armOf: node => armOf(asNode(node)),
      /** Repaint what the robot reads (into the phone's input cards, once React has drawn them). */
      paintView: () => ctl.mounted(),
      /** What one of a reader's outputs carries now, wired or not. */
      outValue: (node, pick) => signal(readPick({ id: node.id, kind: node.type, value: node.value }, pick)),
      swap(id, kind) { if (busy()) return; setCirc({ ...circ(), nodes: circ().nodes.map(x => (x.id === id ? { ...x, kind } : x)) }); buzz(8); rt.refresh(); },
      openNode: id => { if (!busy() && circ().nodes.some(n => n.id === id)) openNode(id); },
      openSlot: at => { if (!busy()) openSlot(at); },
    },
    /** Esc: put the number pad away. */
    cancel() {
      if (!st.sel) return false;
      st.sel = null;
      st.input = '';
      rt.refresh();
      return true;
    },
    // The machine's settings (what the state remembers, the scan order, the rewrite direction) are the level's and
    // are not shown as controls: the player lights inputs and builds the circuit, nothing else.
    /** Under the task, on a table the player stacks: how many layers it has. (Which robot a level runs on is its
     *  chapter's: the map groups levels by robot, so a level does not introduce it again.) */
    panel() {
      if (!V().layered) return '';
      const n = circ().layers || 1, max = stage().maxLayers || 8;
      return `<div class="pcard robotcard"><div class="rc-set"><span class="optlabel">${tr('表的层数', 'Layers in the table')}</span><div class="layerset"><button class="chip" type="button" data-act="layers" data-v="-1" aria-label="${tr('少一层', 'One layer fewer')}"${n <= 1 ? ' disabled' : ''}>−</button><b aria-live="polite">${tr(`${n} 层`, `${n} layer${n === 1 ? '' : 's'}`)}</b><button class="chip" type="button" data-act="layers" data-v="1" aria-label="${tr('多一层', 'One more layer')}"${n >= max ? ' disabled' : ''}>+</button></div><small>${tr(`每一层都跑同一块电路板；本层号从 0 数起，最多 ${max} 层`, `every layer runs the same circuit board; layer numbers count from 0, up to ${max} layers`)}</small></div></div>`;
    },
    /** A line over the test board: how the answer is read off a table the player stacks. */
    boardHint: () => (V().layered ? tr('勾选层号右边的方框：勾上的层，终点的数加起来就是答案。', 'Tick the box at the right of a layer’s number: the end cells of the ticked layers add up to the answer.') : ''),
    /** Whether the board has input cards: the inputs pane shows what they read. */
    hasInputs: () => circ().nodes.some(n => isInput(n.kind)),
    /** What the robot reads (its view, its arm, its cell's facts), in the strip's inputs pane on a desktop and above
     *  the board on a phone; clicking one adds or removes its output on the input card. */
    mounted() {
      const view = $('#cview');
      if (view) view.innerHTML = viewHTML(circ(), ui());
      // On a phone each input card holds its own share of it ([data-cardview], js/circuit/BoardView.jsx).
      for (const box of document.querySelectorAll('[data-cardview]')) box.innerHTML = viewHTML(circ(), ui(), box.dataset.cardview);
    },
    // The run bar: 单步 is always there (before a run it starts one held on its first step; during one it stops the
    // run where it is, or moves a stopped run on a step), then clear and Run, or during a run pause / go on and skip.
    dock() {
      if (st.sel) return { pad: true };
      const meta = stages.length > 1 ? tr(`阶段 ${st.stage + 1}/${stages.length}`, `Stage ${st.stage + 1}/${stages.length}`) : '';
      if (busy()) {
        const ctrl = [
          { act: 'step', icon: 'step', label: tr('单步', 'Step') },
          Anim.paused ? { act: 'resume', icon: 'play', label: tr('继续', 'Continue') } : { act: 'pause', icon: 'pause', label: tr('暂停', 'Pause') },
        ];
        return { meta, ctrl, go: tr('跳过动画', 'Skip animation'), act: 'run', busy: true };
      }
      return {
        meta,
        ctrl: [{ act: 'step', icon: 'step', label: tr('单步', 'Step') }],
        sec: circ().nodes.length ? (st.armed ? tr('确认清空', 'Confirm clear') : tr('清空', 'Clear')) : '',
        secAct: 'clear',
        go: tr('运行测试', 'Run tests'),
        act: 'run',
      };
    },
    padTitle: () => tr(`${V().name(st.sel)}：填一个数（不填 = 清空这一格）`, `${V().name(st.sel)}: type a number (leave blank to clear the cell)`),
    /** An extra pad key that moves the robot onto the selected cell, when it can stand there. */
    padExtra() {
      const t = tests()[st.ti], c = V().cellOf(t, st.sel, opt());
      return c && !sandbox().at.includes(st.sel) ? { key: 'bot', label: tr('让机器人站到这一格', 'Put the robot on this cell') } : null;
    },
    key(k) {
      if (k === 'del') st.input = st.input.slice(0, -1);
      else if (k === 'bot') { st.robot = V().cellOf(tests()[st.ti], st.sel, opt()); st.sel = null; st.input = ''; buzz(8); }
      else if (k === 'ok') {
        if (st.input === '') delete st.typed[st.sel];
        else st.typed[st.sel] = +st.input;
        st.sel = null;
        st.input = '';
        buzz(8);
      } else if (st.input.length < 3) st.input = (st.input === '0' ? '' : st.input) + k;
      rt.refresh();
    },
    act(name, el) {
      if (name === 'run') { if (busy()) Anim.skip(); else ctl.run(); return; }
      if (name === 'pause') { if (busy()) Anim.pause(); return; }
      if (name === 'resume') { if (busy()) Anim.resume(); return; }
      if (name === 'step') { if (!busy()) ctl.run({ step: true }); else if (Anim.paused) Anim.step(); else Anim.pause(); return; }
      if (busy()) return;
      if (name === 'sandbox') { st.view = null; rt.refresh(); }
      // A sensor clicked in the inputs window: its output on the input card comes or goes.
      if (name === 'pick') { pickSensor(el.dataset.v); buzz(6); rt.refresh(); }
      if (name === 'layers') {
        const n = Math.max(1, Math.min(stage().maxLayers || 8, (circ().layers || 1) + Number(el.dataset.v)));
        setCirc({ ...circ(), layers: n }); st.robot = null; st.typed = {}; changed(); buzz(6); rt.refresh();
      }
      if (name === 'answer') { const m = Number(el.dataset.v), on = circ().answerLayers || [0]; setCirc({ ...circ(), answerLayers: on.includes(m) ? on.filter(x => x !== m) : [...on, m] }); changed(); buzz(6); rt.refresh(); }
      if (name === 'clear') {
        if (!st.armed) { st.armed = true; rt.refresh(); setTimeout(() => { if (st.armed) { st.armed = false; rt.refresh(); } }, 2600); return; }
        setCirc(fresh());
        rt.refresh();
      }
    },
    onCell(id) {
      const v = st.view;
      if (busy()) return;
      if (!v) { st.sel = st.sel === id ? null : id; st.input = ''; buzz(6); rt.refresh(); return; }
      if (!v.end) return;
      let q = -1;
      v.res.steps.slice(0, v.k).forEach((s, j) => { if (s.at.includes(id)) q = j; });
      if (q < 0) return;
      v.focus = v.focus === q ? null : q;
      buzz(6);
      rt.refresh();
    },
    /** Run every test; `step` starts the run paused, so the player steps through it. */
    async run({ step = false } = {}) {
      const c = circ(), Vw = V(), o = opt(), s = stage();
      const miss = Vw.outs.find(([id]) => !c.wires.some(w => w.to === `out:${id}`));
      if (miss) { toast(tr(`输出口「${miss[1]}」还没接线`, `The output “${miss[1]}” is not wired yet`)); buzz(20); return; }
      st.pick = null;
      st.wire = null;
      st.sel = null;
      st.typed = {};
      st.robot = null;
      rt.startRun({ paused: step });
      st.status = tests().map(() => null);
      for (let k = 0; k < tests().length; k++) {
        const t = tests()[k], res = runCircuit(Vw, t, c, o), want = expected()[k];
        // checkAll levels grade every cell, not just the answer cell.
        // With layers the player builds, the reference circuit's layers need not mean what the player's do: only the answer is checked.
        const mm = res.error || s.onFail || Vw.layered || (!(s.checkAll ?? L.checkAll) && res.value === want) ? null : firstMismatch(t, res);
        const ok = !res.error && res.value === want && !mm;
        const stop = mm && mm.key === undefined ? mm.q + 1 : res.steps.length;
        st.ti = k;
        st.status[k] = 'run';
        st.view = { res, k: 0, pass: ok, end: false, halt: !!(res.error && !res.error.diverge) || (!!mm && mm.key === undefined), focus: null, badKey: mm ? mm.key : undefined };
        rt.refresh();
        // Long runs (many rounds) show several steps per frame, so a run never takes much more than two seconds; a
        // paused run goes one step at a time.
        const per = Math.max(22, Math.min(220, 1700 / stop)), stride = Math.max(1, Math.ceil(stop / 90));
        const by = () => (Anim.paused ? 1 : stride);
        for (let j = Math.min(by(), stop); ; j = Math.min(j + by(), stop)) {
          st.view.k = j;
          rt.renderBoard();
          ctl.mounted();
          await Anim.wait(per);
          if (j === stop) break;
        }
        st.view.end = true;
        st.status[k] = ok ? 'pass' : 'fail';
        if (!ok) {
          rt.endRun();
          rt.refresh();
          if (s.onFail) {
            rt.fail(s.onFail({ L, k, res, advance() { st.stage++; changed(); toast(stage().unlockToast); } }));
            return;
          }
          rt.fail({ ...explain(k, t, res, mm), hint: hintFor() });
          return;
        }
        rt.refresh();
        await Anim.wait(420);
      }
      rt.endRun();
      rt.refresh();
      if (st.stage < stages.length - 1) { stageDone(); return; }
      rt.pass();
    },
  };
  return ctl;
}
