// Circuit levels: a robot walks the table cell by cell and runs the player's board on each cell.
// The player picks what the robot reads on the level's two input cards (视野, 本格信息: each sensor picked is an
// output of its own), wires parts on the shared circuit editor (the one Vision Complete uses, ../../../../circuit,
// through `ctl.board` and ../board.js), and the board writes the robot's cell. Before a run the test board is a
// sandbox: the player types numbers into cells and puts the robot anywhere, and the robot's cell shows the board's
// answer at once. Running clears the board and the robot starts from its usual cell.
// A level may have several stages (course.js): a new world with new inputs (when a run fails on purpose, the stage's
// onFail), or a new question on the same board (when every test passes; `carry` keeps the board). A level may also
// start from the board the player left on an earlier level it requires (the level's `carry`). A level that builds a
// part passes only on a board that reads exactly the part's ports. A run that ends (every test passed, or the one that
// failed) is kept as { stage, test } (the shell's lastRun): the level opens on it again, replayed on the board.

import { $, buzz, toast, paint } from '../util.js';
import { rt, Anim } from '../runtime.js';
import { paceOf } from '../../../../engine/trace.js';
import { WORLDS, windowOf } from '../../model/worlds.js';
import { ROBOTS } from '../../model/robots.js';
import { CARDS, def, hasValue, isCard, isGiven, modelsOf } from '../../model/parts.js';
import { blank, clone, fitted, picksOf, placed, portsProblem, readsOf, removeNode, splitSrc, withPicks } from '../../model/board.js';
import { MAX_ROUNDS, evaluate, runCircuit } from '../../model/run.js';
import { signal } from '../../model/format.js';
import { diagnosisOf, guideAt } from '../../items/conditions.js';
import { trace } from '../../items/traces.js';
import { explain as explainItem, panel } from '../../items/panels.js';
import { fill } from '../../items/labels.js';
import { viewHTML } from '../view.js';
import { toGraph, fromGraph, create, partsFor } from '../board.js';
import { lookIcon, lookSVG } from '../looks.js';
import { tr, lazy } from '../../lang.js';

const MERGES = ['msum', 'mmin', 'mmax'];
/** A level's parts as the player picks them: each family of models (the mergers) is one entry, the first of them,
 *  whose model is then chosen on the card. */
const shelf = palette => palette.filter(k => { const m = modelsOf(k); return !m || k === palette.find(x => m.includes(x)); });
/** The models a part can swap to in place, keeping its wires (a merger's), within the level's palette. */
const swapsOf = (type, palette) => { const m = modelsOf(type); return m ? m.filter(k => k === type || palette.includes(k)) : []; };
/** How that one merger entry reads, when the level has more than one model of it. */
const mergerEntry = models => ({
  label: lazy(() => def(models[0]).name),
  tag: lazy(() => models.map(k => def(k).tag).join(' / ')),
  icon: lookIcon('merger'),
  look: 'merger',
  desc: lazy(() => tr(`把接进来的几个数汇成一个。放上后在元件上选操作：${models.map(k => def(k).tag).join('、')}；换操作时连线不变。`, `Merges the numbers wired into it into one. Pick its operation on the part once placed: ${models.map(k => def(k).tag).join(', ')}; the wires stay when you swap.`)),
});

