// App shell: level map, level screen (mission, board, panel, dock), bottom sheets and boot.
// Game modes talk to the shell only through `rt` (runtime.js).

import { $, $$, reduced, buzz, sleep, ICON, toast } from './util.js';
import { sceneSVG, gridScene } from './svg.js';
import { routeSteps } from './algo.js';
import { rt, Anim } from './runtime.js';
import { S, save, resetAll } from './store.js';
import { LEVELS, CHAPTERS, PARTS } from './levels/index.js';
import { MODES } from './modes/index.js';

const hasPart = k => LEVELS.some(L => L.unlock === k && S.done[L.id]);
const isBlueprint = k => LEVELS.some(L => L.unlock === k && L.blueprint);

/* ================= level screen ================= */

function persist() { if (rt.cur) { S.data[rt.cur.L.id] = rt.cur.ctl.save(); save(); } }

function openLevel(i) {
  const L = LEVELS[i];
  rt.cur = { L, i, fails: 0, running: false, ctl: null };
  rt.cur.ctl = MODES[L.mode](L, S.data[L.id]);
  $('#map').hidden = true;
  $('#level').hidden = false;
  $('#lvCh').textContent = `第 ${L.ch + 1} 章 · ${CHAPTERS[L.ch].name}`;
  $('#lvTitle').textContent = `${i + 1}. ${L.title}`;
  refresh();
  $('#lvScroll').scrollTop = 0;
  if (!S.seen[L.id]) openIntro();
}

function leaveLevel() {
  if (rt.cur && rt.cur.running) Anim.skip();
  rt.cur = null;
  closeSheet();
  $('#level').hidden = true;
  $('#map').hidden = false;
  renderMap();
}

function renderMission() {
  const L = rt.cur.L, tip = rt.cur.ctl.tip ? rt.cur.ctl.tip() : null;
  $('#mission').innerHTML = `<div class="mrow"><span class="k">目标</span><p>${L.mission.goal}</p></div><div class="mrow"><span class="k">怎么玩</span><p>${L.mission.how}</p></div>${tip ? `<div class="tip"><b>提示</b><span>${tip.text}</span></div>` : ''}`;
}

function renderBoard() {
  const ctl = rt.cur.ctl;
  if (ctl.custom) $('#board').innerHTML = ctl.custom();
  else $('#board').innerHTML = sceneSVG(ctl.scene(), { label: '棋盘', ...(ctl.boardOpt ? ctl.boardOpt() : { maxScale: 1.25 }) });
  $('#bnote').textContent = ctl.note ? ctl.note() : '';
  $('#after').innerHTML = ctl.after ? ctl.after() : '';
}

function renderTests() {
  const ctl = rt.cur.ctl;
  $('#tests').innerHTML = ctl.tests ? ctl.tests().map((t, k) => `<button class="tchip" type="button" role="tab" aria-selected="${k === ctl.st.ti}" data-test="${k}"><span class="sd ${t.status || ''}"></span>${t.label}</button>`).join('') : '';
  $('#tests').hidden = !ctl.tests;
}

function renderDock() {
  const cur = rt.cur, d = cur.ctl.dock();
  if (d.pad) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    $('#dock').innerHTML = `<div class="pad"><div class="pad-top"><span><b>${cur.ctl.padTitle()}</b></span><div class="pad-val" aria-live="polite">${cur.ctl.st.input || '_'}</div></div>
      <div class="keys">${keys.map(k => `<button class="key" type="button" data-key="${k}">${k}</button>`).join('')}
      <button class="key wide" type="button" data-key="del">删除</button><button class="key" type="button" data-key="close" aria-label="收起键盘">收起</button><button class="key wide ok" type="button" data-key="ok">确定</button></div></div>`;
    return;
  }
  $('#dock').innerHTML = `<div class="dock-in"><div class="dmeta">${d.meta || ''}</div>
    ${d.sec ? `<button class="sec-btn" type="button" data-act="${d.secAct}">${d.sec}</button>` : ''}
    ${d.go ? `<button class="go${d.busy ? ' busy' : ''}${cur.L.coach && cur.L.coach(cur.ctl.st).run ? ' pulse' : ''}" type="button" data-act="${d.act}">${d.busy ? ICON.skip : d.goIcon || ICON.play}<span>${d.go}</span></button>` : ''}</div>`;
}

