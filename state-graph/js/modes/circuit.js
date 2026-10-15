// Circuit levels: a robot walks the table cell by cell and runs the player's circuit board on each cell.
// The player lights cells in the robot's window as inputs, wires components, and the board writes the robot's cell.
// While building, the robot stands on a sample cell as a test bench: the player can type numbers into its window
// and watch the board answer at once. A level may have several stages (a new world with new inputs).

import { $, buzz, toast, signal, ICON } from '../util.js';
import { rt, Anim } from '../runtime.js';
import { WORLDS, runCircuit, readTap, windowOf, visibleTaps } from '../circuit/worlds.js';
import { ROBOTS } from '../circuit/robots.js';
import { def, blank, evaluate } from '../circuit/components.js';
import { editorHTML, viewHTML, drawWires, paintProbe, connect, unwire, removeNode, placeNode, moveNode, toggleLit, litOf, placement, isSink } from '../circuit/editor.js';
import { enableDrag } from '../circuit/drag.js';
import { PARTS } from '../levels/parts.js';

export function circuitMode(L, saved) {
  const stages = L.stages || [L];
  const st = {
    stage: saved && saved.stage ? saved.stage : 0,
    circs: stages.map((_, k) => (saved && saved.circs && saved.circs[k]) || blank()),
    dirs: { ...(L.dirs || {}), ...((saved && saved.dirs) || {}) },
    pick: null, armed: false, ti: 0, status: L.tests.map(() => null), view: null,
    vmode: 'lit', bench: {}, sel: null, input: '',
  };
  const robot = ROBOTS[L.robot];
  const stage = () => stages[st.stage], V = () => WORLDS[stage().world], circ = () => st.circs[st.stage];
  const opt = () => ({ ...stage(), dirs: st.dirs });
  const taps = () => V().taps;
  const label = t => (L.testLabel || V().label)(t);
  const busy = () => rt.cur.running;
  const changed = () => { st.status = L.tests.map(() => null); st.view = null; st.armed = false; rt.persist(); };
  const setCirc = c => { st.circs[st.stage] = c; changed(); };
  const shownStep = () => { const v = st.view; if (!v || !v.k) return null; return v.res.steps[v.focus ?? v.k - 1]; };

  /** Inputs this robot can light: the cells it sees, its arm, and the level's facts about its own cell. */
  const avail = () => [...visibleTaps(V(), robot.vision), ...(robot.arm ? V().armTaps : []), ...(stage().facts || [])];

  /** Test bench: the sample cell, and the table as a correct machine would have left it when arriving there. */
  function benchBase() {
    const t = L.tests[st.ti], Vw = V(), o = opt(), cell = Vw.sample(t, o), shown = new Map(Vw.base ? Vw.base(t, o) : []);
    if (stage().solution) {
      const res = runCircuit(Vw, t, stage().solution, { ...o, dirs: L.solutionDirs || st.dirs }), here = Object.values(Vw.keys(t, cell))[0];
      const q = res.steps.findIndex(x => x.at[0] === here);
      res.steps.slice(0, Math.max(q, 0)).forEach(x => (x.writes || []).forEach(([k, v]) => shown.set(k, v)));
    }
    return { t, cell, shown };
  }
  /**
   * A bench input: the player's number if they typed one, else what the robot would really read there.
   * Reading a cell the machine has not computed yet gives「—」here and is remembered in `empty`, because a real run stops there.
   */
  function benchTap(b, id, empty) {
    if (id in st.bench) return st.bench[id];
    return readTap(V(), b.t, b.cell, id, key => { if (b.shown.has(key)) return b.shown.get(key); if (empty) empty.add(key); return null; });
  }
  function benchRun() {
    const b = benchBase(), probe = {}, empty = new Set(), out = evaluate(circ(), id => benchTap(b, id, empty), V().outs.map(x => x[0]), probe).out;
    return { b, probe, out, empty };
  }

  /** The robot's window: live during a run or an inspection, otherwise the test bench around the sample cell. */
  function win() {
    const t = L.tests[st.ti], Vw = V(), v = st.view, s = shownStep(), bench = s ? null : benchRun();
    const cell = s ? s.cell : bench.b.cell, shown = new Map(v ? v.res.base : bench.b.shown);
    if (v) v.res.steps.slice(0, (v.focus ?? v.k - 1) + 1).forEach(x => (x.writes || []).forEach(([key, val]) => shown.set(key, val)));
    const reads = new Set(s ? s.reads : []), at = key => (key !== null && shown.has(key) ? signal(shown.get(key)) : '');
    const val = x => {
      if (bench) return x.out ? signal(bench.out[x.out]) : x.tap && x.tap in st.bench ? signal(st.bench[x.tap]) : at(x.key);
      return at(x.key);
    };
    const mark = x => ({ ...x, value: x.key === null ? '' : val(x), state: [(s && s.empty === x.key) || (bench && bench.empty.has(x.key) && !(x.tap in st.bench)) ? 'empty' : reads.has(x.key) ? 'read' : '', bench && x.tap && x.tap in st.bench ? 'typed' : '', st.sel && st.sel === x.tap ? 'editing' : ''].filter(Boolean).join(' ') });
    const w = windowOf(Vw, t, cell, robot.vision);
    w.wins = w.wins.map(x => ({ ...x, cells: x.cells.map(mark) }));
    if (w.arm) w.arm.cells = w.arm.cells.map(mark);
    w.facts = (stage().facts || []).map(id => ({ id, value: signal(bench ? benchTap(bench.b, id) : readTap(Vw, t, cell, id, key => shown.get(key) ?? null)), state: bench && id in st.bench ? 'typed' : st.sel === id ? 'editing' : '' }));
    w.note = bench && bench.empty.size ? '红格还没算出来：真正运行时，机器人会在这里停下' : bench ? (st.vmode === 'bench' ? '测试台：点格子改数' : `示例位置 · ${Vw.where(cell)}`) : v.focus !== null && v.focus !== undefined ? `查看${Vw.where(cell)}` : Vw.where(cell);
    w.robot = robot;
    w.mode = st.vmode;
    w.bench = !!bench;
    w.typed = Object.keys(st.bench).length > 0;
    w.probe = bench ? bench.probe : s.probe;
    return w;
  }
  const ui = () => ({ taps: taps(), avail: avail(), lit: litOf(circ()), outs: V().outs, slots: stage().slots, pick: st.pick, palette: stage().palette, win: win() });
  const firstFree = () => placement(circ(), stage().slots).free[0];
  const hintFor = () => {
    const s = stage(), d = L.diagnose ? L.diagnose(circ(), st) : null;
    return d || (s.hints ? s.hints[Math.min(Math.max(rt.cur.fails - 1, 0), s.hints.length - 1)] : null);
  };

  function openPalette(slot) {
    const fresh = stage().fresh || [];
    const rows = stage().palette.map(kind => {
      const d = def(kind);
      return `<button class="pal" type="button" data-act="put" data-k="${kind}"><span class="pal-ic${d.bp ? ' bp' : ''}">${d.bp ? ICON.part : d.icon}</span><span class="pal-tx"><b>${d.name}${d.tag && kind !== 'const' ? ` · ${d.tag}` : ''}${fresh.includes(kind) ? '<em>新</em>' : ''}</b><small>${d.desc}</small></span></button>`;
    }).join('');
    rt.openSheet(`<div><div class="kicker sig">元件</div><h3 class="sh" id="sheetTitle">放一个元件</h3></div>
      <div class="list">${rows}</div>
      <div class="acts"><button class="btn sec" type="button" data-close>取消</button></div>`, {
      put: el => { setCirc(placeNode(circ(), el.dataset.k, slot)); buzz(8); rt.closeSheet(); rt.refresh(); },
    });
  }

  function openNode(id) {
    const n = circ().nodes.find(x => x.id === id), d = def(n.kind);
    const vals = n.kind === 'const' ? `<div class="chips" role="radiogroup" aria-label="数值">${[0, 1, 2, 3, 4, 5].map(v => `<button class="chip" type="button" role="radio" aria-checked="${n.value === v}" data-act="val" data-v="${v}">${v}</button>`).join('')}</div>` : '';
    rt.openSheet(`<div><div class="kicker sig">${d.bp ? '零件' : '元件'}</div><h3 class="sh" id="sheetTitle">${d.name}${d.tag && n.kind !== 'const' ? ` · ${d.tag}` : ''}</h3></div>
      <div class="prose"><p>${d.desc}</p></div>${vals}
      <div class="acts"><button class="btn sec" type="button" data-act="del">拿掉这个元件</button><button class="btn pri" type="button" data-close data-primary>好</button></div>`, {
      val: el => { setCirc({ ...circ(), nodes: circ().nodes.map(x => (x.id === id ? { ...x, value: +el.dataset.v } : x)) }); rt.closeSheet(); rt.refresh(); },
      del: () => { setCirc(removeNode(circ(), id)); rt.closeSheet(); rt.refresh(); },
    });
  }

  function connectPorts(a, b) {
    const r = connect(circ(), taps(), a, b);
    if (r.msg) { toast(r.msg); buzz(20); return false; }
    if (r.circ) { setCirc(r.circ); buzz(8); }
    return !!r.circ;
  }

  /** Drag handlers: move or remove components, drop new ones from the tray, pull wires between ports. */
  const dnd = {
    move(g) { drawWires($('#cboard'), circ(), ui(), null, g.kind === 'port' ? { from: g.id, x: g.x, y: g.y } : null); },
    drop(g) {
      const over = g.over;
      if (g.kind === 'port' && over) { if (connectPorts(g.id, over.dataset.p)) st.pick = null; }
      if (g.kind === 'node' && over) {
        if (over.dataset.trash !== undefined) { setCirc(removeNode(circ(), g.id)); toast('拿掉了一个元件'); }
        else setCirc(moveNode(circ(), g.id, +over.dataset.at, stage().slots));
      }
      if (g.kind === 'tray' && over) {
        const at = +over.dataset.at;
        if (placement(circ(), stage().slots).free.includes(at)) setCirc(placeNode(circ(), g.id, at));
        else toast('这一格已经有元件了');
      }
      rt.refresh();
    },
    end: () => rt.refresh(),
  };

  function onPort(p) {
    if (!st.pick) {
      if (isSink(p) && circ().wires.some(w => w.to === p)) { setCirc(unwire(circ(), p)); toast('拆掉了一根线'); buzz(8); }
      else st.pick = p;
    } else if (st.pick === p) st.pick = null;
    else if (isSink(st.pick) === isSink(p)) st.pick = p;
    else if (connectPorts(st.pick, p)) st.pick = null;
    rt.refresh();
  }

  /** First step whose outputs differ from the reference circuit's. */
  function firstMismatch(t, res) {
    if (!stage().solution || L.noTrace) return null;
    const ref = runCircuit(V(), t, stage().solution, opt());
    for (let q = 0; q < res.steps.length; q++) {
      const z = res.steps[q].writes.findIndex(([, v], j) => ref.steps[q].writes[j][1] !== v);
      if (z >= 0) return { q, z, want: ref.steps[q].writes[z][1], got: res.steps[q].writes[z][1] };
    }
    return null;
  }

  function explain(k, t, res, mm) {
    const Vw = V(), o = opt();
    if (res.error) {
      return { head: '读到了空格子', body: `测试 ${k + 1} 中，机器算到<b>${Vw.where(res.error.cell)}</b>时，电路要读<b>${Vw.name(res.error.key)}</b>，可那里还空着。机器是按「${Vw.orderText(o)}」的顺序算的，读之前，那个格子必须已经算好。` };
    }
    if (mm) {
      const s = res.steps[mm.q];
      return { head: `测试 ${k + 1} 没通过`, body: `${label(t)}：机器在<b>${Vw.where(s.cell)}</b>出了错。「${Vw.outs[mm.z][1]}」应该是 <b>${signal(mm.want)}</b>，你的电路算出了 <b>${signal(mm.got)}</b>。棋盘停在了这一格；电路板上的小数字，是机器在这一格算出的值。` };
    }
    return { head: `测试 ${k + 1} 没通过`, body: `${label(t)}：答案应该是 <b>${signal(L.expected[k])}</b>，机器算出了 <b>${signal(res.value)}</b>。${L.explain ? L.explain(t, res, st) : ''}` };
  }

  const ctl = {
    st,
    save: () => ({ stage: st.stage, circs: st.circs, dirs: st.dirs }),
    tests: () => L.tests.map((t, k) => ({ label: `测试 ${k + 1} · ${label(t)}`, status: st.status[k] })),
    selectTest(k) { st.ti = k; st.view = null; rt.refresh(); },
    scene() {
      const t = L.tests[st.ti], v = st.view;
      return { ...V().scene(t, v, { ...opt(), ...(v && v.end && v.pass && L.trace ? L.trace(t) : {}) }), look: robot.look };
    },
    boardOpt: () => L.boardOpt || { minScale: 0.7, maxScale: 1.25 },
    note() {
      const v = st.view, Vw = V();
      if (!v) return `机器人按「${Vw.orderText(opt())}」的顺序一格一格地走，在每一格上运行你的电路板，把结果写进脚下的格子。`;
      const s = shownStep();
      if (!v.end) return s ? `正在算${Vw.where(s.cell)}` : '';
      if (v.focus !== null && v.focus !== undefined) return `${Vw.where(s.cell)}：视野和电路板上的数，是机器人在这一格看到和算出的值。再点一次取消。`;
      const more = Vw.inspect === false ? '' : '点棋盘上算过的格子，可以查看机器在那一格算出的值。';
      if (v.halt) return `机器在${Vw.where(s.cell)}出了错。${more}`;
      return `${v.pass ? `答案 ${signal(v.res.value)}，正确。` : `机器算出 ${signal(v.res.value)}，应该是 ${signal(L.expected[st.ti])}。`}${more}`;
    },
    after: () => (L.after ? L.after(L.tests[st.ti], st.view) : ''),
    tip() {
      const c = circ();
      const g = L.guide ? L.guide(c, litOf(c)) : null;
      if (g) return { text: g };
      return stage().tip ? { text: stage().tip } : null;
    },
    panel() {
      const uses = L.uses ? `<div class="chips">${L.uses.map(k => `<span class="tag">${ICON.part}零件 · ${PARTS[k].name}</span>`).join('')}</div>` : '';
      const dirs = L.dirs ? `<div class="pcard"><h3>改写方向<small>机器上的两个开关</small></h3>${['01', 'inf'].map(kind => `<div class="dirrow"><div class="optlabel">${kind === '01' ? '每件最多拿一次时' : '每件可以拿很多次时'}</div>
        <div class="chips two" role="radiogroup" aria-label="改写方向">${[['asc', '从左往右 →'], ['desc', '← 从右往左']].map(([v, l]) => `<button class="chip" type="button" role="radio" aria-checked="${st.dirs[kind] === v}" data-act="dir" data-k="${kind}" data-v="${v}">${l}</button>`).join('')}</div></div>`).join('')}</div>` : '';
      return `<div class="pcard cpcard"><h3>电路板<small>${st.pick ? '再点一个亮起的圆点' : '拖动元件，从圆点拉线'}</small></h3>${uses}
        ${editorHTML(circ(), ui())}</div>${dirs}`;
    },
    mounted() {
      const root = $('#circ');
      if (!root) return;
      const u = ui();
      $('#cview').innerHTML = viewHTML(circ(), u);
      drawWires($('#cboard'), circ(), u, u.win.probe);
      paintProbe(root, u.win.probe);
      if (!root.dataset.dnd) { root.dataset.dnd = '1'; enableDrag(root, $('#lvScroll'), dnd); }
    },
    dock: () => (st.sel ? { pad: true } : { meta: `${L.tests.length} 个测试 · ${circ().nodes.length} 个元件`, sec: circ().nodes.length && !busy() ? (st.armed ? '确认清空' : '清空') : '', secAct: 'clear', go: busy() ? '跳过动画' : '运行测试', act: 'run', busy: busy() }),
    padTitle: () => `给「${taps()[st.sel].label}」填一个数，现在是 ${signal(benchTap(benchBase(), st.sel))}（不填就是「—」）`,
    key(k) {
      if (k === 'del') st.input = st.input.slice(0, -1);
      else if (k === 'ok') { st.bench[st.sel] = st.input === '' ? null : +st.input; st.sel = null; st.input = ''; buzz(8); }
      else if (st.input.length < 3) st.input = (st.input === '0' ? '' : st.input) + k;
      rt.refresh();
    },
    act(name, el) {
      if (name === 'run') { if (busy()) Anim.skip(); else ctl.run(); return; }
      if (busy()) return;
      if (name === 'port') onPort(el.dataset.p);
      if (name === 'slot') { st.pick = null; openPalette(+el.dataset.s); }
      if (name === 'tray') {
        const at = firstFree();
        st.pick = null;
        setCirc(placeNode(circ(), el.dataset.k, at));
        buzz(8);
        rt.refresh();
      }
      if (name === 'lit') { st.pick = null; setCirc(toggleLit(circ(), el.dataset.t)); buzz(6); rt.refresh(); }
      if (name === 'vmode') { st.vmode = el.dataset.v; st.sel = null; st.pick = null; if (st.vmode === 'bench') st.view = null; rt.refresh(); }
      if (name === 'bench') {
        const id = el.dataset.t;
        st.view = null;
        st.pick = null;
        if (taps()[id].type === 'bool') { const b = benchBase(); st.bench[id] = !benchTap(b, id); st.sel = null; buzz(6); }
        else { st.sel = id; st.input = ''; }
        rt.refresh();
      }
      if (name === 'benchreset') { st.bench = {}; st.sel = null; rt.refresh(); }
      if (name === 'node') { st.pick = null; openNode(el.dataset.n); }
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
      if (busy() || !v || !v.end) return;
      let q = -1;
      v.res.steps.slice(0, v.k).forEach((s, j) => { if (s.at.includes(id)) q = j; });
      if (q < 0) return;
      v.focus = v.focus === q ? null : q;
      buzz(6);
      rt.refresh();
    },
    async run() {
      const c = circ(), Vw = V(), o = opt();
      const miss = Vw.outs.find(([id]) => !c.wires.some(w => w.to === `out:${id}`));
      if (miss) { toast(`输出口「${miss[1]}」还没接线`); buzz(20); return; }
      st.pick = null;
      rt.startRun();
      st.status = L.tests.map(() => null);
      for (let k = 0; k < L.tests.length; k++) {
        const t = L.tests[k], res = runCircuit(Vw, t, c, o);
        // checkAll levels grade every cell, not just the answer cell.
        const mm = res.error || stage().onFail || (!L.checkAll && res.value === L.expected[k]) ? null : firstMismatch(t, res);
        const ok = !res.error && res.value === L.expected[k] && !mm;
        const stop = mm ? mm.q + 1 : res.steps.length;
        st.ti = k;
        st.status[k] = 'run';
        st.view = { res, k: 0, pass: ok, end: false, halt: !!res.error || !!mm, focus: null };
        rt.refresh();
        const per = Math.max(22, Math.min(220, 1700 / stop));
        for (let j = 1; j <= stop; j++) {
          st.view.k = j;
          rt.renderBoard();
          ctl.mounted();
          await Anim.wait(per);
        }
        st.view.end = true;
        st.status[k] = ok ? 'pass' : 'fail';
        if (!ok) {
          rt.endRun();
          rt.refresh();
          if (stage().onFail) {
            rt.fail(stage().onFail({ L, k, res, advance() { st.stage++; changed(); toast(stage().unlockToast); } }));
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
      rt.pass();
    },
  };
  return ctl;
}
