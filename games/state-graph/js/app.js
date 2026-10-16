// App shell: level map, level screen (brief, board, panel, dock), level rail, sheets and boot.
// Game modes talk to the shell only through `rt` (runtime.js). From 1100px the level screen is a workbench:
// brief on the left, the mode's main pane in the middle (the board, or the panel when `ctl.panelStage`), the rest on the right.

import { $, $$, reduced, buzz, sleep, ICON, toast, wide } from './util.js';
import { sceneSVG, gridScene } from './svg.js';
import { routeSteps } from './algo.js';
import { rt, Anim } from './runtime.js';
import { S, save, resetAll } from './store.js';
import { LEVELS, CHAPTERS, PARTS } from './levels/index.js';
import { MODES } from './modes/index.js';
import { initTheme, paintTheme } from './theme.js';
import { tr, initLang } from './i18n.js';
import { enableDrag } from '../../kit/drag.js';

const docked = matchMedia('(min-width: 1500px)');
const RAIL = 'state-graph-rail';
let railOpen = (() => { try { return localStorage.getItem(RAIL) !== '0'; } catch (e) { return true; } })() && docked.matches;

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
  paintLevelHead();
  $('#level').classList.toggle('panel-stage', !!rt.cur.ctl.panelStage);
  if (!docked.matches) railOpen = false;
  renderRail();
  refresh();
  $$('#lvScroll, #brief, #bcard, #panel').forEach(el => { el.scrollTop = 0; });
  if (!S.seen[L.id]) openIntro();
}

function paintLevelHead() {
  const { L, i } = rt.cur;
  $('#lvCh').textContent = tr(`第 ${L.ch + 1} 章 · ${CHAPTERS[L.ch].name}`, `Chapter ${L.ch + 1} · ${CHAPTERS[L.ch].name}`);
  $('#lvTitle').textContent = `${i + 1}. ${L.title}`;
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
  const { L, i } = rt.cur, tip = rt.cur.ctl.tip ? rt.cur.ctl.tip() : null;
  $('#mission').innerHTML = `<header class="bhead"><span class="eyebrow">${tr(`第 ${i + 1} 关`, `Level ${i + 1}`)} · ${CHAPTERS[L.ch].name}</span><h1>${L.title}</h1></header><div class="mrow"><span class="k">${tr('目标', 'Goal')}</span><p>${L.mission.goal}</p></div><div class="mrow"><span class="k">${tr('怎么玩', 'How to play')}</span><p>${L.mission.how}</p></div>${tip ? `<div class="tip"><b>${tr('提示', 'Tip')}</b><span>${tip.text}</span></div>` : ''}`;
}

function renderBoard() {
  const ctl = rt.cur.ctl;
  if (ctl.custom) $('#board').innerHTML = ctl.custom();
  else $('#board').innerHTML = sceneSVG(ctl.scene(), { label: tr('棋盘', 'Board'), ...(ctl.boardOpt ? ctl.boardOpt() : { maxScale: 1.25 }) });
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
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], extra = cur.ctl.padExtra ? cur.ctl.padExtra() : null;
    $('#dock').innerHTML = `<div class="pad"><div class="pad-top"><span><b>${cur.ctl.padTitle()}</b></span><div class="pad-val" aria-live="polite">${cur.ctl.st.input || '_'}</div></div>
      <div class="keys">${keys.map(k => `<button class="key" type="button" data-key="${k}">${k}</button>`).join('')}
      <button class="key wide" type="button" data-key="del">${tr('删除', 'Delete')}</button><button class="key" type="button" data-key="close" aria-label="${tr('收起键盘', 'Hide keypad')}">${tr('收起', 'Hide')}</button><button class="key wide ok" type="button" data-key="ok">${tr('确定', 'OK')}</button>${extra ? `<button class="key full" type="button" data-key="${extra.key}">${extra.label}</button>` : ''}</div></div>`;
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
  // On a desktop the robot's window sits in the side column, under the test board.
  $('#view').innerHTML = cur.ctl.sideView && wide() ? '<aside class="cview" id="cview"></aside>' : '';
  renderBoard();
  $('#panel').innerHTML = cur.ctl.panel();
  $('#parts').innerHTML = cur.ctl.parts ? cur.ctl.parts() : '';
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

