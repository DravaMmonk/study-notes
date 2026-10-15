// Circuit levels: the player builds the rule as a circuit board, and the machine runs it on every cell.
// A level may have several stages (a new world with new taps), e.g. one layer first, then two.

import { $, buzz, toast, signal, ICON } from '../util.js';
import { rt, Anim } from '../runtime.js';
import { WORLDS, runCircuit } from '../circuit/worlds.js';
import { def, blank } from '../circuit/components.js';
import { boardHTML, drawWires, paintProbe, connect, unwire, removeNode, placeNode, isSink } from '../circuit/editor.js';
import { PARTS } from '../levels/parts.js';

export function circuitMode(L, saved) {
  const stages = L.stages || [L];
  const st = {
    stage: saved && saved.stage ? saved.stage : 0,
    circs: stages.map((_, k) => (saved && saved.circs && saved.circs[k]) || blank()),
    dirs: { ...(L.dirs || {}), ...((saved && saved.dirs) || {}) },
    pick: null, armed: false, ti: 0, status: L.tests.map(() => null), view: null,
  };
  const stage = () => stages[st.stage], V = () => WORLDS[stage().world], circ = () => st.circs[st.stage];
  const opt = () => ({ ...stage(), dirs: st.dirs });
  const taps = () => V().taps;
  const label = t => (L.testLabel || V().label)(t);
  const busy = () => rt.cur.running;
  const changed = () => { st.status = L.tests.map(() => null); st.view = null; st.armed = false; rt.persist(); };
  const setCirc = c => { st.circs[st.stage] = c; changed(); };
  const shownStep = () => { const v = st.view; if (!v || !v.k) return null; return v.res.steps[v.focus ?? v.k - 1]; };
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
    rt.openSheet(`<div><div class="kicker sig">空位 ${slot + 1}</div><h3 class="sh" id="sheetTitle">放一个元件</h3></div>
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

  function onPort(p) {
    if (!st.pick) {
      if (isSink(p) && circ().wires.some(w => w.to === p)) { setCirc(unwire(circ(), p)); toast('拆掉了一根线'); buzz(8); }
      else st.pick = p;
      rt.refresh();
      return;
    }
    if (st.pick === p) { st.pick = null; rt.refresh(); return; }
    const r = connect(circ(), taps(), st.pick, p);
    if (r.same) st.pick = p;
    else if (r.msg) { toast(r.msg); buzz(20); }
    else { setCirc(r.circ); st.pick = null; buzz(8); }
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
      return V().scene(t, v, { ...opt(), ...(v && v.end && v.pass && L.trace ? L.trace(t) : {}) });
    },
    boardOpt: () => L.boardOpt || { minScale: 0.7, maxScale: 1.25 },
    note() {
      const v = st.view, Vw = V();
      if (!v) return `电路板会装在每一个格子上。机器按「${Vw.orderText(opt())}」的顺序，一格一格地算。`;
      const s = shownStep();
      if (!v.end) return s ? `正在算${Vw.where(s.cell)}` : '';
      if (v.focus !== null && v.focus !== undefined) return `${Vw.where(s.cell)}：电路板上的小数字，是机器在这一格算出的值。再点一次取消。`;
      const more = Vw.inspect === false ? '' : '点棋盘上算过的格子，可以查看机器在那一格算出的值。';
      if (v.halt) return `机器在${Vw.where(s.cell)}出了错。${more}`;
      return `${v.pass ? `答案 ${signal(v.res.value)}，正确。` : `机器算出 ${signal(v.res.value)}，应该是 ${signal(L.expected[st.ti])}。`}${more}`;
    },
    after: () => (L.after ? L.after(L.tests[st.ti], st.view) : ''),
    tip() {
      const c = circ();
      if (L.guide && st.stage === 0) {
        if (!c.nodes.length) return { text: '第 1 步：点电路板中间的「＋ 放元件」，放一个汇合器。' };
        if (!c.wires.length) return { text: '第 2 步：点顶上的「上面」输入口，再点汇合器顶上的一个圆点，就连上了一根线。' };
        if (!c.wires.some(w => w.to.startsWith('out:'))) return { text: '记得把汇合器底部的输出圆点，连到最下面的「本格」。' };
      }
      return stage().tip ? { text: stage().tip } : null;
    },
    panel() {
      const s = stage(), uses = L.uses ? `<div class="chips">${L.uses.map(k => `<span class="tag">${ICON.part}零件 · ${PARTS[k].name}</span>`).join('')}</div>` : '';
      const dirs = L.dirs ? `<div class="pcard"><h3>改写方向<small>机器上的两个开关</small></h3>${['01', 'inf'].map(kind => `<div class="dirrow"><div class="optlabel">${kind === '01' ? '每件最多拿一次时' : '每件可以拿很多次时'}</div>
        <div class="chips two" role="radiogroup" aria-label="改写方向">${[['asc', '从左往右 →'], ['desc', '← 从右往左']].map(([v, l]) => `<button class="chip" type="button" role="radio" aria-checked="${st.dirs[kind] === v}" data-act="dir" data-k="${kind}" data-v="${v}">${l}</button>`).join('')}</div></div>`).join('')}</div>` : '';
      return `<div class="pcard"><h3>电路板<small>${st.pick ? '再点一个亮起的接口' : '点空位放元件，点两个接口连线'}</small></h3>${uses}
        ${boardHTML(circ(), { taps: taps(), tapIds: s.taps, outs: V().outs, slots: s.slots, pick: st.pick })}</div>${dirs}`;
    },
    mounted() {
      const root = $('#circ');
      if (!root) return;
      const s = shownStep(), probe = s ? s.probe : null;
      drawWires(root, circ(), taps(), st.pick, probe);
      paintProbe(root, probe);
    },
    dock: () => ({ meta: `${L.tests.length} 个测试 · ${circ().nodes.length} 个元件`, sec: circ().nodes.length && !busy() ? (st.armed ? '确认清空' : '清空') : '', secAct: 'clear', go: busy() ? '跳过动画' : '运行测试', act: 'run', busy: busy() }),
    act(name, el) {
      if (name === 'run') { if (busy()) Anim.skip(); else ctl.run(); return; }
      if (busy()) return;
      if (name === 'port') onPort(el.dataset.p);
      if (name === 'slot') { st.pick = null; openPalette(+el.dataset.s); }
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
        const t = L.tests[k], res = runCircuit(Vw, t, c, o), ok = !res.error && res.value === L.expected[k];
        const mm = ok || res.error || stage().onFail ? null : firstMismatch(t, res);
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