const FOCUS_KEYS = ['act', 'c', 'j', 'k', 'r', 'g', 's', 'o', 'p', 'n', 't', 'v', 'test'];
const focusSig = el => FOCUS_KEYS.map(k => el.dataset[k] || '').join('|');
function refresh() {
  const cur = rt.cur;
  if (!cur) return;
  const a = document.activeElement, sig = a && a.dataset && a.closest && a.closest('#panel, #board') && (a.dataset.act || a.dataset.test) ? focusSig(a) : null;
  renderMission();
  renderTests();
  renderBoard();
  $('#panel').innerHTML = cur.ctl.panel();
  if (cur.ctl.mounted) cur.ctl.mounted();
  renderDock();
  if (sig) { const el = $$('#panel [data-act], #board [data-act]').find(e => focusSig(e) === sig); if (el) el.focus({ preventScroll: true }); }
}
function refreshKeepRange() {
  renderBoard();
  $('#panel .pcard h3 small').textContent = `n = ${rt.cur.ctl.st.n}`;
  $('#whyQ').hidden = rt.cur.ctl.st.max < 30;
  renderDock();
}

function startRun() { rt.cur.running = true; Anim.begin(); renderDock(); if (matchMedia('(max-width: 899px)').matches) $('#bcard').scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); }
function endRun() { rt.cur.running = false; }

/* ================= sheets ================= */

let sheetActs = {};
function openSheet(html, acts = {}) {
  const root = $('#sheet');
  sheetActs = acts;
  $('#sheetBody').innerHTML = html;
  root.hidden = false;
  $('#sheetBody').scrollTop = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
  setTimeout(() => { const f = $('#sheetBody [data-primary]') || $('#sheetBody button:not(:disabled)'); if (f) f.focus({ preventScroll: true }); }, 80);
}
function closeSheet() {
  const root = $('#sheet');
  if (root.hidden) return;
  root.classList.remove('open');
  $('#sheetPanel').style.removeProperty('--dy');
  setTimeout(() => { if (!root.classList.contains('open')) root.hidden = true; }, reduced() ? 0 : 320);
}

function openIntro(page = 0) {
  const { L, i } = rt.cur, pages = L.intro, p = pages[page], last = page === pages.length - 1;
  openSheet(`<div><div class="kicker sig">第 ${i + 1} 关 · 原理 ${page + 1}/${pages.length}</div><h3 class="sh" id="sheetTitle">${L.title}</h3></div>
    ${p.fig ? `<div class="fig">${sceneSVG(p.fig, { pad: 12, maxScale: 1.3 })}</div>` : ''}
    <div class="prose"><p>${p.t}</p></div>
    <div class="dots" aria-hidden="true">${pages.map((_, k) => `<i class="${k === page ? 'on' : ''}"></i>`).join('')}</div>
    <div class="acts">${page ? '<button class="btn sec" type="button" data-act="prev">上一页</button>' : ''}<button class="btn pri" type="button" data-act="next" data-primary>${last ? '开始挑战' : '下一页'}</button></div>`, {
    prev: () => openIntro(page - 1),
    next: () => { if (last) { S.seen[L.id] = true; save(); closeSheet(); } else openIntro(page + 1); },
  });
}

function fail(x) {
  const cur = rt.cur;
  cur.fails++;
  buzz([30, 60, 30]);
  const L = cur.L, hint = x.hint !== undefined ? x.hint : L.hint ? L.hint() : null;
  const acts = x.cta ? { cta: () => { x.cta.fn(); closeSheet(); refresh(); } } : {};
  openSheet(`<div><div class="kicker bad">没通过</div><h3 class="sh" id="sheetTitle">${x.head}</h3></div>
    <div class="prose"><p>${x.body}</p></div>
    ${x.extra || ''}
    ${hint && cur.fails >= 2 ? `<p class="hint"><b>提示</b>${hint}</p>` : cur.fails < 2 && hint ? '<p class="msg">再失败一次，这里会出现提示。</p>' : ''}
    <div class="acts">${x.cta ? `<button class="btn pri" type="button" data-act="cta" data-primary>${x.cta.label}</button>` : ''}<button class="btn ${x.cta ? 'sec' : 'pri'}" type="button" data-close${x.cta ? '' : ' data-primary'}>回去改改</button></div>`, acts);
}

function partCard(k, tag) {
  const off = tag === '未获得';
  return `<div class="part${off ? ' off' : ''}"><span class="ic">${off ? ICON.lock : ICON.part}</span><small>${tag}</small><b>${PARTS[k].name}</b><span>${PARTS[k].desc}</span></div>`;
}

function pass() {
  const { L, i } = rt.cur, last = i === LEVELS.length - 1, fresh = L.unlock && !S.done[L.id];
  S.done[L.id] = true;
  save();
  buzz([15, 40, 15, 40, 60]);
  openSheet(`<div><div class="kicker good">第 ${i + 1} 关 · 完成</div><h3 class="sh" id="sheetTitle">${L.debrief.title}</h3></div>
    <div class="prose">${L.debrief.body.map(p => `<p>${p}</p>`).join('')}</div>
    <div class="note"><span>记进笔记本</span><p>${L.debrief.note}</p></div>
    ${L.unlock ? partCard(L.unlock, `${fresh ? '新零件' : '零件'}${isBlueprint(L.unlock) ? ' · 可以放上电路板' : ''}`) : ''}
    <div class="acts"><button class="btn sec" type="button" data-act="map">回到地图</button><button class="btn pri" type="button" data-act="next" data-primary>${last ? '完成' : '下一关'}</button></div>`, {
    map: () => leaveLevel(),
    next: () => { if (last) leaveLevel(); else { closeSheet(); openLevel(i + 1); } },
  });
}