function startRun() { rt.cur.running = true; Anim.begin(); renderDock(); if (!wide()) $('#bcard').scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); }
function endRun() { rt.cur.running = false; }

/* ================= level rail ================= */

function renderRail() {
  const here = rt.cur ? rt.cur.i : -1;
  $('#level').classList.toggle('rail-open', railOpen);
  $('#btnRail').setAttribute('aria-expanded', String(railOpen));
  if (!railOpen) return;
  $('#rail').innerHTML = `<div class="rail-head"><b>${tr('关卡', 'Levels')}</b><small>${LEVELS.filter(L => S.done[L.id]).length} / ${LEVELS.length}</small></div>
    <div class="rail-list">${CHAPTERS.map((ch, c) => `<section class="rail-ch${rt.cur && rt.cur.L.ch === c ? ' here' : ''}"><h3><span>${c + 1}</span>${ch.name}</h3><ol>${LEVELS.map((L, i) => [L, i]).filter(([L]) => L.ch === c).map(([L, i]) => {
      const st = status(i);
      return `<li><button class="rail-lv ${st}${i === here ? ' here' : ''}" type="button" data-rail="${i}" ${st === 'locked' ? 'disabled' : ''}${i === here ? ' aria-current="page"' : ''}><i class="pad">${st === 'done' ? ICON.check : st === 'locked' ? ICON.lock : ''}</i><span class="no">${i + 1}</span><span class="tt">${L.title}</span>${L.mode === 'circuit' ? `<span class="kind" title="${tr('电路板', 'Circuit board')}">${ICON.wire}</span>` : ''}</button></li>`;
    }).join('')}</ol></section>`).join('')}</div>`;
  const cur = $('#rail .here');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}

function toggleRail(open = !railOpen) {
  railOpen = open;
  if (docked.matches) { try { localStorage.setItem(RAIL, open ? '1' : '0'); } catch (e) { /* storage unavailable */ } }
  renderRail();
  if (rt.cur && rt.cur.ctl.mounted) requestAnimationFrame(() => rt.cur && rt.cur.ctl.mounted());
}

/* ================= sheets ================= */

let sheetActs = {}, sheetRedraw = null;
/** Open a sheet; `redraw` draws it again in the other language when the player switches while it is open. */
function openSheet(html, acts = {}, redraw = null) {
  const root = $('#sheet');
  sheetActs = acts;
  sheetRedraw = redraw;
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
  openSheet(`<div><div class="kicker sig">${tr(`第 ${i + 1} 关 · 引入 ${page + 1}/${pages.length}`, `Level ${i + 1} · Intro ${page + 1}/${pages.length}`)}</div><h3 class="sh" id="sheetTitle">${L.title}</h3></div>
    ${p.fig ? `<div class="fig">${sceneSVG(p.fig, { pad: 12, maxScale: 1.3 })}</div>` : ''}
    <div class="prose"><p>${p.t}</p></div>
    <div class="dots" aria-hidden="true">${pages.map((_, k) => `<i class="${k === page ? 'on' : ''}"></i>`).join('')}</div>
    <div class="acts">${page ? `<button class="btn sec" type="button" data-act="prev">${tr('上一页', 'Back')}</button>` : ''}<button class="btn pri" type="button" data-act="next" data-primary>${last ? tr('开始挑战', 'Start') : tr('下一页', 'Next')}</button></div>`, {
    prev: () => openIntro(page - 1),
    next: () => { if (last) { S.seen[L.id] = true; save(); closeSheet(); } else openIntro(page + 1); },
  }, () => openIntro(page));
}

