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
import { KEY_COLORS } from '../circuit/worlds/maze.js';

const MERGES = ['msum', 'mmin', 'mmax'];

/** What the state remembers: one switch per key color; the table has a layer for every set of remembered keys. */
function memoryCard(s, mem, t) {
  const n = 2 ** mem.length;
  return `<div class="pcard memo"><h3>状态记住什么<small>${n} 层 · 每层 ${t.R * t.C} 格 · 一共 ${n * t.R * t.C} 格</small></h3>
    <div class="chips">${s.memory.map(c => `<button class="chip memk k-${c}" type="button" role="switch" aria-checked="${mem.includes(c)}" data-act="mem" data-v="${c}"><span class="box"></span>记住${KEY_COLORS[c].n}钥匙</button>`).join('')}</div>
    <p>每多记一把钥匙，表就多一倍的层：每一层是「手里正好有这几把钥匙」的路线。</p></div>`;
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
    w.note = box ? Vw.where(cell) : v.focus !== null && v.focus !== undefined ? `查看${Vw.where(cell)}` : Vw.where(cell);
    w.robot = robot;
    w.probe = box ? box.probe : s.probe;
    return w;
  }
  const ui = () => ({ taps: V().taps, avail: avail(), lit: litOf(circ()), outs: V().outs, pick: st.pick, wire: st.wire, palette: stage().palette, win: win(), sideView: wide() });
  const hintFor = () => {
    const s = stage(), d = L.diagnose ? L.diagnose(circ(), st) : null;
    return d || (s.hints ? s.hints[Math.min(Math.max(rt.cur.fails - 1, 0), s.hints.length - 1)] : null);
  };

  function openNode(id) {
    const n = circ().nodes.find(x => x.id === id), d = def(n.kind);
    const vals = n.kind === 'const' ? `<div class="chips" role="radiogroup" aria-label="数值">${(stage().consts || [0, 1, 2, 3, 4, 5]).map(v => `<button class="chip" type="button" role="radio" aria-checked="${n.value === v}" data-act="val" data-v="${v}">${v}</button>`).join('')}</div>` : '';
    // A merge can change its model in place: the wires stay, only the way it merges changes.
    const swaps = MERGES.includes(n.kind) ? MERGES.filter(k => k !== n.kind && stage().palette.includes(k)) : [];
    const swap = swaps.length ? `<div class="optlabel">换个型号（连线不变）</div><div class="chips">${swaps.map(k => `<button class="chip" type="button" data-act="swap" data-k="${k}">${def(k).tag}</button>`).join('')}</div>` : '';
    rt.openSheet(`<div><div class="kicker sig">${d.bp ? '零件' : '元件'}</div><h3 class="sh" id="sheetTitle">${d.name}${d.tag && n.kind !== 'const' ? ` · ${d.tag}` : ''}</h3></div>
      <div class="prose"><p>${d.desc}</p></div>${vals}${swap}
      <div class="acts"><button class="btn sec" type="button" data-act="del">拿掉这个元件</button><button class="btn pri" type="button" data-close data-primary>好</button></div>`, {
      val: el => { setCirc({ ...circ(), nodes: circ().nodes.map(x => (x.id === id ? { ...x, value: +el.dataset.v } : x)) }); rt.closeSheet(); rt.refresh(); },
      swap: el => { setCirc({ ...circ(), nodes: circ().nodes.map(x => (x.id === id ? { ...x, kind: el.dataset.k } : x)) }); buzz(8); rt.closeSheet(); rt.refresh(); },
      del: () => { setCirc(removeNode(circ(), id)); rt.closeSheet(); rt.refresh(); },
    });
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
      return `<button class="pal" type="button" data-act="put" data-k="${kind}"><span class="pal-ic${d.bp ? ' bp' : ''}">${d.bp ? ICON.part : d.icon}</span><span class="pal-tx"><b>${d.name}${d.tag && kind !== 'const' ? ` · ${d.tag}` : ''}${fresh.includes(kind) ? '<em>新</em>' : ''}</b><small>${d.desc}</small></span></button>`;
    }).join('');
    rt.openSheet(`<div><div class="kicker sig">元件</div><h3 class="sh" id="sheetTitle">放进第 ${at + 1} 格</h3></div>
      <div class="list">${rows}</div>
      <div class="acts"><button class="btn sec" type="button" data-close>取消</button></div>`, {
      put: el => { setCirc(placeNode(circ(), el.dataset.k, at)); buzz(8); rt.closeSheet(); rt.refresh(); },
    });
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
        else { setCirc(removeNode(circ(), g.id)); toast('拿掉了一个元件'); }
      }
      if (g.kind === 'tray' && over) {
        const free = placement(circ()).free;
        if (slot === null) setCirc(placeNode(circ(), g.id, free[0]));
        else if (free.includes(slot)) setCirc(placeNode(circ(), g.id, slot));
        else toast('这一格已经有元件了');
      }
      rt.refresh();
    },
    end: () => rt.refresh(),
  };

  function onPort(p) {
    st.wire = null;
    if (!st.pick) {
      if (isSink(p) && circ().wires.some(w => w.to === p)) { setCirc(unwire(circ(), p)); toast('拆掉了一根线'); buzz(8); }
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

  function explain(k, t, res, mm) {
    const Vw = V(), o = opt();
    if (res.error && res.error.diverge) {
      return { head: '表一直停不下来', body: `测试 ${k + 1} 中，机器扫了 ${MAX_ROUNDS} 轮，表还在变。照这块电路板，有些格子会越算越大（或越算越小），永远不会稳定下来。` };
    }
    if (res.error) {
      return { head: '读到了空格子', body: `测试 ${k + 1} 中，机器算到<b>${Vw.where(res.error.cell)}</b>时，电路要读<b>${Vw.name(res.error.key)}</b>，可那里还空着。机器是按「${Vw.orderText(o)}」的顺序算的，读之前，那个格子必须已经算好。` };
    }
    if (mm && mm.key !== undefined) {
      return { head: `测试 ${k + 1} 没通过`, body: `${label(t)}：表稳定下来以后，<b>${Vw.name(mm.key)}</b>应该是 <b>${signal(mm.want)}</b>，你的电路板算出了 <b>${signal(mm.got)}</b>。棋盘上标红的就是这一格。` };
    }
    if (mm) {
      const s = res.steps[mm.q];
      return { head: `测试 ${k + 1} 没通过`, body: `${label(t)}：机器在<b>${Vw.where(s.cell)}</b>出了错。「${Vw.outs[mm.z][1]}」应该是 <b>${signal(mm.want)}</b>，你的电路算出了 <b>${signal(mm.got)}</b>。棋盘停在了这一格；电路板上的小数字，是机器在这一格算出的值。` };
    }
    return { head: `测试 ${k + 1} 没通过`, body: `${label(t)}：答案应该是 <b>${signal(expected()[k])}</b>，机器算出了 <b>${signal(res.value)}</b>。${L.explain ? L.explain(t, res, st) : ''}`, extra: L.counter ? L.counter(t, res, opt()) : '' };
  }

  /** Every test of a stage passed and another stage follows: say what it showed, then move on (keeping the board). */
  function stageDone() {
    const s = stage(), n = stages.length, d = s.done || {};
    buzz([15, 40, 15]);
    rt.openSheet(`<div><div class="kicker good">阶段 ${st.stage + 1}/${n} · 完成</div><h3 class="sh" id="sheetTitle">${d.head || '这一阶段通过了'}</h3></div>
      <div class="prose">${(d.body || []).map(p => `<p>${p}</p>`).join('')}</div>
      <div class="acts"><button class="btn pri" type="button" data-act="next" data-primary>进入阶段 ${st.stage + 2}</button></div>`, {
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
    tests: () => tests().map((t, k) => ({ label: `测试 ${k + 1} · ${label(t)}`, status: st.status[k] })),
    selectTest(k) { st.ti = k; st.view = null; st.typed = {}; st.robot = null; st.sel = null; rt.refresh(); },
    scene() {
      const t = tests()[st.ti], v = st.view;
      return { ...V().scene(t, v, { ...opt(), ...(v && v.end && v.pass && L.trace ? L.trace(t) : {}), bench: v ? null : sandbox() }), look: robot.look };
    },
    boardOpt: () => L.boardOpt || { minScale: 0.7, maxScale: 1.25 },
    note() {
      const v = st.view, Vw = V();
      if (!v) return `测试棋盘：点一个格子可以填数，或者让机器人站过去，红框里马上显示电路板的答案。点「运行测试」会清空棋盘，机器人从头按「${Vw.orderText(opt())}」的顺序走。`;
      const s = shownStep();
      if (!v.end) return s ? `${s.round ? `第 ${s.round} 轮 · ` : ''}正在算${Vw.where(s.cell)}${s.round ? '。黄框是这一轮里变了的格子。' : ''}` : '';
      if (v.focus !== null && v.focus !== undefined) return `${Vw.where(s.cell)}：视野和电路板上的数，是机器人在这一格看到和算出的值。再点一次取消。`;
      const more = Vw.inspect === false ? '' : '点棋盘上算过的格子，可以查看机器在那一格算出的值。';
      if (v.halt) return `机器在${Vw.where(s.cell)}出了错。${more}`;
      const rounds = v.res.rounds ? `扫了 ${v.res.rounds} 轮，最后一轮一格也没变。` : '';
      return `${rounds}${v.pass ? `答案 ${signal(v.res.value)}，正确。` : `机器算出 ${signal(v.res.value)}，应该是 ${signal(expected()[st.ti])}。`}${more}`;
    },
    after: () => `${st.view && st.view.end && !busy() ? '<button class="sec-btn backbench" type="button" data-act="sandbox">回到棋盘测试</button>' : ''}${L.after ? L.after(tests()[st.ti], st.view, st) : ''}`,
    tip() {
      const c = circ();
      const g = L.guide ? L.guide(c, litOf(c)) : null;
      if (g) return { text: g };
      const s = stage(), text = [stages.length > 1 && s.ask ? `<b>阶段 ${st.stage + 1}/${stages.length}</b>${s.ask}` : '', s.tip || ''].filter(Boolean).join(' ');
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
          <span class="ti-ic">${d.bp ? ICON.part : d.icon}</span><span class="ti-tx"><b>${d.name}${fresh.includes(kind) ? '<em>新</em>' : ''}</b><small>${kind === 'const' ? '一个数' : d.tag}</small><span class="ti-ds">${d.desc}</span></span><span class="ti-add" aria-hidden="true">＋</span></button>`;
      }).join('');
      return `<header class="phead"><h3>元件</h3><small>点一下放进空格，按住拖到某一格</small></header><div class="plist">${items}</div>
        <p class="tdrop">拖到这里拿掉元件</p><p class="pnote">点两个圆点连线，或从一个圆点拖到另一个；选中圆点后点一块也能接。点已接好的输入口就拆掉。按住一块可以换格子，拖回这里就是拿掉。点一下连线可以选中它，按 Delete 删除；Esc 取消。</p>`;
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
      const uses = L.uses ? `<div class="chips">${L.uses.map(k => `<span class="tag">${ICON.part}零件 · ${PARTS[k].name}</span>`).join('')}</div>` : '';
      const dirs = L.dirs ? `<div class="pcard"><h3>改写方向<small>机器上的两个开关</small></h3>${['01', 'inf'].map(kind => `<div class="dirrow"><div class="optlabel">${kind === '01' ? '每件最多拿一次时' : '每件可以拿很多次时'}</div>
        <div class="chips two" role="radiogroup" aria-label="改写方向">${[['asc', '从左往右 →'], ['desc', '← 从右往左']].map(([v, l]) => `<button class="chip" type="button" role="radio" aria-checked="${st.dirs[kind] === v}" data-act="dir" data-k="${kind}" data-v="${v}">${l}</button>`).join('')}</div></div>`).join('')}</div>` : '';
      const s = stage(), flash = st.flashAt && Date.now() - st.flashAt < 1800;
      const dial = s.dial ? `<div class="pcard dial${flash ? ' flash' : ''}"><h3>扫描顺序<small>机器人按这个顺序走过整张表</small></h3>
        <div class="dialopts" role="radiogroup" aria-label="扫描顺序">${s.dial.map(id => { const d = V().dial[id]; return `<button class="dialopt" type="button" role="radio" aria-checked="${st.scan[st.stage] === id}" data-act="scan" data-v="${id}">${orderFig(d.fig)}<span>${d.l}</span></button>`; }).join('')}</div></div>` : '';
      const mem = s.memory ? memoryCard(s, st.mem[st.stage], tests()[st.ti]) : '';
      return `${mem}${dial}<div class="pcard cpcard"><h3><span class="cptitle">电路板</span>${st.wire ? '<button class="cdel" type="button" data-act="unwire">删除连线</button>' : '<small>点圆点连线，按住元件换格子</small>'}</h3>${uses}
        ${editorHTML(circ(), ui())}</div>${dirs}${st.pick ? `<div class="pickbar" role="status"><span>${isSink(st.pick) ? '这个输入口读谁？点一个亮起的输出口（块底下的圆点），或点那一块' : '接到哪？点一个亮起的输入口（块顶上的圆点），或点那一块'}</span><button type="button" data-act="unpick">取消</button></div>` : ''}`;
    },
    mounted() {
      const root = $('#circ');
      if (!root) return;
      const u = ui();
      $('#cview').innerHTML = viewHTML(circ(), u);
      drawWires($('#cboard'), circ(), u, u.win.probe);
      paintProbe(root, u.win.probe);
    },
    dock: () => (st.sel ? { pad: true } : { meta: `${stages.length > 1 ? `阶段 ${st.stage + 1}/${stages.length} · ` : ''}${tests().length} 个测试 · ${circ().nodes.length} 个元件`, sec: circ().nodes.length && !busy() ? (st.armed ? '确认清空' : '清空') : '', secAct: 'clear', go: busy() ? '跳过动画' : '运行测试', act: 'run', busy: busy() }),
    padTitle: () => `${V().name(st.sel)}：填一个数（不填 = 清空这一格）`,
    /** An extra pad key that moves the robot onto the selected cell, when it can stand there. */
    padExtra() {
      const t = tests()[st.ti], c = V().cellOf(t, st.sel, opt());
      return c && !sandbox().at.includes(st.sel) ? { key: 'bot', label: '让机器人站到这一格' } : null;
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
          else if (!to) { toast('这一块没有能接这根线的口'); buzz(20); }
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
      if (miss) { toast(`输出口「${miss[1]}」还没接线`); buzz(20); return; }
      if (s.differ !== undefined && st.scan[s.differ] === st.scan[st.stage]) { toast(`换一种顺序：和阶段 ${s.differ + 1} 用的不一样`); buzz(20); return; }
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
        rt.fail({ head: '答案对了，可表太大了', body: `每个测试都算对了，可你的状态记了 ${st.mem[st.stage].length} 件事，表有 ${2 ** st.mem[st.stage].length} 层。其实有的事<b>不记也不会算错</b>：用最少的层再通过一次。`, hint: hintFor() });
        return;
      }
      if (st.stage < stages.length - 1) { stageDone(); return; }
      rt.pass();
    },
  };
  return ctl;
}