function openParts() {
  openSheet(`<div><div class="kicker sig">零件箱</div><h3 class="sh" id="sheetTitle">造出来的东西会变成零件</h3></div>
    <div class="prose"><p>就像《图灵完备》里先造加法器、再用加法器造 CPU，这里拼好的电路板会变成元件，直接放上后面关卡的电路板。</p></div>
    <div class="list">${Object.keys(PARTS).map(k => partCard(k, hasPart(k) ? `已获得${isBlueprint(k) ? ' · 可以放上电路板' : ''}` : '未获得')).join('')}</div>
    <div class="acts"><button class="btn sec" type="button" data-close>关闭</button></div>`);
}

function openNotes() {
  const done = LEVELS.filter(L => S.done[L.id]);
  openSheet(`<div><div class="kicker sig">笔记本</div><h3 class="sh" id="sheetTitle">每关一句话</h3></div>
    <div class="list">${done.length ? done.map(L => `<div class="nrow"><span class="eyebrow">第 ${LEVELS.indexOf(L) + 1} 关 · ${L.title}</span><p>${L.debrief.note}</p></div>`).join('') : '<div class="empty">还没有笔记。通过一关后，这一关的核心想法会记在这里。</div>'}</div>
    <div class="acts"><button class="btn sec" type="button" data-close>关闭</button></div>`);
}

function openSettings() {
  openSheet(`<div><div class="kicker sig">设置</div><h3 class="sh" id="sheetTitle">试玩选项</h3></div>
    <div class="setrow"><div><b>解锁全部关卡</b><p>可以直接跳到任意一关。</p></div><button class="switch" type="button" role="switch" aria-checked="${S.all}" aria-label="解锁全部关卡" data-act="all"></button></div>
    <div class="setrow"><div><b>清空进度</b><p>关卡进度、零件、笔记和每块电路板都会被清空。</p></div><button class="danger" type="button" data-act="reset">清空</button></div>
    <div class="acts"><button class="btn sec" type="button" data-close>关闭</button></div>`, {
    all: el => { S.all = !S.all; save(); el.setAttribute('aria-checked', String(S.all)); renderMap(); },
    reset: el => {
      if (!el.classList.contains('armed')) { el.classList.add('armed'); el.textContent = '再点一次确认'; return; }
      resetAll();
      closeSheet();
      renderMap();
      toast('进度已清空');
    },
  });
}

function wireSheetDrag() {
  const panel = $('#sheetPanel'), grab = $('#grab');
  let y0 = null, dy = 0;
  grab.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; panel.classList.add('dragging'); grab.setPointerCapture(e.pointerId); });
  grab.addEventListener('pointermove', e => { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); panel.style.setProperty('--dy', `${dy}px`); });
  const end = () => { if (y0 === null) return; y0 = null; panel.classList.remove('dragging'); if (dy > 90) closeSheet(); else panel.style.removeProperty('--dy'); };
  grab.addEventListener('pointerup', end);
  grab.addEventListener('pointercancel', end);
}

/* ================= map ================= */

function status(i) {
  if (S.done[LEVELS[i].id]) return 'done';
  if (i === 0 || S.all || S.done[LEVELS[i - 1].id]) return 'open';
  return 'locked';
}

function renderMap() {
  const next = LEVELS.findIndex((_, i) => status(i) === 'open');
  $('#chapters').innerHTML = CHAPTERS.map((ch, c) => `<section class="chapter"><div class="ch-head"><span class="ch-num">第 ${c + 1} 章</span><h2>${ch.name}</h2><p>${ch.desc}</p></div>
    <div class="lgrid">${LEVELS.map((L, i) => [L, i]).filter(([L]) => L.ch === c).map(([L, i]) => {
      const st = status(i);
      return `<button class="lcard ${st}${i === next ? ' next' : ''}" type="button" data-level="${i}" ${st === 'locked' ? 'aria-disabled="true"' : ''}>
        <span class="no">第 ${i + 1} 关${L.mode === 'circuit' ? ' · 电路板' : ''}</span><span class="tt">${L.title}</span><span class="ds">${L.short}</span>
        ${L.unlock ? `<span class="pt">产出零件 · ${PARTS[L.unlock].name}</span>` : ''}
        <span class="st">${st === 'done' ? '已完成' : i === next ? '下一关' : st === 'locked' ? '未解锁' : '可挑战'}</span></button>`;
    }).join('')}</div></section>`).join('');
  $('#partCount').textContent = `${Object.keys(PARTS).filter(hasPart).length}/${Object.keys(PARTS).length}`;
  $('#noteCount').textContent = String(LEVELS.filter(L => S.done[L.id]).length);
  $('#banner').innerHTML = LEVELS.every(L => S.done[L.id]) ? '<div class="banner"><b>全部通关</b><span>只看最后一步，用小问题的答案拼出大问题，按顺序记在表里，绝不重复计算。这就是动态规划。</span></div>' : '';
}