function fail(x) {
  rt.cur.fails++;
  buzz([30, 60, 30]);
  showFail(x);
}
function showFail(x) {
  const cur = rt.cur, L = cur.L, hint = x.hint !== undefined ? x.hint : L.hint ? L.hint() : null;
  const acts = x.cta ? { cta: () => { x.cta.fn(); closeSheet(); refresh(); } } : {};
  openSheet(`<div><div class="kicker bad">${tr('没通过', 'Not yet')}</div><h3 class="sh" id="sheetTitle">${x.head}</h3></div>
    <div class="prose"><p>${x.body}</p></div>
    ${x.extra || ''}
    ${hint && cur.fails >= 2 ? `<p class="hint"><b>${tr('提示', 'Hint')}</b>${hint}</p>` : cur.fails < 2 && hint ? `<p class="msg">${tr('再失败一次，这里会出现提示。', 'Miss once more and a hint will appear here.')}</p>` : ''}
    <div class="acts">${x.cta ? `<button class="btn pri" type="button" data-act="cta" data-primary>${x.cta.label}</button>` : ''}<button class="btn ${x.cta ? 'sec' : 'pri'}" type="button" data-close${x.cta ? '' : ' data-primary'}>${tr('回去改改', 'Keep working')}</button></div>`, acts, () => showFail(x));
}

function partCard(k, tag, off = false) {
  return `<div class="part${off ? ' off' : ''}"><span class="ic">${off ? ICON.lock : ICON.part}</span><small>${tag}</small><b>${PARTS[k].name}</b><span>${PARTS[k].desc}</span></div>`;
}

function pass() {
  const { L } = rt.cur, fresh = L.unlock && !S.done[L.id];
  S.done[L.id] = true;
  save();
  renderRail();
  buzz([15, 40, 15, 40, 60]);
  showPass(fresh);
}
function showPass(fresh) {
  const { L, i } = rt.cur, last = i === LEVELS.length - 1;
  openSheet(`<div><div class="kicker good">${tr(`第 ${i + 1} 关 · 完成`, `Level ${i + 1} · Complete`)}</div><h3 class="sh" id="sheetTitle">${L.debrief.title}</h3></div>
    <div class="prose">${L.debrief.body.map(p => `<p>${p}</p>`).join('')}</div>
    <div class="note"><span>${tr('记进笔记本', 'Into the notebook')}</span><p>${L.debrief.note}</p></div>
    ${L.unlock ? partCard(L.unlock, `${fresh ? tr('新零件', 'New part') : tr('零件', 'Part')}${isBlueprint(L.unlock) ? tr(' · 可以放上电路板', ' · goes on circuit boards') : ''}`) : ''}
    <div class="acts"><button class="btn sec" type="button" data-act="map">${tr('回到地图', 'Back to map')}</button><button class="btn pri" type="button" data-act="next" data-primary>${last ? tr('完成', 'Finish') : tr('下一关', 'Next level')}</button></div>`, {
    map: () => leaveLevel(),
    next: () => { if (last) leaveLevel(); else { closeSheet(); openLevel(i + 1); } },
  }, () => showPass(fresh));
}

function openParts() {
  openSheet(`<div><div class="kicker sig">${tr('零件箱', 'Parts')}</div><h3 class="sh" id="sheetTitle">${tr('造出来的东西会变成零件', 'What you build becomes a part')}</h3></div>
    <div class="prose"><p>${tr('就像《图灵完备》里先造加法器、再用加法器造 CPU，这里拼好的电路板会变成元件，直接放上后面关卡的电路板。', 'Just as in <i>Turing Complete</i> you build an adder first and then build a CPU out of adders, every board you finish here becomes a component you can drop straight onto the boards of later levels.')}</p></div>
    <div class="list">${Object.keys(PARTS).map(k => (hasPart(k) ? partCard(k, `${tr('已获得', 'Collected')}${isBlueprint(k) ? tr(' · 可以放上电路板', ' · goes on circuit boards') : ''}`) : partCard(k, tr('未获得', 'Not yet collected'), true))).join('')}</div>
    <div class="acts"><button class="btn sec" type="button" data-close>${tr('关闭', 'Close')}</button></div>`, {}, openParts);
}

function openNotes() {
  const done = LEVELS.filter(L => S.done[L.id]);
  openSheet(`<div><div class="kicker sig">${tr('笔记本', 'Notebook')}</div><h3 class="sh" id="sheetTitle">${tr('每关一句话', 'One line per level')}</h3></div>
    <div class="list">${done.length ? done.map(L => `<div class="nrow"><span class="eyebrow">${tr(`第 ${LEVELS.indexOf(L) + 1} 关`, `Level ${LEVELS.indexOf(L) + 1}`)} · ${L.title}</span><p>${L.debrief.note}</p></div>`).join('') : `<div class="empty">${tr('还没有笔记。通过一关后，这一关的核心想法会记在这里。', 'No notes yet. Each time you clear a level, its key idea is written down here.')}</div>`}</div>
    <div class="acts"><button class="btn sec" type="button" data-close>${tr('关闭', 'Close')}</button></div>`, {}, openNotes);
}