export function circuitMode(L, saved, { flags, game, progress, lastRun } = {}) {
  const stages = L.stages;
  // A level that grows the board of an earlier one (`carry`: that level's id) starts from the player's last board there.
  const carried = L.carry && progress?.data[L.carry]?.boards;
  const startOf = k => (k === 0 && carried ? clone(carried.at(-1)) : blank());
  const st = {
    stage: saved?.stage ?? 0,
    boards: stages.map((s, k) => fitted(saved?.boards?.[k] ?? startOf(k), s.given)),
    ti: 0, status: [], view: null,
    typed: {}, robot: null, sel: null, input: '',
  };
  const robot = ROBOTS[L.robot];
  // A part is in the palette once the level that builds it is solved, and stays in every level after it; what the
  // level's puzzle does not need is folded away (../../../../course.js offer). A bench has no flags, and folds nothing.
  const allowed = flags ? game.table.usableIn(L, flags) : null;
  const offer = flags ? game.table.offerIn(L, flags) : null, shownSet = offer && new Set(offer.shown);
  const stage = () => stages[st.stage], V = () => WORLDS[stage().world], board = () => st.boards[st.stage];
  /** The parts this player can use on this stage (its palette holds the carried ones too), in its order. */
  const offeredParts = () => stage().palette.filter(k => !allowed || allowed.has(k));
  /** Of those, the ones the stage shows, and the folded rest. */
  const shownParts = () => offeredParts().filter(k => !shownSet || shownSet.has(k));
  const foldedParts = () => (shownSet ? offeredParts().filter(k => !shownSet.has(k)) : []);
  const tests = () => stage().tests, expected = () => stage().expected;
  const opt = () => ({ ...stage(), boardWidth: rt.boardWidth || 0 });
  const label = t => (L.testLabel ? fill(L.testLabel, t) : V().label(t));
  const busy = () => rt.cur.running;
  const changed = () => { st.status = tests().map(() => null); st.view = null; rt.persist(); rt.keepRun(null); };
  st.status = tests().map(() => null);
  const setBoard = b => { st.boards[st.stage] = b; changed(); };
  const shownStep = () => { const v = st.view; if (!v || !v.k) return null; return v.res.steps[v.focus ?? v.k - 1]; };
  /** The sensors a card may read on this stage, in the order it offers them. */
  const offered = card => stage().given.offers[card];
  /** Every sensor the robot can read here: the cells it sees, its arm, and the level's facts about its own cell. */
  const avail = () => [...offered('view'), ...offered('facts')];
  /** The port inputs of the part this stage builds, by id, for the editor's labels. */
  const portsById = () => Object.fromEntries((stage().ports ?? []).filter(p => p.input).map(p => [p.input, { label: p.label, short: p.short }]));
  const fresh = () => fitted(blank(), stage().given);

  /** Palette entries for some parts: a merger's models as one entry (when there are several), each with what it does. */
  const itemsOf = all => {
    const models = all.filter(k => MERGES.includes(k));
    return shelf(all).map(type => {
      const d = def(type);
      // A part that shares its name with a family shown as one entry (「任一是」 beside the mergers) says its model.
      const twin = !modelsOf(type) && all.some(k => k !== type && modelsOf(k) && String(def(k).name) === String(d.name));
      const item = { type, name: twin ? lazy(() => `${d.name} · ${d.tag}`) : d.name, label: d.tag && type !== 'const' && !d.built ? lazy(() => `${d.name} · ${d.tag}`) : d.name, desc: d.desc, icon: lookIcon(type), tag: type === 'const' ? tr('一个数', 'a number') : d.tag };
      return MERGES.includes(type) && models.length > 1 ? { ...item, ...mergerEntry(models), name: mergerEntry(models).label } : item;
    });
  };
  /** 视野's box: a blank square for each cell the robot sees, the view sensor there; lit when the card reads it. */
  const gridOf = node => {
    const v = robot.vision, Vw = V(), picks = picksOf(node), can = offered('view'), cells = [];
    for (let dr = -v; dr <= v; dr++) for (let dc = -v; dc <= v; dc++) {
      // The robot's own cell is the one being worked out: it cannot be read.
      const key = Vw.sensorAt[`${dr},${dc}`] || null, ok = !!key && can.includes(key) && (dr || dc);
      cells.push({ dr, dc, key, ok, on: ok && picks.includes(key), self: !dr && !dc });
    }
    return { n: 2 * v + 1, cells };
  };
  /** A card reads one more sensor, or one fewer: each is an output of its own, in the order the card offers them, and
   *  the wires from a sensor taken off come off with it. */
  const togglePick = (id, pick) => {
    const b = board(), n = b.nodes.find(x => x.id === id);
    if (!n) return;
    const picks = picksOf(n), order = offered(id);
    const next = picks.includes(pick) ? picks.filter(p => p !== pick) : [...picks, pick].sort((a, c) => order.indexOf(a) - order.indexOf(c));
    setBoard({ ...b, nodes: b.nodes.map(x => (x.id === id ? withPicks(x, next) : x)), wires: b.wires.filter(w => { const [f, p] = splitSrc(w.from); return f !== id || next.includes(p); }) });
  };
  /** A sensor picked anywhere (the view, the inputs window, a card): its card gains or loses that output. */
  const pickSensor = id => { const card = ['view', 'facts'].find(c => offered(c).includes(id)); if (card) togglePick(card, id); };
  /** What 视野's arm reaches, as picks on its card: [{ key, label, on, v }]. */
  const armOf = node => { const h = here(), picks = picksOf(node); return offered('view').filter(id => V().sensors[id].family === 'arm').map(id => ({ key: id, label: V().sensors[id].label, on: picks.includes(id), v: signal(readPick(id, h)) })); };

  /** Sandbox: typed numbers on the board, the robot where the player put it, and its answer computed live. */
  function sandbox() {
    const t = tests()[st.ti], Vw = V(), o = opt(), cell = st.robot || Vw.sample(t, o), keys = Vw.keys(t, cell);
    const shown = new Map(Vw.base ? Vw.base(t, o) : []), reads = new Set(), empty = new Set(), probe = {};
    Object.entries(st.typed).forEach(([k, v]) => shown.set(k, v));
    const get = key => { reads.add(key); if (shown.has(key)) return shown.get(key); empty.add(key); return null; };
    const { out } = evaluate(board(), (id, layer) => Vw.read(t, cell, id, get, o, layer), Vw.outs.map(x => x[0]), probe);
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
  /** What a sensor reads there, wired or not. */
  function readPick(pick, h = here()) {
    const { t, Vw, o, cell, shown } = h;
    return Vw.read(t, cell, pick, key => (shown.has(key) ? shown.get(key) : null), o, 'self');
  }
  /** The robot's window: live during a run or an inspection, otherwise around the robot on the sandbox. */
  function win() {
    const { t, Vw, o, s, box, cell, shown } = here();
    const reads = s ? new Set(s.reads) : box.reads, isEmpty = key => (s ? s.empty === key : box.empty.has(key));
    // A swept cell shows what the table holds there, or (v) a value of its own, such as the cost of a piece.
    const mark = x => ({ ...x, value: x.v !== undefined ? signal(x.v) : x.key !== null && shown.has(x.key) ? signal(shown.get(x.key)) : '', state: isEmpty(x.key) ? 'empty' : reads.has(x.key) ? 'read' : '' });
    const w = windowOf(Vw, t, cell, robot.vision, o);
    w.wins = w.wins.map(x => ({ ...x, cells: x.cells.map(mark) }));
    if (w.arm && w.arm.cells) w.arm.cells = w.arm.cells.map(mark);
    if (w.arm && w.arm.sweeps) w.arm.sweeps = w.arm.sweeps.map(x => ({ ...x, cells: x.cells.map(mark) }));
    if (w.arm && (stage().noArm || !robot.arm)) w.arm = null;
    if (w.arm) w.arm.filter = o.filter;
    w.facts = stage().facts.map(id => ({ id, value: signal(Vw.read(t, cell, id, key => shown.get(key) ?? null, o)) }));
    w.robot = robot;
    w.probe = box ? box.probe : s.probe;
    // A run that stopped on a cell not computed yet (`halted`) never computed what came after it.
    w.halted = !!(s && s.empty !== undefined);
    return w;
  }
  const ui = () => ({ sensors: V().sensors, avail: avail(), lit: readsOf(board()), outs: V().outs, win: win(), pickable: true });
  /** The world's inputs and outputs as the shared editor sees them (../board.js). */
  const terms = () => ({ sensors: V().sensors, outs: V().outs, ports: portsById() });
  /** The hint for this failure, worded again in the current language whenever the fail sheet is redrawn. */
  const hintFor = () => {
    const s = stage(), b = board(), fails = rt.cur.fails;
    const pick = () => diagnosisOf(L.diagnose, b, { stage: st.stage }) || (s.hints ? s.hints[Math.min(Math.max(fails - 1, 0), s.hints.length - 1)] : null);
    return pick() ? lazy(pick) : null;
  };

  // move: on a phone, starts moving the part to another slot (the slot board's startMove).
  function openNode(id, { move } = {}) {
    const n = board().nodes.find(x => x.id === id), d = isCard(n.type) ? CARDS[n.type] : def(n.type);
    const vals = hasValue(n.type) ? `<div class="chips" role="radiogroup" aria-label="${tr('数值', 'Value')}">${(L.consts || [0, 1, 2, 3, 4, 5]).map(v => `<button class="chip" type="button" role="radio" aria-checked="${n.params?.value === v}" data-act="val" data-v="${v}">${v}</button>`).join('')}</div>` : '';
    // 视野 is set by a square of its box (and the arm), 本格信息 by the facts it reads.
    const g = n.type === 'view' ? gridOf(n) : null;
    const box = g ? `<div class="optlabel">${tr('读哪几格（每一格一个输出口）', 'Which cells (an output for each)')}</div><div class="rgrid" style="--rn:${g.n}">${g.cells.map(x => rcellHTML(x, 'pos')).join('')}</div>` : '';
    const picks = picksOf(n), opts = n.type === 'facts' ? offered('facts').map(f => [f, V().sensors[f].label]) : n.type === 'view' ? armOf(n).map(a => [a.key, a.label]) : [];
    const pick = opts.length ? `<div class="optlabel">${n.type === 'facts' ? tr('读哪几条（每一条一个输出口）', 'Which facts (an output for each)') : tr('手臂够到的（每一个一个输出口）', 'What the arm reaches (an output for each)')}</div><div class="chips">${opts.map(([v, l]) => `<button class="chip" type="button" aria-pressed="${picks.includes(v)}" data-act="pick" data-v="${v}">${l}</button>`).join('')}</div>` : '';
    const fixed = isGiven(n.type);
    // A merger can change its model in place: the wires stay, only the way it merges changes.
    const swaps = swapsOf(n.type, offeredParts());
    const swap = swaps.length > 1 ? `<div class="optlabel">${tr('操作（换操作时连线不变）', 'Operation (the wires stay when you swap)')}</div><div class="chips" role="radiogroup" aria-label="${tr('操作', 'Operation')}">${swaps.map(k => `<button class="chip" type="button" role="radio" aria-checked="${k === n.type}" data-act="swap" data-k="${k}">${def(k).tag}</button>`).join('')}</div>` : '';
    rt.openSheet(`<div><div class="kicker sig">${d.built ? tr('零件', 'Part') : tr('元件', 'Component')}</div><h3 class="sh" id="sheetTitle">${d.name}</h3></div>
      <div class="prose"><p>${d.desc}</p></div>${box}${pick}${vals}${swap}
      <div class="acts">${fixed || !move ? '' : `<button class="btn sec" type="button" data-act="move">${tr('移动', 'Move')}</button>`}${fixed ? '' : `<button class="btn sec" type="button" data-act="del">${tr('删除', 'Delete')}</button>`}<button class="btn pri" type="button" data-close data-primary>${tr('好', 'OK')}</button></div>`, {
      val: el => { setValue(id, +el.dataset.v); rt.closeSheet(); rt.refresh(); },
      pick: el => { togglePick(id, el.dataset.v); buzz(6); rt.refresh(); openNode(id, { move }); },
      pos: el => { const [dr, dc] = el.dataset.d.split(',').map(Number); setPos(id, dr, dc); buzz(6); rt.refresh(); openNode(id, { move }); },
      swap: el => { swap(id, el.dataset.k); rt.closeSheet(); rt.refresh(); },
      del: () => { setBoard(removeNode(board(), id)); rt.closeSheet(); rt.refresh(); },
      move: () => { rt.closeSheet(); move(); },
    }, () => openNode(id, { move }));
  }

  /** A square of 视野's box: lit when the card reads it. */
  const rcellHTML = (x, act) => `<button class="rcell${x.on ? ' on' : ''}${x.self ? ' self' : ''}" type="button" data-act="${act}" data-d="${x.dr},${x.dc}"${x.ok ? '' : ' disabled'} aria-pressed="${x.on}" aria-label="${x.dr},${x.dc}"></button>`;
  /** 视野 reads the square (dr, dc) of its box, or stops reading it. */
  const setPos = (id, dr, dc) => { const pick = V().sensorAt[`${dr},${dc}`]; if (pick) togglePick(id, pick); };
  /** A part's number. */
  const setValue = (id, v) => setBoard({ ...board(), nodes: board().nodes.map(x => (x.id === id ? { ...x, params: { ...x.params, value: v } } : x)) });
  /** A merger swapped to another model, its wires kept. */
  const swap = (id, type) => { setBoard({ ...board(), nodes: board().nodes.map(x => (x.id === id ? { ...x, type } : x)) }); buzz(8); };

  /** Pick a part for an empty slot: the level's parts, each with what it does. */
  // place(type): the slot board's place, which puts it in and says so.
  function openSlot(at, { place }) {
    const rows = itemsOf(shownParts()).map(item => `<button class="pal" type="button" data-act="put" data-k="${item.type}"><span class="pal-ic">${lookSVG(item.look ?? item.type)}</span><span class="pal-tx"><b>${item.name}</b><small>${item.desc}</small></span></button>`).join('');
    rt.openSheet(`<div><div class="kicker sig">${tr('元件', 'Components')}</div><h3 class="sh" id="sheetTitle">${tr('放在这一格', 'Place in this slot')}</h3></div>
      <div class="list">${rows}</div>
      <div class="acts"><button class="btn sec" type="button" data-close>${tr('取消', 'Cancel')}</button></div>`, {
      put: el => { rt.closeSheet(); place(el.dataset.k); },
    }, () => openSlot(at, { place }));
  }

  /** First step whose outputs differ from the reference board's; scanning in rounds, the first cell that settled wrong. */
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
    const why = () => (L.explain ? explainItem(L.explain, t, res, o) : '');
    return {
      head: failed,
      body: lazy(() => tr(`${label(t)}：答案应该是 <b>${signal(expected()[k])}</b>，机器算出了 <b>${signal(res.value)}</b>。${why()}`, `${label(t)}: the answer should be <b>${signal(expected()[k])}</b>, but the machine computed <b>${signal(res.value)}</b>. ${why()}`)),
    };
  }

  /** On to the next stage: a stage that goes on with this board (`carry`) gets it, minus what it does not give. */
  function advance() {
    const prev = board();
    st.stage++;
    if (stage().carry && !placed(board()).length) st.boards[st.stage] = fitted(clone(prev), stage().given);
    st.ti = 0;
    changed();
    if (stage().unlockToast) toast(stage().unlockToast);
  }
  /** Every test of a stage passed and another stage follows: say what it showed, then move on (keeping the board). */
  function stageDone() {
    const s = stage(), n = stages.length, d = s.done || {};
    buzz([15, 40, 15]);
    rt.openSheet(`<div><div class="kicker good">${tr(`阶段 ${st.stage + 1}/${n} · 完成`, `Stage ${st.stage + 1}/${n} · done`)}</div><h3 class="sh" id="sheetTitle">${d.head || tr('这一阶段通过了', 'This stage is cleared')}</h3></div>
      <div class="prose">${(d.body || []).map(p => `<p>${p}</p>`).join('')}</div>
      <div class="acts"><button class="btn pri" type="button" data-act="next" data-primary>${tr(`进入阶段 ${st.stage + 2}`, `On to stage ${st.stage + 2}`)}</button></div>`, {
      next: () => { advance(); rt.closeSheet(); rt.refresh(); },
    });
  }
  /** A stage whose failure is its lesson (its onFail): what went wrong, why no board could do better, and on. */
  function lesson(k, res) {
    const s = stage(), at = { test: k + 1, want: signal(expected()[k]), got: signal(res.value) };
    return {
      head: s.onFail.head,
      body: lazy(() => String(s.onFail.body).replace(/\{(test|want|got)\}/g, (_, f) => at[f])),
      extra: lazy(() => panel(s.onFail.show, tests()[0])),
      cta: { label: s.onFail.next, fn: () => advance() },
      hint: null,
    };
  }

  /** Test k run on the board: its result, the first step gone wrong (or cell settled wrong), and the view of its end. */
  function judge(k) {
    const t = tests()[k], s = stage(), res = runCircuit(V(), t, board(), opt()), want = expected()[k];
    // A level that grades every cell (checkAll) compares the whole table, not just the answer.
    const mm = res.error || s.onFail || (!s.checkAll && res.value === want) ? null : firstMismatch(t, res);
    const ok = !res.error && res.value === want && !mm;
    const stop = mm && mm.key === undefined ? mm.q + 1 : res.steps.length;
    return { t, res, mm, ok, stop, view: { res, k: 0, pass: ok, end: false, halt: !!(res.error && !res.error.diverge) || (!!mm && mm.key === undefined), focus: null, badKey: mm ? mm.key : undefined } };
  }
  // The run kept from the last visit, replayed on the board as it ended: every test up to the one it stopped on.
  if (lastRun && lastRun.stage === st.stage && lastRun.test < tests().length) {
    for (let k = 0; k <= lastRun.test; k++) {
      const { ok, stop, view } = judge(k);
      st.status[k] = ok ? 'pass' : 'fail';
      if (k === lastRun.test) { st.ti = k; st.view = { ...view, k: stop, end: true }; }
    }
  }

  const ctl = {
    st,
    save: () => ({ stage: st.stage, boards: st.boards }),
    tests: () => tests().map((t, k) => ({ label: `${tr('测试', 'Test')} ${k + 1} · ${label(t)}`, status: st.status[k] })),
    selectTest(k) { st.ti = k; st.view = null; st.typed = {}; st.robot = null; st.sel = null; rt.refresh(); },
    scene() {
      const t = tests()[st.ti], v = st.view;
      return { ...V().scene(t, v, { ...opt(), ...(v && v.end && v.pass && L.trace ? trace(L.trace, t) : {}), bench: v ? null : sandbox() }), look: robot.look };
    },
    boardOpt: () => L.boardOpt || { minScale: 0.7, maxScale: 1.25 },
    /** The hints behind the brief's 提示 button: this stage's, in order. */
    hints: () => stage().hints || null,
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
    after: () => `${st.view && st.view.end && !busy() ? `<button class="sec-btn backbench" type="button" data-act="sandbox">${tr('回到棋盘测试', 'Back to the test board')}</button>` : ''}${L.after ? panel(L.after, tests()[st.ti], st.view, st) : ''}`,
    tip() {
      const g = guideAt(L.guide, board(), { stage: st.stage });
      if (g) return { text: g };
      const s = stage(), text = [stages.length > 1 && s.ask ? `<b>${tr(`阶段 ${st.stage + 1}/${stages.length}`, `Stage ${st.stage + 1}/${stages.length}: `)}</b>${s.ask}` : '', s.tip || ''].filter(Boolean).join(' ');
      return text ? { text } : null;
    },
    panelStage: true,
    sideView: true,
    /** The board, played on the shared circuit editor: the graph it shows, how a change comes back, new parts, sheets. */
    board: {
      graph: () => toGraph(board()),
      // Each stage's board has its own undo history.
      stage: () => st.stage,
      parts: () => partsFor(board(), terms()),
      probe: () => win().probe,
      /** Whether the run stopped on a cell not computed yet, before computing the rest. */
      reading: () => ({ halted: win().halted }),
      change(next, { keep } = {}) {
        if (busy()) return;
        const b = fitted(fromGraph(next), stage().given);
        // A card moved only changes where it sits: kept, but the tests need not run again.
        if (keep) { st.boards[st.stage] = b; rt.persist(); } else setBoard(b);
        rt.refresh();
      },
      create,
      reset() { setBoard(fresh()); rt.refresh(); },
      /** Whether clearing would take anything away: a part, a wire, or something a card reads. */
      clearable: () => board().wires.length > 0 || placed(board()).length > 0 || readsOf(board()).length > 0,
      palette: () => itemsOf(shownParts()),
      /** Every part the player may place on this stage, shown or folded (a board read from text may use any). */
      types: () => offeredParts(),
      folded: () => itemsOf(foldedParts()),
      consts: () => L.consts || [0, 1, 2, 3, 4, 5],
      /** The models a merger can swap to in place (its wires stay). */
      swaps: type => swapsOf(type, offeredParts()),
      setValue(id, v) { if (busy()) return; setValue(id, v); buzz(6); rt.refresh(); },
      /** Repaint what the robot reads (into the phone's input cards, once React has drawn them). */
      paintView: () => ctl.mounted(),
      /** What one of a card's outputs carries now, wired or not. */
      outValue: (node, pick) => signal(readPick(pick)),
      swap(id, type) { if (busy()) return; swap(id, type); rt.refresh(); },
      openNode: (id, extra) => { if (!busy() && board().nodes.some(n => n.id === id && (isCard(n.type) || !isGiven(n.type)))) openNode(id, extra); },
      openSlot: (at, extra) => { if (!busy()) openSlot(at, extra); },
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
    // are not shown as controls: the player picks what the robot reads and builds the board, nothing else.
    panel: () => '',
    /** What the robot reads (its view, its arm, its cell's facts), on each input card ([data-cardview]) and, where a
     *  level has one, in the window beside the board (#cview); clicking one adds or removes its output on the card. */
    mounted() {
      const view = $('#cview');
      if (view) paint(view, viewHTML(ui()));
      for (const el of document.querySelectorAll('[data-cardview]')) paint(el, viewHTML(ui(), el.dataset.cardview));
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
      return { meta, ctrl: [{ act: 'step', icon: 'step', label: tr('单步', 'Step') }], go: tr('运行测试', 'Run tests'), act: 'run' };
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
      // A sensor clicked in the inputs window: its output on its card comes or goes.
      if (name === 'pick') { pickSensor(el.dataset.v); buzz(6); rt.refresh(); }
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
      const b = board(), Vw = V(), s = stage();
      const miss = Vw.outs.find(([id]) => !b.wires.some(w => w.to === id));
      if (miss) { toast(tr(`输出口「${miss[1]}」还没接线`, `The output “${miss[1]}” is not wired yet`)); buzz(20); return; }
      st.sel = null;
      st.typed = {};
      st.robot = null;
      rt.startRun({ paused: step });
      st.status = tests().map(() => null);
      for (let k = 0; k < tests().length; k++) {
        const { t, res, mm, ok, stop, view } = judge(k);
        st.ti = k;
        st.status[k] = 'run';
        st.view = view;
        rt.refresh();
        // The kit's pace (several steps a frame on a long run); a paused run goes one step at a time.
        const { per, stride } = paceOf(k, stop);
        const by = () => (Anim.paused ? 1 : stride);
        for (let j = Math.min(by(), stop); ; j = Math.min(j + by(), stop)) {
          st.view.k = j;
          rt.renderBoard();
          ctl.mounted();
          rt.repaint();
          await Anim.wait(per);
          if (j === stop) break;
        }
        st.view.end = true;
        st.status[k] = ok ? 'pass' : 'fail';
        if (!ok) {
          rt.keepRun({ stage: st.stage, test: k });
          rt.endRun();
          rt.refresh();
          rt.fail(s.onFail ? lesson(k, res) : { ...explain(k, t, res, mm), hint: hintFor() });
          return;
        }
        rt.refresh();
        await Anim.wait(per);
      }
      rt.keepRun({ stage: st.stage, test: tests().length - 1 });
      rt.endRun();
      rt.refresh();
      if (st.stage < stages.length - 1) { stageDone(); return; }
      // A board that becomes a part must read exactly the part's ports, or the part would not do what the board did.
      const why = s.ports?.length ? portsProblem(b, s.ports) : null;
      if (why) { rt.fail({ head: lazy(() => tr('还不能做成元件', 'Not a part yet')), body: why, hint: null }); return; }
      rt.pass();
    },
  };
  return ctl;
}
