// What content shows under a test board (vocabulary.js panel), why a failure went wrong (explain), and the markup a
// failure that is a stage's lesson shows (a stage's onFail). Each returns HTML in the current language.

import { callOf } from '../../../engine/schema.js';
import { tr } from '../lang.js';
import { editTable, editTrace, knapTrace, lcsTable, lcsTrace, localTrace } from '../model/algo.js';
import { TAG, bestTags } from '../model/worlds/tags.js';

const passed = view => !!view && view.end && view.pass;
const box = (eyebrow, inner, cap = '') => `<div class="afterbox"><span class="eyebrow">${eyebrow}</span>${inner}${cap ? `<p class="cap">${cap}</p>` : ''}</div>`;
const letters = (s, on) => `<div class="diff">${[...s].map((ch, k) => `<span class="dt${on.has(k) ? ' ins' : ''}">${ch}</span>`).join('')}</div>`;

/**
 * Panels: (params, t, view, st) → HTML. `view` is the run shown on the board (null before one), `st` the level's
 * state (st.status: each test's verdict).
 */
const PANELS = {
  lcs(_, t, view) {
    if (!passed(view)) return '';
    const { pairs } = lcsTrace(t.top, t.left, lcsTable(t.top, t.left));
    return box(tr('表格里藏着的连线', 'The lines hidden in the table'), letters(t.top, new Set(pairs.map(p => p[0]))) + letters(t.left, new Set(pairs.map(p => p[1]))),
      `${tr('从右下角沿绿色格子倒推，每走一次对角线，就是一根连线。公共子序列：', 'Walk back from the bottom-right corner along the green cells: every diagonal step is one line. Common subsequence: ')}<b>${pairs.map(p => t.top[p[0]]).join(' ')}</b>`);
  },
  edit(_, t, view) {
    if (!passed(view)) return '';
    const { ops } = editTrace(t.left, t.top, editTable(t.left, t.top)), n = ops.filter(o => o.k !== 'keep').length;
    const tile = o => (o.k === 'keep' ? `<span class="dt">${o.a}<small>${tr('保留', 'keep')}</small></span>` : o.k === 'rep' ? `<span class="dt rep">${o.a}→${o.b}<small>${tr('替换', 'replace')}</small></span>` : o.k === 'del' ? `<span class="dt del"><s>${o.a}</s><small>${tr('删除', 'delete')}</small></span>` : `<span class="dt ins">+${o.b}<small>${tr('插入', 'insert')}</small></span>`);
    return box(tr(`表格倒推出的改法 · ${n} 步`, `The edits traced back from the table · ${n} step${n === 1 ? '' : 's'}`), `<div class="diff">${ops.map(tile).join('')}</div>`,
      tr('从右下角倒推：走对角线是保留或替换，往上是删除，往左是插入。', 'Walking back from the bottom-right corner: a diagonal step is a keep or a replace, a step up is a delete, and a step left is an insert.'));
  },
  spell({ candidates }, t, view, st) {
    if (!passed(view) || st.status.some(x => x !== 'pass')) return '';
    const rows = candidates.map(top => ({ top, d: editTable(t.left, top)[t.left.length][top.length] })).sort((a, b) => a.d - b.d);
    return box(tr('候选词 · 按步数排', 'Candidates · by number of steps'), `<div class="diff">${rows.map((x, k) => `<span class="dt${k ? '' : ' ins'}">${x.top}<small>${tr(`${x.d} 步`, `${x.d} step${x.d === 1 ? '' : 's'}`)}</small></span>`).join('')}</div>`,
      tr(`最近的是 <b>${rows[0].top}</b>：输入法就会问你「是不是想打 ${rows[0].top}」。`, `The closest is <b>${rows[0].top}</b>, so your keyboard would ask “Did you mean ${rows[0].top}?”`));
  },
  local(_, t, view) {
    if (!passed(view)) return '';
    const { okTop, okLeft } = localTrace(t);
    return box(tr('最像的一段', 'The most alike stretch'), letters(t.top, okTop) + letters(t.left, okLeft), tr('从最大的那一格倒推，一直退到 0 为止。', 'Traced back from the largest cell until the score drops to 0.'));
  },
  tags(_, t, view) {
    if (!passed(view)) return '';
    const b = bestTags(t);
    return box(tr(`表倒推出的标法 · 代价 ${b.cost}`, `Tagging traced back from the table · cost ${b.cost}`), `<div class="diff">${t.words.map((w, k) => `<span class="dt ins">${w}<small>${TAG[b.tags[k]].n}</small></span>`).join('')}</div>`, t.note ? String(t.note) : '');
  },
  knap(_, t, view) {
    if (!passed(view)) return '';
    const chosen = knapTrace(t).picked.map(k => t.items[k]), kg = chosen.reduce((s, it) => s + it.w, 0), value = chosen.reduce((s, it) => s + it.v, 0);
    return box(tr('倒推出的装法', 'The packing, traced back'), `<div class="diff">${chosen.map(it => `<span class="dt ins">${it.n}<small>${it.w} kg · ${it.v}</small></span>`).join('')}</div>`, tr(`一共 ${kg} kg，价值 <b>${value}</b>。`, `${kg} kg in all, value <b>${value}</b>.`));
  },
  roll(_, t, view) {
    const on = view && !view.end && view.k ? view.res.steps[view.k - 1].cell.item : -1;
    return box(`${tr('物品', 'Items')} · ${t.kind === '01' ? tr('每件最多拿一次', 'each at most once') : tr('每件可以拿很多次', 'each as many times as you like')}`, `<div class="diff">${t.items.map((it, k) => `<span class="dt${k === on ? ' on' : ''}">${it.n}<small>${it.w} kg · ${it.v}</small></span>`).join('')}</div>`);
  },
  /** The dictionary of a cutting level: its words, at their costs when they have any, and what a lone letter costs. */
  dictionary(_, t) {
    const costs = !Array.isArray(t.dict), words = costs ? Object.entries(t.dict) : t.dict.map(w => [w]);
    return box(costs ? tr('词典 · 代价', 'Dictionary · cost') : tr('词典', 'Dictionary'), `<div class="diff">${words.map(([w, c]) => `<span class="dt">${w}${c === undefined ? '' : ` · ${c}`}</span>`).join('')}${t.letter !== undefined ? `<span class="dt">${tr(`单个字母 · ${t.letter}`, `a single letter · ${t.letter}`)}</span>` : ''}</div>`);
  },
  /** One cell a house cannot tell two histories apart: the first three houses of test `t`'s street. */
  robConflict(_, t) {
    const a = t.a;
    const tile = (j, on, ask) => `<span class="hs${on ? ' on' : ''}${ask ? ' ask' : ''}">${a[j]}<small>${tr(`${j + 1}号`, `#${j + 1}`)}</small></span>`;
    return `<div class="cx"><div class="kicker bad">${tr('反例', 'Counterexample')}</div>
    <p class="cx-p">${tr('看第 1 条街的前两家。下面两段历史走到 2 号时，在一行的机器里落进<b>同一个格子</b>：', 'Look at the first two houses on street 1. When the two histories below reach house 2, a one-row machine puts them in <b>the same cell</b>:')}</p>
    <div class="cx-row"><header><b>${tr('历史 A', 'History A')}</b><span>${tr(`偷了 2 号 · 共 ${a[1]}`, `robbed #2 · total ${a[1]}`)}</span></header><div class="houses">${tile(0)}${tile(1, true)}<span class="arrow">→</span>${tile(2, false, true)}</div><span class="verdict no">${tr('不能偷 3 号：它和 2 号相邻', 'Can’t rob #3: it is next to #2')}</span></div>
    <div class="cx-row"><header><b>${tr('历史 B', 'History B')}</b><span>${tr(`偷了 1 号 · 共 ${a[0]}`, `robbed #1 · total ${a[0]}`)}</span></header><div class="houses">${tile(0, true)}${tile(1)}<span class="arrow">→</span>${tile(2, false, true)}</div><span class="verdict yes">${tr(`可以偷 3 号：${a[0]} + ${a[2]} = ${a[0] + a[2]}`, `Can rob #3: ${a[0]} + ${a[2]} = ${a[0] + a[2]}`)}</span></div>
    <p class="cx-p">${tr(`一个格子只能存一个数。它记住了更大的 ${a[1]}（历史 A），就忘掉了历史 B。可走到 3 号时，最好的 ${a[0] + a[2]} 恰恰来自 B。<b>要让机器分清 A 和 B，格子得多记一件事：这家偷没偷。</b>`, `A cell can hold only one number. Once it remembers the larger ${a[1]} (history A), history B is forgotten. Yet at house 3, the best total, ${a[0] + a[2]}, comes precisely from B. <b>For the machine to tell A and B apart, the cell has to remember one more thing: whether this house was robbed.</b>`)}</p></div>`;
  },
};

/** The HTML a panel item shows for test `t`. */
export function panel(call, t, view = null, st = { status: [] }) {
  const [name, params] = callOf(call);
  return PANELS[name](params, t, view, st);
}

/**
 * Explains: why a failed test went wrong, beyond its numbers: (t, res, o) → HTML or ''. `res` is the run, `o` the
 * stage's settings.
 */
const EXPLAINS = {
  roll(t, res, o) {
    let item = -1, touched = new Set();
    const s = res.steps.find(x => {
      if (x.cell.item !== item) { item = x.cell.item; touched = new Set(); }
      const hit = touched.has(x.cell.src) && x.writes[0][1] > x.probe['view#old'];
      touched.add(x.cell.w);
      return hit;
    });
    if (t.kind === '01' && s) { const it = t.items[s.cell.item]; return tr(`处理「${it.n}」（${it.w} kg）时，改 dp[${s.cell.w}] 要读 dp[${s.cell.src}]，可 dp[${s.cell.src}] 在这一轮已经改过，里面已经放了一个${it.n}。于是${it.n}又被放了一次。`, `While handling the ${it.n} (${it.w} kg), rewriting dp[${s.cell.w}] reads dp[${s.cell.src}], but dp[${s.cell.src}] was already rewritten this round and already holds one ${it.n}. So the ${it.n} got packed a second time.`); }
    if (t.kind === 'inf' && o.dirs.inf === 'desc') return tr('这一题每种东西可以拿很多件。从右往左改写时，dp[w − 重量] 总是旧值，每种东西都只被拿了一次。', 'In this test, each kind of thing can be taken many times. Rewriting from right to left, dp[w − weight] is always an old value, so each thing gets taken only once.');
    return '';
  },
};

/** What an explain item adds to a failed test's message. */
export function explain(call, t, res, o) {
  const [name] = callOf(call);
  return EXPLAINS[name](t, res, o);
}
