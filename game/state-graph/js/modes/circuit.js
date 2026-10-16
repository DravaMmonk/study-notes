// Circuit levels: a robot walks the table cell by cell and runs the player's circuit board on each cell.
// The player lights cells in the robot's window as inputs, wires components, and the board writes the robot's cell.
// Before a run the test board is a sandbox: the player types numbers into cells and puts the robot anywhere, and the
// robot's cell shows the circuit's answer at once. Running clears the board and the robot starts from its usual cell.
// A level may have several stages: a new world with new inputs (when a run fails on purpose), or a new question on
// the same board (when every test passes; `carry` keeps the circuit). A stage may give the player a scan-order dial,
// a filter for the sweeping arm, or scan in rounds until the table settles.

import { $, $$, buzz, toast, signal, ICON, wide } from '../util.js';
import { rt, Anim } from '../runtime.js';
import { WORLDS, runCircuit, readTap, windowOf, visibleTaps, MAX_ROUNDS } from '../circuit/worlds.js';
import { ROBOTS } from '../circuit/robots.js';
import { def, blank, evaluate, clone } from '../circuit/components.js';
import { editorHTML, viewHTML, drawWires, paintProbe, connect, unwire, removeNode, placeNode, moveNode, placement, toggleLit, litOf, isSink } from '../circuit/editor.js';
import { PARTS } from '../levels/parts.js';
import { tr, lazy } from '../i18n.js';
import { KEY_COLORS } from '../circuit/worlds/maze.js';

const MERGES = ['msum', 'mmin', 'mmax'];