function openSettings() {
  openSheet(`<div><div class="kicker sig">${tr('设置', 'Settings')}</div><h3 class="sh" id="sheetTitle">${tr('试玩选项', 'Play options')}</h3></div>
    <div class="setrow"><div><b>${tr('解锁全部关卡', 'Unlock every level')}</b><p>${tr('可以直接跳到任意一关。', 'Jump straight to any level.')}</p></div><button class="switch" type="button" role="switch" aria-checked="${S.all}" aria-label="${tr('解锁全部关卡', 'Unlock every level')}" data-act="all"></button></div>
    <div class="setrow"><div><b>${tr('清空进度', 'Reset progress')}</b><p>${tr('关卡进度、零件、笔记和每块电路板都会被清空。', 'Clears your level progress, parts, notes and every circuit board.')}</p></div><button class="danger" type="button" data-act="reset">${tr('清空', 'Reset')}</button></div>
    <div class="acts"><button class="btn sec" type="button" data-close>${tr('关闭', 'Close')}</button></div>`, {
    all: el => { S.all = !S.all; save(); el.setAttribute('aria-checked', String(S.all)); renderMap(); },
    reset: el => {
      if (!el.classList.contains('armed')) { el.classList.add('armed'); el.textContent = tr('再点一次确认', 'Click again to confirm'); return; }
      resetAll();
      closeSheet();
      renderMap();
      toast(tr('进度已清空', 'Progress cleared'));
    },
  }, openSettings);
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
  $('#chapters').innerHTML = CHAPTERS.map((ch, c) => `<section class="chapter"><div class="ch-head"><span class="ch-num">${tr(`第 ${c + 1} 章`, `Chapter ${c + 1}`)}</span><h2>${ch.name}</h2><p>${ch.desc}</p></div>
    <div class="lgrid">${LEVELS.map((L, i) => [L, i]).filter(([L]) => L.ch === c).map(([L, i]) => {
      const st = status(i);
      return `<button class="lcard ${st}${i === next ? ' next' : ''}" type="button" data-level="${i}" ${st === 'locked' ? 'aria-disabled="true"' : ''}>
        <span class="no">${tr(`第 ${i + 1} 关`, `Level ${i + 1}`)}${L.mode === 'circuit' ? tr(' · 电路板', ' · circuit') : ''}</span><span class="tt">${L.title}</span><span class="ds">${L.short}</span>
        ${L.unlock ? `<span class="pt">${tr('产出零件', 'Yields part')} · ${PARTS[L.unlock].name}</span>` : ''}
        <span class="st">${st === 'done' ? tr('已完成', 'Done') : i === next ? tr('下一关', 'Next') : st === 'locked' ? tr('未解锁', 'Locked') : tr('可挑战', 'Open')}</span></button>`;
    }).join('')}</div></section>`).join('');
  $('#partCount').textContent = `${Object.keys(PARTS).filter(hasPart).length}/${Object.keys(PARTS).length}`;
  $('#noteCount').textContent = String(LEVELS.filter(L => S.done[L.id]).length);
  $('#banner').innerHTML = LEVELS.every(L => S.done[L.id]) ? `<div class="banner"><b>${tr('全部通关', 'All levels cleared')}</b><span>${tr('只看最后一步，用小问题的答案拼出大问题，按顺序记在表里，绝不重复计算。这就是动态规划。', 'Look only at the last step, build the big answer out of the small ones, record them in order in a table, and never compute anything twice. That is dynamic programming.')}</span></div>` : '';
}

