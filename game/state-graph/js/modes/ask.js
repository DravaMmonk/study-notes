// Ch.15: ask from the top. A question about one cell opens into the questions it depends on; answers come back up.
// Without memory the questions form a tree and repeat; with 「记下来」 every cell is asked once and the tree folds into
// the table. On the interval table the memoized recursion is replayed step by step, numbering cells as they finish.
//
// L.ask = { kind: 'grid', R, C, memo?: true (the level offers the switch) } or { kind: 'interval', w: [stone weights] }

import { buzz, fmt, reduced, ICON } from '../util.js';
import { E } from '../svg.js';
import { rt, Anim } from '../runtime.js';
import { rcName } from '../algo.js';

/** The table behind the questions: what a cell depends on, its own answer when it has no dependencies, and how answers combine. */
function problem(a) {
  if (a.kind === 'grid') {
    return {
      root: `${a.R - 1},${a.C - 1}`, size: a.R * a.C,
      deps: id => { const [r, c] = id.split(',').map(Number); return [[r - 1, c], [r, c - 1]].filter(([y, x]) => y >= 0 && x >= 0).map(p => p.join(',')); },
      base: id => (id === '0,0' ? 1 : null),
      join: vals => vals.reduce((s, v) => s + v, 0),
      name: id => rcName(id), short: id => { const [r, c] = id.split(',').map(Number); return `${r + 1},${c + 1}`; },
      color: id => { const [r, c] = id.split(',').map(Number); return (r * a.C + c) % 6; },
    };
  }
  const w = a.w, n = w.length, sum = (i, j) => w.slice(i, j + 1).reduce((s, x) => s + x, 0);
  return {
    root: `0,${n - 1}`, size: (n * (n - 1)) / 2,
    deps: id => { const [i, j] = id.split(',').map(Number); return Array.from({ length: j - i }, (_, d) => [`${i},${i + d}`, `${i + d + 1},${j}`]).flat(); },
    base: id => { const [i, j] = id.split(',').map(Number); return i === j ? 0 : null; },
    join: (vals, id) => { const [i, j] = id.split(',').map(Number); let best = Infinity; for (let k = 0; k + 1 < vals.length; k += 2) best = Math.min(best, vals[k] + vals[k + 1]); return best + sum(i, j); },
    name: id => { const [i, j] = id.split(',').map(Number); return `第 ${i + 1}–${j + 1} 堆`; },
  };
}