/** What the state remembers: one switch per key color; the table has a layer for every set of remembered keys. */
function memoryCard(s, mem, t) {
  const n = 2 ** mem.length;
  return `<div class="pcard memo"><h3>${tr('状态记住什么', 'What the state remembers')}<small>${tr(`${n} 层 · 每层 ${t.R * t.C} 格 · 一共 ${n * t.R * t.C} 格`, `${n} layer${n === 1 ? '' : 's'} · ${t.R * t.C} cells each · ${n * t.R * t.C} cells in all`)}</small></h3>
    <div class="chips">${s.memory.map(c => `<button class="chip memk k-${c}" type="button" role="switch" aria-checked="${mem.includes(c)}" data-act="mem" data-v="${c}"><span class="box"></span>${tr(`记住${KEY_COLORS[c].n}钥匙`, `Remember the ${KEY_COLORS[c].n} key`)}</button>`).join('')}</div>
    <p>${tr('每多记一把钥匙，表就多一倍的层：每一层是「手里正好有这几把钥匙」的路线。', 'Every extra key remembered doubles the layers of the table: each layer holds the routes “carrying exactly these keys”.')}</p></div>`;
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
    pick: null, armed: false, ti: 0, status: [], view: null,
    typed: {}, robot: null, sel: null, input: '', wire: null,
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
  const ui = () => ({ taps: V().taps, avail: avail(), lit: litOf(circ()), outs: V().outs, pick: st.pick, wire: st.wire, palette: stage().palette, win: win(), sideView: wide() });
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
    const swaps = MERGES.includes(n.kind) ? MERGES.filter(k => k !== n.kind && stage().palette.includes(k)) : [];
    const swap = swaps.length ? `<div class="optlabel">${tr('换个型号（连线不变）', 'Swap the model (wires stay put)')}</div><div class="chips">${swaps.map(k => `<button class="chip" type="button" data-act="swap" data-k="${k}">${def(k).tag}</button>`).join('')}</div>` : '';
    rt.openSheet(`<div><div class="kicker sig">${d.bp ? tr('零件', 'Part') : tr('元件', 'Component')}</div><h3 class="sh" id="sheetTitle">${d.name}${d.tag && n.kind !== 'const' ? ` · ${d.tag}` : ''}</h3></div>
      <div class="prose"><p>${d.desc}</p></div>${vals}${swap}
      <div class="acts"><button class="btn sec" type="button" data-act="del">${tr('拿掉这个元件', 'Remove this component')}</button><button class="btn pri" type="button" data-close data-primary>${tr('好', 'OK')}</button></div>`, {
      val: el => { setCirc({ ...circ(), nodes: circ().nodes.map(x => (x.id === id ? { ...x, value: +el.dataset.v } : x)) }); rt.closeSheet(); rt.refresh(); },
      swap: el => { setCirc({ ...circ(), nodes: circ().nodes.map(x => (x.id === id ? { ...x, kind: el.dataset.k } : x)) }); buzz(8); rt.closeSheet(); rt.refresh(); },
      del: () => { setCirc(removeNode(circ(), id)); rt.closeSheet(); rt.refresh(); },
    }, () => openNode(id));
  }

  function connectPorts(a, b) {
    const r = connect(circ(), io(), a, b);
    if (r.msg) { toast(r.msg); buzz(20); return false; }
    if (r.circ) { setCirc(r.circ); buzz(8); }
    return !!r.circ;
  }

  /** Pick a part for an empty slot: the level's parts, each with what it does. */
  function openSlot(at) {
    const fresh = stage().fresh || [];
    const rows = stage().palette.map(kind => {
      const d = def(kind);
      return `<button class="pal" type="button" data-act="put" data-k="${kind}"><span class="pal-ic${d.bp ? ' bp' : ''}">${d.bp ? ICON.part : d.icon}</span><span class="pal-tx"><b>${d.name}${d.tag && kind !== 'const' ? ` · ${d.tag}` : ''}${fresh.includes(kind) ? `<em>${tr('新', 'new')}</em>` : ''}</b><small>${d.desc}</small></span></button>`;
    }).join('');
    rt.openSheet(`<div><div class="kicker sig">${tr('元件', 'Components')}</div><h3 class="sh" id="sheetTitle">${tr(`放进第 ${at + 1} 格`, `Put in slot ${at + 1}`)}</h3></div>
      <div class="list">${rows}</div>
      <div class="acts"><button class="btn sec" type="button" data-close>${tr('取消', 'Cancel')}</button></div>`, {
      put: el => { setCirc(placeNode(circ(), el.dataset.k, at)); buzz(8); rt.closeSheet(); rt.refresh(); },
    }, () => openSlot(at));
  }

  /** The port a wire dropped on a component card lands in: its first free input that accepts the wire, else the first that does. */
  function cardPort(from, id) {
    const ok = def(circ().nodes.find(n => n.id === id).kind).ins.map((_, k) => `${id}:${k}`).filter(p => connect(circ(), io(), from, p).circ);
    return ok.find(p => !circ().wires.some(w => w.to === p)) || ok[0] || null;
  }

  /** Drag handlers: move or remove components, drop new ones from the parts list, pull wires between ports. */
  const dnd = {
    start(g) {
      st.wire = null;
      g.u = ui();
      if (g.kind !== 'port') return;
      $('#circ').classList.add('picking');
      $$('#circ [data-p]').forEach(el => el.classList.toggle('can', el.dataset.p !== g.id && !!connect(circ(), io(), g.id, el.dataset.p).circ));
    },
    move(g) { drawWires($('#cboard'), circ(), g.u, g.u.win.probe, g.kind === 'port' ? { from: g.id, x: g.x, y: g.y } : null); },
    drop(g) {
      const over = g.over;
      const slot = over && over.dataset.slot !== undefined ? +over.dataset.slot : null;
      if (g.kind === 'port' && over) {
        const onto = over.dataset.piece, to = over.dataset.p || (onto ? (isSink(g.id) ? onto : cardPort(g.id, onto)) : null);
        if (to && connectPorts(g.id, to)) st.pick = null;
      }
      if (g.kind === 'piece' && over) {
        if (slot !== null) setCirc(moveNode(circ(), g.id, slot));
        else { setCirc(removeNode(circ(), g.id)); toast(tr('拿掉了一个元件', 'Removed a component')); }
      }
      if (g.kind === 'tray' && over) {
        const free = placement(circ()).free;
        if (slot === null) setCirc(placeNode(circ(), g.id, free[0]));
        else if (free.includes(slot)) setCirc(placeNode(circ(), g.id, slot));
        else toast(tr('这一格已经有元件了', 'That slot already has a component'));
      }
      rt.refresh();
    },
    end: () => rt.refresh(),
  };

  function onPort(p) {
    st.wire = null;
    if (!st.pick) {
      if (isSink(p) && circ().wires.some(w => w.to === p)) { setCirc(unwire(circ(), p)); toast(tr('拆掉了一根线', 'Removed a wire')); buzz(8); }
      else st.pick = p;
    } else if (st.pick === p) st.pick = null;
    else if (isSink(st.pick) === isSink(p)) st.pick = p;
    else if (connectPorts(st.pick, p)) st.pick = null;
    rt.refresh();
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
    note() {
      const v = st.view, Vw = V();
      if (!v) return tr(`测试棋盘：点一个格子可以填数，或者让机器人站过去，红框里马上显示电路板的答案。点「运行测试」会清空棋盘，机器人从头按「${Vw.orderText(opt())}」的顺序走。`, `Test board: click a cell to type a number into it, or to send the robot there; the red frame shows the circuit board’s answer straight away. “Run tests” clears the board and the robot walks it from the beginning, ${Vw.orderText(opt())}.`);
      const s = shownStep();
      if (!v.end) return s ? tr(`${s.round ? `第 ${s.round} 轮 · ` : ''}正在算${Vw.where(s.cell)}${s.round ? '。黄框是这一轮里变了的格子。' : ''}`, `${s.round ? `Round ${s.round} · ` : ''}Computing ${Vw.where(s.cell)}${s.round ? '. Yellow frames mark the cells this round has changed.' : ''}`) : '';
      if (v.focus !== null && v.focus !== undefined) return tr(`${Vw.where(s.cell)}：视野和电路板上的数，是机器人在这一格看到和算出的值。再点一次取消。`, `${Vw.where(s.cell)}: the numbers in the view and on the circuit board are what the robot saw and computed on this cell. Click again to leave.`);
      const more = Vw.inspect === false ? '' : tr('点棋盘上算过的格子，可以查看机器在那一格算出的值。', ' Click any computed cell on the board to see what the machine computed there.');
      if (v.halt) return tr(`机器在${Vw.where(s.cell)}出了错。${more}`, `The machine went wrong at ${Vw.where(s.cell)}.${more}`);
      const rounds = v.res.rounds ? tr(`扫了 ${v.res.rounds} 轮，最后一轮一格也没变。`, `Scanned ${v.res.rounds} round${v.res.rounds === 1 ? '' : 's'}; the last round changed nothing. `) : '';
      return `${rounds}${v.pass ? tr(`答案 ${signal(v.res.value)}，正确。`, `Answer ${signal(v.res.value)}: correct.`) : tr(`机器算出 ${signal(v.res.value)}，应该是 ${signal(expected()[st.ti])}。`, `The machine computed ${signal(v.res.value)}; it should be ${signal(expected()[st.ti])}.`)}${more}`;
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
    dnd,
    parts() {
      const fresh = stage().fresh || [];
      const items = stage().palette.map(kind => {
        const d = def(kind);
        return `<button class="titem${d.bp ? ' bp' : ''}" type="button" data-act="tray" data-k="${kind}" data-tray="${kind}" title="${d.desc}">
          <span class="ti-ic">${d.bp ? ICON.part : d.icon}</span><span class="ti-tx"><b>${d.name}${fresh.includes(kind) ? `<em>${tr('新', 'new')}</em>` : ''}</b><small>${kind === 'const' ? tr('一个数', 'a number') : d.tag}</small><span class="ti-ds">${d.desc}</span></span><span class="ti-add" aria-hidden="true">＋</span></button>`;
      }).join('');
      return `<header class="phead"><h3>${tr('元件', 'Components')}</h3><small>${tr('点一下放进空格，按住拖到某一格', 'Click to drop into a free slot, or hold and drag to a slot')}</small></header><div class="plist">${items}</div>
        <p class="tdrop">${tr('拖到这里拿掉元件', 'Drag here to remove a component')}</p><p class="pnote">${tr('点两个圆点连线，或从一个圆点拖到另一个；选中圆点后点一块也能接。点已接好的输入口就拆掉。按住一块可以换格子，拖回这里就是拿掉。点一下连线可以选中它，按 Delete 删除；Esc 取消。', 'Click two dots to wire them, or drag from one dot to another; with a dot picked, clicking a component also connects it. Click a wired input to unwire it. Hold a component to move it to another slot, or drag it back here to remove it. Click a wire to select it and press Delete to remove it; Esc cancels.')}</p>`;
    },
    /** Delete key: remove the selected wire. */
    remove() {
      if (!st.wire || busy()) return false;
      setCirc(unwire(circ(), st.wire));
      st.wire = null;
      buzz(8);
      rt.refresh();
      return true;
    },
    /** Esc: drop a half-made wire, the wire selection or the number pad. */
    cancel() {
      if (!st.pick && !st.wire && !st.sel) return false;
      st.pick = null;
      st.wire = null;
      st.sel = null;
      st.input = '';
      rt.refresh();
      return true;
    },
    panel() {
      const uses = L.uses ? `<div class="chips">${L.uses.map(k => `<span class="tag">${ICON.part}${tr('零件', 'Part')} · ${PARTS[k].name}</span>`).join('')}</div>` : '';
      const dirs = L.dirs ? `<div class="pcard"><h3>${tr('改写方向', 'Rewrite direction')}<small>${tr('机器上的两个开关', 'two switches on the machine')}</small></h3>${['01', 'inf'].map(kind => `<div class="dirrow"><div class="optlabel">${kind === '01' ? tr('每件最多拿一次时', 'When each item can be taken at most once') : tr('每件可以拿很多次时', 'When each item can be taken many times')}</div>
        <div class="chips two" role="radiogroup" aria-label="${tr('改写方向', 'Rewrite direction')}">${[['asc', tr('从左往右 →', 'left to right →')], ['desc', tr('← 从右往左', '← right to left')]].map(([v, l]) => `<button class="chip" type="button" role="radio" aria-checked="${st.dirs[kind] === v}" data-act="dir" data-k="${kind}" data-v="${v}">${l}</button>`).join('')}</div></div>`).join('')}</div>` : '';
      const s = stage(), flash = st.flashAt && Date.now() - st.flashAt < 1800;
      const dial = s.dial ? `<div class="pcard dial${flash ? ' flash' : ''}"><h3>${tr('扫描顺序', 'Scan order')}<small>${tr('机器人按这个顺序走过整张表', 'the robot walks the whole table in this order')}</small></h3>
        <div class="dialopts" role="radiogroup" aria-label="${tr('扫描顺序', 'Scan order')}">${s.dial.map(id => { const d = V().dial[id]; return `<button class="dialopt" type="button" role="radio" aria-checked="${st.scan[st.stage] === id}" data-act="scan" data-v="${id}">${orderFig(d.fig)}<span>${d.l}</span></button>`; }).join('')}</div></div>` : '';
      const mem = s.memory ? memoryCard(s, st.mem[st.stage], tests()[st.ti]) : '';
      return `${mem}${dial}<div class="pcard cpcard"><h3><span class="cptitle">${tr('电路板', 'Circuit board')}</span>${st.wire ? `<button class="cdel" type="button" data-act="unwire">${tr('删除连线', 'Delete wire')}</button>` : `<small>${tr('点圆点连线，按住元件换格子', 'click dots to wire, hold a component to move it')}</small>`}</h3>${uses}
        ${editorHTML(circ(), ui())}</div>${dirs}${st.pick ? `<div class="pickbar" role="status"><span>${isSink(st.pick) ? tr('这个输入口读谁？点一个亮起的输出口（块底下的圆点），或点那一块', 'What should this input read? Click a highlighted output (the dot under a component), or the component itself') : tr('接到哪？点一个亮起的输入口（块顶上的圆点），或点那一块', 'Where does it go? Click a highlighted input (a dot on top of a component), or the component itself')}</span><button type="button" data-act="unpick">${tr('取消', 'Cancel')}</button></div>` : ''}`;
    },
    mounted() {
      const root = $('#circ');
      if (!root) return;
      const u = ui();
      $('#cview').innerHTML = viewHTML(circ(), u);
      drawWires($('#cboard'), circ(), u, u.win.probe);
      paintProbe(root, u.win.probe);
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
      if (name === 'port') onPort(el.dataset.p || el.dataset.q);
      if (name === 'wire') { st.pick = null; st.wire = st.wire === el.dataset.w ? null : el.dataset.w; buzz(6); rt.refresh(); }
      if (name === 'unwire') ctl.remove();
      if (name === 'tray') {
        st.pick = null;
        st.wire = null;
        setCirc(placeNode(circ(), el.dataset.k, placement(circ()).free[0]));
        buzz(8);
        rt.refresh();
      }
      if (name === 'slot') { st.pick = null; st.wire = null; openSlot(+el.dataset.at); }
      if (name === 'unpick') { st.pick = null; rt.refresh(); }
      if (name === 'lit') { st.pick = null; st.wire = null; setCirc(toggleLit(circ(), el.dataset.t)); buzz(6); rt.refresh(); }
      if (name === 'sandbox') { st.view = null; rt.refresh(); }
      if (name === 'node') {
        // With a dot picked, tapping a card wires it: to its output, or to its first free input that fits.
        if (st.pick) {
          const id = el.dataset.n, to = isSink(st.pick) ? id : cardPort(st.pick, id);
          if (to && connectPorts(st.pick, to)) st.pick = null;
          else if (!to) { toast(tr('这一块没有能接这根线的口', 'This component has no port that takes this wire')); buzz(20); }
          rt.refresh();
          return;
        }
        openNode(el.dataset.n);
      }
      if (name === 'scan') { st.scan[st.stage] = el.dataset.v; changed(); buzz(6); rt.refresh(); }
      if (name === 'mem') { const m = st.mem[st.stage], v = el.dataset.v; st.mem[st.stage] = m.includes(v) ? m.filter(x => x !== v) : [...m, v]; st.robot = null; st.typed = {}; changed(); buzz(6); rt.refresh(); }
      if (name === 'filter') { st.filter[st.stage] = el.dataset.v; changed(); buzz(6); rt.refresh(); }
      if (name === 'dir') { st.dirs[el.dataset.k] = el.dataset.v; changed(); buzz(6); rt.refresh(); }
      if (name === 'clear') {
        if (!st.armed) { st.armed = true; rt.refresh(); setTimeout(() => { if (st.armed) { st.armed = false; rt.refresh(); } }, 2600); return; }
        setCirc(blank());
        st.pick = null;
        rt.refresh();
      }
    },
    onCell(id) {
      const v = st.view;
      if (busy()) return;
      if (!v) { st.sel = st.sel === id ? null : id; st.input = ''; st.pick = null; buzz(6); rt.refresh(); return; }
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
