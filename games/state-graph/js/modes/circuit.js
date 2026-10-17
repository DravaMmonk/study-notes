// Circuit levels: a robot walks the table cell by cell and runs the player's circuit board on each cell.
// The player lights cells in the robot's window as inputs, wires components on the shared circuit editor (the one
// Vision Complete uses, ../../../kit/circuit, through `ctl.board` and ../circuit/board.js), and the board writes the
// robot's cell.
// Before a run the test board is a sandbox: the player types numbers into cells and puts the robot anywhere, and the
// robot's cell shows the circuit's answer at once. Running clears the board and the robot starts from its usual cell.
// A level may have several stages: a new world with new inputs (when a run fails on purpose), or a new question on
// the same board (when every test passes; `carry` keeps the circuit). A stage may give the player a scan-order dial,
// a filter for the sweeping arm, or scan in rounds until the table settles.

import { $, buzz, toast, signal, wide } from '../util.js';
import { rt, Anim } from '../runtime.js';
import { WORLDS, runCircuit, readTap, windowOf, visibleTaps, MAX_ROUNDS } from '../circuit/worlds.js';
import { ROBOTS } from '../circuit/robots.js';
import { def, blank, evaluate, clone } from '../circuit/components.js';
import { viewHTML, removeNode, placeNode, toggleLit, litOf } from '../circuit/editor.js';
import { toGraph, fromGraph, create, partsFor } from '../circuit/board.js';
import { lookIcon, lookSVG } from '../circuit/looks.js';
import { PARTS } from '../levels/parts.js';
import { tr, lazy } from '../i18n.js';
import { KEY_COLORS } from '../circuit/worlds/maze.js';

const MERGES = ['msum', 'mmin', 'mmax'];
/** A level's parts as the player picks them: its mergers are one entry (the first of them), whose model is then chosen
 *  on the card. */
const shelf = palette => palette.filter(k => !MERGES.includes(k) || k === palette.find(m => MERGES.includes(m)));
/** How that one merger entry reads, when the level has more than one model of it. */
const mergerEntry = models => ({
  label: lazy(() => def(models[0]).name),
  tag: lazy(() => models.map(k => def(k).tag).join(' / ')),
  icon: lookIcon('merger'),
  look: 'merger',
  desc: lazy(() => tr(`把接进来的几个数汇成一个。放上后在卡片上选型号：${models.map(k => def(k).tag).join('、')}；换型号时连线不变。`, `Merges the numbers wired into it into one. Pick its model on the card once placed: ${models.map(k => def(k).tag).join(', ')}; the wires stay when you swap.`)),
});

/** What the state remembers: one switch per key color; the table has a layer for every set of remembered keys. */
function memoryCard(s, mem, t) {
  const n = 2 ** mem.length;
  return `<div class="pcard memo"><h3>${tr('状态记住什么', 'What the state remembers')}<small>${tr(`${n} 层 · 每层 ${t.R * t.C} 格 · 一共 ${n * t.R * t.C} 格`, `${n} layer${n === 1 ? '' : 's'} · ${t.R * t.C} cells each · ${n * t.R * t.C} cells in all`)}</small></h3>
    <div class="chips">${s.memory.map(c => `<button class="chip memk k-${c}" type="button" role="switch" aria-checked="${mem.includes(c)}" data-act="mem" data-v="${c}"><span class="box"></span>${tr(`记住${KEY_COLORS[c].n}钥匙`, `Remember the ${KEY_COLORS[c].n} key`)}</button>`).join('')}</div>
    </div>`;
}

/** A small picture of a scan order: the cells of a little table numbered in the order the robot visits them. */
function orderFig({ R, C, list }) {
  const at = new Map(list.map(([r, c], k) => [`${r},${c}`, k + 1])), cells = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const k = at.get(`${r},${c}`); cells.push(`<i${k ? '' : ' class="no"'}>${k || ''}</i>`); }
  return `<span class="ofig" style="--oc:${C}" aria-hidden="true">${cells.join('')}</span>`;
}