export function askMode(L, saved) {
  const a = L.ask, P = problem(a);
  const st = { memo: false, nodes: [], asked: 0, events: null, step: 0, answered: false, auto: false };

  /* ---------- grid: a tree (or, remembering, a graph) of questions the player opens ---------- */

  const node = (cell, parent) => { const n = { id: `n${st.nodes.length}`, cell, parent, kids: null, link: null, value: P.base(cell), depth: parent ? st.nodes.find(x => x.id === parent).depth + 1 : 0 }; st.nodes.push(n); st.asked++; return n; };
  const root = () => st.nodes[0];
  const byCell = cell => st.nodes.find(n => n.cell === cell && !n.link);
  function settle() {
    let moved = true;
    while (moved) {
      moved = false;
      st.nodes.forEach(n => {
        if (n.value !== null) return;
        if (n.link) { const m = st.nodes.find(x => x.id === n.link); if (m.value !== null) { n.value = m.value; moved = true; } return; }
        if (n.kids && n.kids.every(k => st.nodes.find(x => x.id === k).value !== null)) { n.value = P.join(n.kids.map(k => st.nodes.find(x => x.id === k).value), n.cell); moved = true; }
      });
    }
  }
  /** Open one question into the questions it needs. Remembering, a cell already asked is linked instead of asked again. */
  function open(n) {
    if (n.kids || n.link || n.value !== null) return false;
    n.kids = P.deps(n.cell).map(cell => {
      const seen = st.memo && byCell(cell);
      if (seen) { const k = { id: `n${st.nodes.length}`, cell, parent: n.id, kids: null, link: seen.id, value: seen.value, depth: n.depth + 1 }; st.nodes.push(k); return k.id; }
      return node(cell, n.id).id;
    });
    settle();
    return true;
  }
  const pending = () => st.nodes.filter(n => !n.kids && !n.link && n.value === null);
  function restart() { st.nodes = []; st.asked = 0; st.answered = false; node(P.root, null); }

  async function openAll() {
    rt.startRun();
    while (pending().length && rt.cur && rt.cur.L === L) {
      // Open one level of the tree at a time, so it visibly grows downward.
      const d = Math.min(...pending().map(n => n.depth));
      pending().filter(n => n.depth === d).forEach(open);
      rt.renderBoard();
      rt.refresh();
      await Anim.wait(260);
    }
    rt.endRun();
    finish();
  }
  function finish() {
    if (root().value === null) { rt.refresh(); return; }
    st.answered = true;
    rt.refresh();
    if (a.memo && !st.memo) return;
    if (!L.question) setTimeout(rt.pass, reduced() ? 0 : 700);
  }

  /** Tree layout: leaves side by side, parents centred over their children. Remembering, cells sit where they are in the table. */
  function treeScene() {
    const pos = {}, kids = n => (n.kids || []).map(k => st.nodes.find(x => x.id === k));
    let leaf = 0, depth = 0;
    (function place(n, d) {
      depth = Math.max(depth, d);
      const ks = kids(n);
      ks.forEach(k => place(k, d + 1));
      pos[n.id] = { x: ks.length ? (pos[ks[0].id].x + pos[ks.at(-1).id].x) / 2 : leaf++, y: d };
    })(root(), 0);
    const cells = st.nodes.map(n => ({
      id: n.id, x: pos[n.id].x * 54, y: pos[n.id].y * 68, w: 48, h: 48, rx: 24, label: P.short(n.cell), value: n.value === null ? '?' : n.value,
      cls: [`s${P.color(n.cell)}`, n.link ? 'ghost' : '', !n.kids && !n.link && n.value === null ? 'coach' : ''].filter(Boolean).join(' '), tap: !n.kids && !n.link && n.value === null, aria: `问${P.name(n.cell)}`,
    }));
    const edges = st.nodes.filter(n => n.parent).map(n => E(n.parent, n.id, n.link ? 'dim' : 'idle'));
    return { cells, edges };
  }
  function graphScene() {
    const firsts = st.nodes.filter(n => !n.link), cells = [], edges = [];
    firsts.forEach(n => {
      const [r, c] = n.cell.split(',').map(Number);
      cells.push({ id: n.cell, x: c * 66, y: r * 66, w: 54, h: 54, label: P.short(n.cell), value: n.value === null ? '?' : n.value, cls: [n.value !== null ? 'lit' : '', !n.kids && n.value === null ? 'coach' : ''].join(' '), tap: !n.kids && n.value === null, aria: `问${P.name(n.cell)}` });
    });
    const has = new Set(cells.map(c => c.id));
    firsts.forEach(n => (n.kids || []).forEach(k => { const m = st.nodes.find(x => x.id === k); if (has.has(m.cell)) edges.push(E(m.cell, n.cell, m.link ? 'sel' : 'idle')); }));
    return { cells, edges };
  }

  /* ---------- interval: replay the memoized recursion ---------- */

  function events() {
    const ev = [], memo = new Map();
    let order = 0;
    (function visit(cell, from) {
      if (memo.has(cell)) { ev.push({ t: 'hit', cell, from }); return memo.get(cell); }
      if (P.base(cell) !== null) { memo.set(cell, P.base(cell)); ev.push({ t: 'hit', cell, from }); return P.base(cell); }
      ev.push({ t: 'enter', cell, from });
      const vals = P.deps(cell).map(d => visit(d, cell)), v = P.join(vals, cell);
      memo.set(cell, v);
      ev.push({ t: 'done', cell, v, order: ++order });
      return v;
    })(P.root, null);
    return ev;
  }
  function intervalScene() {
    const n = a.w.length, shown = st.events.slice(0, st.step), done = new Map(), stack = [];
    shown.forEach(e => { if (e.t === 'enter') stack.push(e.cell); if (e.t === 'done') { stack.pop(); done.set(e.cell, e); } });
    const now = shown.at(-1), sp = 56, cells = [];
    a.w.forEach((x, k) => cells.push({ id: `t${k}`, x: k * sp, y: -sp + 12, w: 46, h: 30, value: x, cls: 'axis' }));
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
      const id = `${i},${j}`, d = done.get(id), diag = i === j;
      cells.push({ id, x: j * sp, y: i * sp, w: 48, h: 48, value: diag ? 0 : d ? d.v : '', corner: d ? `#${d.order}` : '', cls: [diag ? 'lit' : '', d ? 'lit' : '', stack.includes(id) ? 'pred' : '', now && now.cell === id ? 'hot' : ''].filter(Boolean).join(' ') });
    }
    const edges = now && now.from ? [E(now.cell, now.from, now.t === 'hit' ? 'sel' : 'hot')] : [];
    return { cells, edges };
  }
  /** The order the recursion finished cells in, next to the order by length, as two small numbered triangles. */
  function compare() {
    const n = a.w.length, by = new Map(st.events.filter(e => e.t === 'done').map(e => [e.cell, e.order]));
    let k = 0;
    const len = new Map();
    for (let d = 1; d < n; d++) for (let i = 0; i + d < n; i++) len.set(`${i},${i + d}`, ++k);
    // Only segments of two or more stones are computed: rows 0 … n − 2, columns 1 … n − 1.
    const fig = m => `<span class="ofig big" style="--oc:${n - 1}">${Array.from({ length: (n - 1) ** 2 }, (_, q) => { const i = Math.floor(q / (n - 1)), j = (q % (n - 1)) + 1; return i < j ? `<i>${m.get(`${i},${j}`)}</i>` : '<i class="no"></i>'; }).join('')}</span>`;
    return `<div class="afterbox"><span class="eyebrow">两种顺序</span><div class="orders"><figure>${fig(by)}<figcaption>递归自己走出来的</figcaption></figure><figure>${fig(len)}<figcaption>按长度，从短到长</figcaption></figure></div></div>`;
  }
  async function play(all) {
    if (st.step >= st.events.length) return;
    if (!all) { st.step++; buzz(5); rt.refresh(); return; }
    rt.startRun();
    while (st.step < st.events.length) { st.step++; rt.renderBoard(); rt.refresh(); await Anim.wait(240); }
    rt.endRun();
    rt.refresh();
  }

  if (a.kind === 'interval') st.events = events();
  else restart();

  const ended = () => (a.kind === 'interval' ? st.step >= st.events.length : st.answered);
  return {
    st,
    save: () => ({}),
    scene: () => (a.kind === 'interval' ? intervalScene() : st.memo ? graphScene() : treeScene()),
    boardOpt: () => ({ minScale: a.kind === 'grid' && !st.memo ? 0.42 : 0.7, maxScale: 1.2 }),
    note() {
      if (a.kind === 'interval') {
        const e = st.events[st.step - 1];
        if (!e) return '点「走一步」，看递归从右上角那一格开始问。黄框是正在问的格子，虚框是在等答案的格子。';
        if (e.t === 'enter') return `问${P.name(e.cell)}：它要先知道每个切分点左右两段的答案。`;
        if (e.t === 'hit') return `${P.name(e.cell)}已经${P.base(e.cell) !== null ? '不用算（单独一堆是 0）' : '算过了，直接拿来用'}。`;
        return `${P.name(e.cell)}算完了：${e.v}。它是第 ${e.order} 个算完的格子。`;
      }
      if (st.answered && a.memo && !st.memo) return `答案 ${root().value}，可一共问了 ${st.asked} 次。打开「记下来」，再问一遍。`;
      if (st.answered) return st.memo ? `答案 ${root().value}。表一共 ${P.size} 格，这次只问了 ${st.asked} 次。` : `答案 ${root().value}。表一共 ${P.size} 格，可一共问了 ${st.asked} 次：同一种颜色的问题被问了好几遍。`;
      return st.memo ? '点一个带问号的格子提问。箭头从被问的格子指向提问的格子；问过的格子记下来了，再被问到时直接拿答案（蓝色箭头）。' : '点一个带问号的圆圈提问：它会变成它需要的几个小问题。同一种颜色是同一个格子。';
    },
    after: () => (a.kind === 'interval' && ended() ? compare() : ''),
    panel() {
      if (a.kind === 'interval') {
        const q = L.question;
        return `<div class="pcard"><h3>递归<small>${Math.min(st.step, st.events.length)} / ${st.events.length} 步</small></h3><p>从右上角那一格（整排石子）开始问。每一格先问它每个切分点的左段和右段，问过的直接拿答案。格子角上的 #数字，是它<b>算完的先后</b>。</p></div>
          ${ended() ? `<div class="pcard"><h3>想一想</h3><p><b>${q.q}</b></p>${q.opts.map((o, k) => `<button class="qopt" type="button" data-act="answer" data-k="${k}">${o}</button>`).join('')}</div>` : ''}`;
      }
      const over = st.asked > P.size;
      return `<div class="pcard"><h3>提问次数</h3><div class="askn"><span class="bignum${over ? ' over' : ''}">${fmt(st.asked)}</span><span>表一共 <b>${P.size}</b> 格</span></div>${over ? '<p class="msg bad">问的次数已经超过表的格数了：好多问题你已经问过了。</p>' : ''}</div>
        ${a.memo ? `<div class="pcard"><div class="setrow plain"><div><b>记下来</b><p>问过的格子把答案记在表里，再被问到就不再往下问。切换会从头问起。</p></div><button class="switch" type="button" role="switch" aria-checked="${st.memo}" aria-label="记下来" data-act="memo"></button></div></div>` : ''}
        <div class="pcard"><h3>提问</h3><p>点棋盘上带问号的${st.memo ? '格子' : '圆圈'}，一个一个问；问累了，就让机器一口气问完。</p><div class="chips"><button class="chip" type="button" data-act="all"${pending().length ? '' : ' disabled'}>${ICON.play} 一口气问完</button><button class="chip ghost" type="button" data-act="again">从头再问</button></div></div>`;
    },
    dock() {
      if (a.kind === 'interval') return ended() ? { meta: '回答规则面板里的问题' } : { meta: `第 ${st.step} / ${st.events.length} 步`, sec: '走一步', secAct: 'step', go: rt.cur.running ? '跳过动画' : '自动走完', act: 'auto', busy: rt.cur.running };
      return { meta: `已经问了 <b>${st.asked}</b> 次 · 表 ${P.size} 格`, go: rt.cur.running ? '跳过动画' : '一口气问完', act: 'all', busy: rt.cur.running };
    },
    onCell(id) {
      if (rt.cur.running) return;
      const n = st.memo ? st.nodes.find(x => x.cell === id && !x.link) : st.nodes.find(x => x.id === id);
      if (!n || !open(n)) return;
      buzz(6);
      finish();
    },
    act(name, el) {
      if (name === 'all' || name === 'auto') { if (rt.cur.running) Anim.skip(); else if (name === 'all') openAll(); else play(true); return; }
      if (rt.cur.running) return;
      if (name === 'step') play(false);
      if (name === 'again') { restart(); rt.refresh(); }
      if (name === 'memo') { st.memo = !st.memo; restart(); buzz(6); rt.refresh(); }
      if (name === 'answer' && !st.done) {
        if (+el.dataset.k === L.question.a) { st.done = true; el.classList.add('right'); buzz(15); setTimeout(rt.pass, reduced() ? 0 : 500); }
        else { el.classList.remove('wrong'); void el.offsetWidth; el.classList.add('wrong'); buzz(20); }
      }
    },
  };
}