async function heroLoop() {
  const R = 3, C = 5, steps = routeSteps(R, C, 'colL'), el = $('#heroBoard');
  const draw = k => {
    const shown = new Map(steps.slice(0, k).map(s => [s.id, s.v])), now = steps[k - 1], live = now && k < steps.length;
    const sc = gridScene(R, C, {
      cell: (r, c) => { const id = `${r},${c}`; return { value: shown.has(id) ? shown.get(id) : '', cls: live && now.id === id ? 'hot' : shown.has(id) ? 'lit' : '' }; },
      edge: (a, b) => (live && now.id === b ? 'hot' : 'dim'),
    });
    el.innerHTML = sceneSVG(sc, { pad: 8, label: tr('路线数随着箭头从左上流到右下', 'Route counts flowing along the arrows from the top left to the bottom right') });
  };
  if (reduced()) { draw(steps.length); return; }
  for (;;) {
    if ($('#map').hidden) { await sleep(1000); continue; }
    for (let k = 0; k <= steps.length; k++) { draw(k); await sleep(k === 0 ? 600 : 330); }
    await sleep(3200);
  }
}

/* ================= boot ================= */

/** The player switched language: redraw what is on screen. The open level, its board and any sheet stay as they are. */
function relang() {
  paintTheme();
  renderMap();
  if (rt.cur) { paintLevelHead(); renderRail(); refresh(); }
  if (!$('#sheet').hidden && $('#sheet').classList.contains('open') && sheetRedraw) {
    const y = $('#sheetBody').scrollTop;
    sheetRedraw();
    $('#sheetBody').scrollTop = y;
  }
}

Object.assign(rt, { refresh, refreshKeepRange, renderBoard, persist, pass, fail, startRun, endRun, openSheet, closeSheet });

function boot() {
  $('#btnBack').innerHTML = ICON.back;
  $('#btnSettings').innerHTML = ICON.gear;
  $('#chapters').addEventListener('click', e => {
    const b = e.target.closest('[data-level]');
    if (!b) return;
    const i = +b.dataset.level;
    if (status(i) === 'locked') { toast(tr('先通过上一关，或在设置里解锁全部关卡', 'Clear the previous level first, or unlock every level in Settings')); buzz(15); return; }
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
  $('#after').addEventListener('click', onAct);
  $('#view').addEventListener('click', onAct);
  $('#panel').addEventListener('input', e => { if (e.target.id === 'nRange' && rt.cur.ctl.input) rt.cur.ctl.input(+e.target.value); });
  new ResizeObserver(() => { if (rt.cur && rt.cur.ctl.mounted) rt.cur.ctl.mounted(); }).observe($('#panel'));
  $('#dock').addEventListener('click', e => {
    const k = e.target.closest('[data-key]');
    if (k) { if (k.dataset.key === 'close') { rt.cur.ctl.st.sel = null; refresh(); } else rt.cur.ctl.key(k.dataset.key); return; }
    onAct(e);
  });
  document.addEventListener('keydown', e => {
    const cur = rt.cur;
    if (e.key === 'Escape') {
      if (!$('#sheet').hidden) closeSheet();
      else if (railOpen && !docked.matches) toggleRail(false);
      else if (cur && cur.ctl.cancel) cur.ctl.cancel();
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && cur && cur.ctl.remove && !cur.ctl.st.sel && $('#sheet').hidden && !e.target.closest('input,textarea')) {
      if (cur.ctl.remove()) e.preventDefault();
      return;
    }
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
  $('#btnRail').innerHTML = ICON.rail;
  $('#btnRail').addEventListener('click', () => toggleRail());
  $('#railScrim').addEventListener('click', () => toggleRail(false));
  $('#rail').addEventListener('click', e => {
    const b = e.target.closest('[data-rail]');
    if (!b) return;
    if (!docked.matches) railOpen = false;
    if (rt.cur && rt.cur.running) Anim.skip();
    closeSheet();
    openLevel(+b.dataset.rail);
  });
  $('#parts').addEventListener('click', onAct);
  enableDrag($('#level'), () => (rt.cur && rt.cur.ctl.dnd) || null);
  docked.addEventListener('change', () => { if (!docked.matches) railOpen = false; renderRail(); });
  matchMedia('(min-width: 1100px)').addEventListener('change', () => { if (rt.cur) refresh(); });
  initTheme();
  initLang(relang);
  wireSheetDrag();
  renderMap();
  heroLoop();
}

boot();