export function circuitMode(L, saved) {
  const stages = L.stages || [L];
  const st = {
    stage: saved && saved.stage ? saved.stage : 0,
    circs: stages.map((s, k) => (saved && saved.circs && saved.circs[k]) || (s.preset ? clone(s.preset) : blank())),
    dirs: { ...(L.dirs || {}), ...((saved && saved.dirs) || {}) },
    scan: stages.map((s, k) => (saved && saved.scan && saved.scan[k]) || (s.dial ? s.dial[0] : null)),
    filter: stages.map((s, k) => (saved && saved.filter && saved.filter[k]) || 'all'),
    mem: stages.map((s, k) => (saved && saved.mem && saved.mem[k]) || []),
    armed: false, ti: 0, status: [], view: null,
    typed: {}, robot: null, sel: null, input: '',
  };
  const robot = ROBOTS[L.robot];
  const stage = () => stages[st.stage], V = () => WORLDS[stage().world], circ = () => st.circs[st.stage];
  const tests = () => stage().tests || L.tests, expected = () => stage().expected || L.expected;
  const opt = () => ({ ...stage(), dirs: st.dirs, ...(stage().dial ? { scan: st.scan[st.stage] } : {}), filter: st.filter[st.stage], remember: st.mem[st.stage] });
  const io = () => ({ taps: V().taps, outs: V().outs });
  const label = t => (L.testLabel || V().label)(t);
  const busy = () => rt.cur.running;
  const changed = () => { st.status = tests().map(() => null); st.view = null; st.armed = false; rt.persist(); };
  st.status = tests().map(() => null);
  const setCirc = c => { st.circs[st.stage] = c; changed(); };
  const shownStep = () => { const v = st.view; if (!v || !v.k) return null; return v.res.steps[v.focus ?? v.k - 1]; };

  /** Inputs this robot can light: the cells it sees, its arm, and the level's facts about its own cell. */
  const avail = () => [...visibleTaps(V(), robot.vision), ...(robot.arm && !stage().noArm ? V().armTaps : []), ...(stage().facts || [])];

  /** Sandbox: typed numbers on the board, the robot where the player put it, and its answer computed live. */
  function sandbox() {
    const t = tests()[st.ti], Vw = V(), o = opt(), cell = st.robot || Vw.sample(t, o), keys = Vw.keys(t, cell);
    const shown = new Map(Vw.base ? Vw.base(t, o) : []), reads = new Set(), empty = new Set(), probe = {};
    Object.entries(st.typed).forEach(([k, v]) => shown.set(k, v));
    const get = key => { reads.add(key); if (shown.has(key)) return shown.get(key); empty.add(key); return null; };
    const { out } = evaluate(circ(), id => readTap(Vw, t, cell, id, get, o), Vw.outs.map(x => x[0]), probe);
    Object.entries(keys).forEach(([id, key]) => shown.set(key, out[id]));
    return { cell, at: Object.values(keys), shown, reads, empty, probe, typed: new Set(Object.keys(st.typed)), sel: st.sel };
  }

  /** The robot's window: live during a run or an inspection, otherwise around the robot on the sandbox. */
  function win() {
    const t = tests()[st.ti], Vw = V(), o = opt(), v = st.view, s = shownStep(), box = s ? null : sandbox();
    const cell = s ? s.cell : box.cell, shown = box ? box.shown : new Map(v.res.base);
    if (v) v.res.steps.slice(0, (v.focus ?? v.k - 1) + 1).forEach(x => (x.writes || []).forEach(([key, val]) => shown.set(key, val)));
    const reads = s ? new Set(s.reads) : box.reads, isEmpty = key => (s ? s.empty === key : box.empty.has(key));
    const mark = x => ({ ...x, value: x.key !== null && shown.has(x.key) ? signal(shown.get(x.key)) : '', state: isEmpty(x.key) ? 'empty' : reads.has(x.key) ? 'read' : '' });
    const w = windowOf(Vw, t, cell, robot.vision, o);
    w.wins = w.wins.map(x => ({ ...x, cells: x.cells.map(mark) }));
    if (w.arm && w.arm.cells) w.arm.cells = w.arm.cells.map(mark);
    if (w.arm && w.arm.sweeps) w.arm.sweeps = w.arm.sweeps.map(x => ({ ...x, cells: x.cells.map(mark) }));
    if (w.arm && (stage().noArm || !robot.arm)) w.arm = null;
    if (w.arm) w.arm.filter = o.filter;
    w.facts = (stage().facts || []).map(id => ({ id, value: signal(readTap(Vw, t, cell, id, key => shown.get(key) ?? null, o)) }));
    w.note = box ? Vw.where(cell) : v.focus !== null && v.focus !== undefined ? tr(`查看${Vw.where(cell)}`, `Inspecting ${Vw.where(cell)}`) : Vw.where(cell);
    w.robot = robot;
    w.probe = box ? box.probe : s.probe;
    return w;
  }
  const ui = () => ({ taps: V().taps, avail: avail(), lit: litOf(circ()), outs: V().outs, palette: stage().palette, win: win(), sideView: wide() });
  /** The world's inputs and outputs as the shared editor sees them (../circuit/board.js). */
  const terms = () => ({ taps: V().taps, avail: avail(), outs: V().outs });
  /** The hint for this failure, worded again in the current language whenever the fail sheet is redrawn. */
  const hintFor = () => {
    const s = stage(), c = circ(), fails = rt.cur.fails;
    const pick = () => (L.diagnose ? L.diagnose(c, st) : null) || (s.hints ? s.hints[Math.min(Math.max(fails - 1, 0), s.hints.length - 1)] : null);
    return pick() ? lazy(pick) : null;
  };

  function openNode(id) {
    const n = circ().nodes.find(x => x.id === id), d = def(n.kind);
    const vals = n.kind === 'const' ? `<div class="chips" role="radiogroup" aria-label="${tr('数值', 'Value')}">${(stage().consts || [0, 1, 2, 3, 4, 5]).map(v => `<button class="chip" type="button" role="radio" aria-checked="${n.value === v}" data-act="val" data-v="${v}">${v}</button>`).join('')}</div>` : '';
    // A merge can change its model in place: the wires stay, only the way it merges changes.
    const swaps = MERGES.includes(n.kind) ? MERGES.filter(k => k === n.kind || stage().palette.includes(k)) : [];
    const swap = swaps.length > 1 ? `<div class="optlabel">${tr('型号（换型号时连线不变）', 'Model (the wires stay when you swap)')}</div><div class="chips" role="radiogroup" aria-label="${tr('型号', 'Model')}">${swaps.map(k => `<button class="chip" type="button" role="radio" aria-checked="${k === n.kind}" data-act="swap" data-k="${k}">${def(k).tag}</button>`).join('')}</div>` : '';
    rt.openSheet(`<div><div class="kicker sig">${d.bp ? tr('零件', 'Part') : tr('元件', 'Component')}</div><h3 class="sh" id="sheetTitle">${d.name}</h3></div>
      <div class="prose"><p>${d.desc}</p></div>${vals}${swap}
      <div class="acts"><button class="btn sec" type="button" data-act="del">${tr('拿掉这个元件', 'Remove this component')}</button><button class="btn pri" type="button" data-close data-primary>${tr('好', 'OK')}</button></div>`, {
      val: el => { setCirc({ ...circ(), nodes: circ().nodes.map(x => (x.id === id ? { ...x, value: +el.dataset.v } : x)) }); rt.closeSheet(); rt.refresh(); },
      swap: el => { setCirc({ ...circ(), nodes: circ().nodes.map(x => (x.id === id ? { ...x, kind: el.dataset.k } : x)) }); buzz(8); rt.closeSheet(); rt.refresh(); },
      del: () => { setCirc(removeNode(circ(), id)); rt.closeSheet(); rt.refresh(); },
    }, () => openNode(id));
  }

  /** The rewrite-direction switches of the knapsack levels, under the board. */
  const dirsCard = () => (L.dirs ? `<div class="pcard"><h3>${tr('改写方向', 'Rewrite direction')}</h3>${['01', 'inf'].map(kind => `<div class="dirrow"><div class="optlabel">${kind === '01' ? tr('每件最多拿一次时', 'When each item can be taken at most once') : tr('每件可以拿很多次时', 'When each item can be taken many times')}</div>
        <div class="chips two" role="radiogroup" aria-label="${tr('改写方向', 'Rewrite direction')}">${[['asc', tr('从左往右 →', 'left to right →')], ['desc', tr('← 从右往左', '← right to left')]].map(([v, l]) => `<button class="chip" type="button" role="radio" aria-checked="${st.dirs[kind] === v}" data-act="dir" data-k="${kind}" data-v="${v}">${l}</button>`).join('')}</div></div>`).join('')}</div>` : '');

  /** Pick a part for an empty slot: the level's parts, each with what it does. */
  function openSlot(at) {
    const fresh = stage().fresh || [];
    const models = stage().palette.filter(k => MERGES.includes(k));
    const rows = shelf(stage().palette).map(kind => {
      const d = def(kind), one = MERGES.includes(kind) && models.length > 1 ? mergerEntry(models) : null;
      const isNew = one ? models.some(k => fresh.includes(k)) : fresh.includes(kind);
      return `<button class="pal" type="button" data-act="put" data-k="${kind}"><span class="pal-ic">${lookSVG(one ? one.look : kind)}</span><span class="pal-tx"><b>${one ? one.label : d.name}${isNew ? `<em>${tr('新', 'new')}</em>` : ''}</b><small>${one ? one.desc : d.desc}</small></span></button>`;
    }).join('');
    rt.openSheet(`<div><div class="kicker sig">${tr('元件', 'Components')}</div><h3 class="sh" id="sheetTitle">${tr(`放进第 ${at + 1} 格`, `Put in slot ${at + 1}`)}</h3></div>
      <div class="list">${rows}</div>
      <div class="acts"><button class="btn sec" type="button" data-close>${tr('取消', 'Cancel')}</button></div>`, {
      put: el => { setCirc(placeNode(circ(), el.dataset.k, at)); buzz(8); rt.closeSheet(); rt.refresh(); },
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
    save: () => ({ stage: st.stage, circs: st.circs, dirs: st.dirs, scan: st.scan, filter: st.filter, mem: st.mem }),
    tests: () => tests().map((t, k) => ({ label: `${tr('测试', 'Test')} ${k + 1} · ${label(t)}`, status: st.status[k] })),
    selectTest(k) { st.ti = k; st.view = null; st.typed = {}; st.robot = null; st.sel = null; rt.refresh(); },
    scene() {
      const t = tests()[st.ti], v = st.view;
      return { ...V().scene(t, v, { ...opt(), ...(v && v.end && v.pass && L.trace ? L.trace(t) : {}), bench: v ? null : sandbox() }), look: robot.look };
    },
    boardOpt: () => L.boardOpt || { minScale: 0.7, maxScale: 1.25 },
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
      const g = L.guide ? L.guide(c, litOf(c)) : null;
      if (g) return { text: g };
      const s = stage(), text = [stages.length > 1 && s.ask ? `<b>${tr(`阶段 ${st.stage + 1}/${stages.length}`, `Stage ${st.stage + 1}/${stages.length}: `)}</b>${s.ask}` : '', s.tip || ''].filter(Boolean).join(' ');
      return text ? { text } : null;
    },
    panelStage: true,
    sideView: true,
    /** The board, played on the shared circuit editor: the graph it shows, how a change comes back, new parts, sheets. */
    board: {
      graph: () => toGraph(circ(), terms()),
      parts: () => partsFor(circ(), terms()),
      probe: () => win().probe,
      change(next, { keep } = {}) {
        if (busy()) return;
        const c = fromGraph(next, circ());
        // A card moved only changes where it sits: kept, but the tests need not run again.
        if (keep) { st.circs[st.stage] = c; rt.persist(); } else setCirc(c);
        rt.refresh();
      },
      create,
      reset() { setCirc(blank()); rt.refresh(); },
      palette: () => {
        const all = stage().palette, fresh = stage().fresh || [], models = all.filter(k => MERGES.includes(k));
        return shelf(all).map(kind => {
          const d = def(kind);
          const item = { type: kind, name: d.name, label: d.tag && kind !== 'const' && !d.bp ? lazy(() => `${d.name} · ${d.tag}`) : d.name, desc: d.desc, icon: lookIcon(kind), tag: kind === 'const' ? tr('一个数', 'a number') : d.tag, fresh: fresh.includes(kind) };
          if (!MERGES.includes(kind) || models.length < 2) return item;
          const m = mergerEntry(models);
          return { ...item, ...m, name: m.label, fresh: models.some(k => fresh.includes(k)) };
        });
      },
      consts: () => stage().consts || [0, 1, 2, 3, 4, 5],
      /** The models a merger can swap to in place (its wires stay). */
      swaps: kind => (MERGES.includes(kind) ? MERGES.filter(k => k === kind || stage().palette.includes(k)) : []),
      setValue(id, v) { if (busy()) return; setCirc({ ...circ(), nodes: circ().nodes.map(x => (x.id === id ? { ...x, value: v } : x)) }); buzz(6); rt.refresh(); },
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
    panel() {
      const s = stage(), flash = st.flashAt && Date.now() - st.flashAt < 1800;
      const dial = s.dial ? `<div class="pcard dial${flash ? ' flash' : ''}"><h3>${tr('扫描顺序', 'Scan order')}</h3>
        <div class="dialopts" role="radiogroup" aria-label="${tr('扫描顺序', 'Scan order')}">${s.dial.map(id => { const d = V().dial[id]; return `<button class="dialopt" type="button" role="radio" aria-checked="${st.scan[st.stage] === id}" data-act="scan" data-v="${id}">${orderFig(d.fig)}<span>${d.l}</span></button>`; }).join('')}</div></div>` : '';
      const mem = s.memory ? memoryCard(s, st.mem[st.stage], tests()[st.ti]) : '';
      return `${mem}${dial}`;
    },
    /** Under the board: the rewrite-direction switches. */
    panelAfter: () => dirsCard(),
    /** The robot's window, beside the board on a desktop and above it on a phone. */
    mounted() {
      const view = $('#cview');
      if (view) view.innerHTML = viewHTML(circ(), ui());
    },
    dock: () => (st.sel ? { pad: true } : { meta: `${stages.length > 1 ? tr(`阶段 ${st.stage + 1}/${stages.length} · `, `Stage ${st.stage + 1}/${stages.length} · `) : ''}${tr(`${tests().length} 个测试 · ${circ().nodes.length} 个元件`, `${tests().length} tests · ${circ().nodes.length} component${circ().nodes.length === 1 ? '' : 's'}`)}`, sec: circ().nodes.length && !busy() ? (st.armed ? tr('确认清空', 'Confirm clear') : tr('清空', 'Clear')) : '', secAct: 'clear', go: busy() ? tr('跳过动画', 'Skip animation') : tr('运行测试', 'Run tests'), act: 'run', busy: busy() }),
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
      if (busy()) return;
      if (name === 'lit') { setCirc(toggleLit(circ(), el.dataset.t)); buzz(6); rt.refresh(); }
      if (name === 'sandbox') { st.view = null; rt.refresh(); }
      if (name === 'scan') { st.scan[st.stage] = el.dataset.v; changed(); buzz(6); rt.refresh(); }
      if (name === 'mem') { const m = st.mem[st.stage], v = el.dataset.v; st.mem[st.stage] = m.includes(v) ? m.filter(x => x !== v) : [...m, v]; st.robot = null; st.typed = {}; changed(); buzz(6); rt.refresh(); }
      if (name === 'filter') { st.filter[st.stage] = el.dataset.v; changed(); buzz(6); rt.refresh(); }
      if (name === 'dir') { st.dirs[el.dataset.k] = el.dataset.v; changed(); buzz(6); rt.refresh(); }
      if (name === 'clear') {
        if (!st.armed) { st.armed = true; rt.refresh(); setTimeout(() => { if (st.armed) { st.armed = false; rt.refresh(); } }, 2600); return; }
        setCirc(blank());
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
    async run() {
      const c = circ(), Vw = V(), o = opt(), s = stage();
      const miss = Vw.outs.find(([id]) => !c.wires.some(w => w.to === `out:${id}`));
      if (miss) { toast(tr(`输出口「${miss[1]}」还没接线`, `The output “${miss[1]}” is not wired yet`)); buzz(20); return; }
      if (s.differ !== undefined && st.scan[s.differ] === st.scan[st.stage]) { toast(tr(`换一种顺序：和阶段 ${s.differ + 1} 用的不一样`, `Pick another order: one different from stage ${s.differ + 1}'s`)); buzz(20); return; }
      st.pick = null;
      st.wire = null;
      st.sel = null;
      st.typed = {};
      st.robot = null;
      rt.startRun();
      st.status = tests().map(() => null);
      for (let k = 0; k < tests().length; k++) {
        const t = tests()[k], res = runCircuit(Vw, t, c, o), want = expected()[k];
        // checkAll levels grade every cell, not just the answer cell.
        const mm = res.error || s.onFail || (!(s.checkAll ?? L.checkAll) && res.value === want) ? null : firstMismatch(t, res);
        const ok = !res.error && res.value === want && !mm;
        const stop = mm && mm.key === undefined ? mm.q + 1 : res.steps.length;
        st.ti = k;
        st.status[k] = 'run';
        st.view = { res, k: 0, pass: ok, end: false, halt: !!(res.error && !res.error.diverge) || (!!mm && mm.key === undefined), focus: null, badKey: mm ? mm.key : undefined };
        rt.refresh();
        // Long runs (many rounds) show several steps per frame, so a run never takes much more than two seconds.
        const per = Math.max(22, Math.min(220, 1700 / stop)), stride = Math.max(1, Math.ceil(stop / 90));
        for (let j = Math.min(stride, stop); ; j = Math.min(j + stride, stop)) {
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
          if (s.dial && res.error && !res.error.diverge) { st.flashAt = Date.now(); rt.refresh(); }
          rt.fail({ ...explain(k, t, res, mm), hint: hintFor() });
          return;
        }
        rt.refresh();
        await Anim.wait(420);
      }
      rt.endRun();
      rt.refresh();
      if (s.minLayers && 2 ** st.mem[st.stage].length > s.minLayers) {
        const m = st.mem[st.stage].length;
        rt.fail({ head: lazy(() => tr('答案对了，可表太大了', 'Right answers, but the table is too big')), body: lazy(() => tr(`每个测试都算对了，可你的状态记了 ${m} 件事，表有 ${2 ** m} 层。其实有的事<b>不记也不会算错</b>：用最少的层再通过一次。`, `Every test came out right, but your state remembers ${m} thing${m === 1 ? '' : 's'}, so the table has ${2 ** m} layers. Some of them <b>can be forgotten without any wrong answers</b>: pass again with as few layers as possible.`)), hint: hintFor() });
        return;
      }
      if (st.stage < stages.length - 1) { stageDone(); return; }
      rt.pass();
    },
  };
  return ctl;
}