async function heroLoop() {
  const R = 3, C = 5, steps = routeSteps(R, C, 'colL'), el = $('#heroBoard');
  const draw = k => {
    const shown = new Map(steps.slice(0, k).map(s => [s.id, s.v])), now = steps[k - 1], live = now && k < steps.length;
    const sc = gridScene(R, C, {
      cell: (r, c) => { const id = `${r},${c}`; return { value: shown.has(id) ? shown.get(id) : '', cls: live && now.id === id ? 'hot' : shown.has(id) ? 'lit' : '' }; },
      edge: (a, b) => (live && now.id === b ? 'hot' : 'dim'),
    });
    el.innerHTML = sceneSVG(sc, { pad: 8, label: '路线数随着箭头从左上流到右下' });
  };
  if (reduced()) { draw(steps.length); return; }
  for (;;) {
    if ($('#map').hidden) { await sleep(1000); continue; }
    for (let k = 0; k <= steps.length; k++) { draw(k); await sleep(k === 0 ? 600 : 330); }
    await sleep(3200);
  }
}

/* ================= boot ================= */

Object.assign(rt, { refresh, refreshKeepRange, renderBoard, persist, pass, fail, startRun, endRun, openSheet, closeSheet });

function boot() {
  $('#btnBack').innerHTML = ICON.back;
  $('#btnSettings').innerHTML = ICON.gear;
  $('#chapters').addEventListener('click', e => {
    const b = e.target.closest('[data-level]');
    if (!b) return;
    const i = +b.dataset.level;
    if (status(i) === 'locked') { toast('先通过上一关，或在设置里解锁全部关卡'); buzz(15); return; }
    openLevel(i);
  });
  $('#btnParts').addEventListener('click', openParts);
  $('#btnNotes').addEventListener('click', openNotes);
  $('#btnSettings').addEventListener('click', openSettings);
  $('#btnBack').addEventListener('click', leaveLevel);
  $('#btnIntro').addEventListener('click', () => openIntro(0));
  const onAct = e => { const a = e.target.closest('[data-act]'); if (a && rt.cur && rt.cur.ctl.act && !a.disabled) rt.cur.ctl.act(a.dataset.act, a); };
  const onCell = e => { const g = e.target.closest('[data-cell]'); if (g && rt.cur && rt.cur.ctl.onCell) rt.cur.ctl.onCell(g.dataset.cell); };
  $('#board').addEventListener('click', e => { if (e.target.closest('[data-cell]')) onCell(e); else onAct(e); });
  $('#board').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCell(e); } });
  $('#tests').addEventListener('click', e => { const b = e.target.closest('[data-test]'); if (b && !rt.cur.running) rt.cur.ctl.selectTest(+b.dataset.test); });
  $('#panel').addEventListener('click', onAct);
  $('#panel').addEventListener('input', e => { if (e.target.id === 'nRange' && rt.cur.ctl.input) rt.cur.ctl.input(+e.target.value); });
  new ResizeObserver(() => { if (rt.cur && rt.cur.ctl.mounted) rt.cur.ctl.mounted(); }).observe($('#panel'));
  $('#dock').addEventListener('click', e => {
    const k = e.target.closest('[data-key]');
    if (k) { if (k.dataset.key === 'close') { rt.cur.ctl.st.sel = null; refresh(); } else rt.cur.ctl.key(k.dataset.key); return; }
    onAct(e);
  });
  document.addEventListener('keydown', e => {
    const cur = rt.cur;
    if (e.key === 'Escape') { if (!$('#sheet').hidden) closeSheet(); else if (cur) leaveLevel(); return; }
    if (cur && cur.ctl.key && cur.ctl.st.sel && $('#sheet').hidden && !e.target.closest('button,input')) {
      if (/^[0-9]$/.test(e.key)) cur.ctl.key(e.key);
      else if (e.key === 'Backspace') cur.ctl.key('del');
      else if (e.key === 'Enter') cur.ctl.key('ok');
    }
  });
  $('#sheet').addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { closeSheet(); return; }
    const a = e.target.closest('[data-act]');
    if (a && sheetActs[a.dataset.act]) sheetActs[a.dataset.act](a);
  });
  wireSheetDrag();
  renderMap();
  heroLoop();
}

boot();
