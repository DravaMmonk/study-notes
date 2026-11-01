// What content shows under a test board (vocabulary.js panel), and in the dialog of a failure that is a stage's lesson
// (a stage's onFail `show`): each panel item drawn for a test, in the current language.

import { callOf } from '../../../engine/schema.js'
import { L } from '../../../shell/i18n.js'
import { useLang } from '../../../shell/useLang.js'
import { tr } from '../lang.js'
import { editTable, editTrace, knapTrace, lcsTable, lcsTrace, localTrace } from '../model/algo.js'
import { TAG, bestTags } from '../model/worlds/tags.js'

const passed = (view) => Boolean(view) && view.end && view.pass
const Box = ({ eyebrow, cap, children }) => <div className="afterbox"><span className="eyebrow">{eyebrow}</span>{children}{cap && <p className="cap">{cap}</p>}</div>
const Letters = ({ s, on }) => <div className="diff">{[...s].map((ch, k) => <span key={k} className={`dt${on.has(k) ? ' ins' : ''}`}>{ch}</span>)}</div>
const Tiles = ({ children }) => <div className="diff">{children}</div>

/**
 * Panels: (params, t, view, st) → what they show, or nothing. `view` is the run shown on the board (null before one),
 * `st` the level's state (st.status: each test's verdict).
 */
const PANELS = {
  lcs(_, t, view) {
    if (!passed(view)) return null
    const { pairs } = lcsTrace(t.top, t.left, lcsTable(t.top, t.left))
    const common = <b>{pairs.map((p) => t.top[p[0]]).join(' ')}</b>
    return (
      <Box eyebrow={tr('表格里藏着的连线', 'The lines hidden in the table')} cap={<>{tr('从右下角沿绿色格子倒推，每走一次对角线，就是一根连线。公共子序列：', 'Walk back from the bottom-right corner along the green cells: every diagonal step is one line. Common subsequence: ')}{common}</>}>
        <Letters s={t.top} on={new Set(pairs.map((p) => p[0]))} />
        <Letters s={t.left} on={new Set(pairs.map((p) => p[1]))} />
      </Box>
    )
  },
  edit(_, t, view) {
    if (!passed(view)) return null
    const { ops } = editTrace(t.left, t.top, editTable(t.left, t.top))
    const n = ops.filter((o) => o.k !== 'keep').length
    const tile = (o, k) => (o.k === 'keep' ? <span key={k} className="dt">{o.a}<small>{tr('保留', 'keep')}</small></span>
      : o.k === 'rep' ? <span key={k} className="dt rep">{`${o.a}→${o.b}`}<small>{tr('替换', 'replace')}</small></span>
        : o.k === 'del' ? <span key={k} className="dt del"><s>{o.a}</s><small>{tr('删除', 'delete')}</small></span>
          : <span key={k} className="dt ins">{`+${o.b}`}<small>{tr('插入', 'insert')}</small></span>)
    return (
      <Box eyebrow={tr(`表格倒推出的改法 · ${n} 步`, `The edits traced back from the table · ${n} step${n === 1 ? '' : 's'}`)} cap={tr('从右下角倒推：走对角线是保留或替换，往上是删除，往左是插入。', 'Walking back from the bottom-right corner: a diagonal step is a keep or a replace, a step up is a delete, and a step left is an insert.')}>
        <Tiles>{ops.map(tile)}</Tiles>
      </Box>
    )
  },
  spell({ candidates }, t, view, st) {
    if (!passed(view) || st.status.some((x) => x !== 'pass')) return null
    const rows = candidates.map((top) => ({ top, d: editTable(t.left, top)[t.left.length][top.length] })).sort((a, b) => a.d - b.d)
    const best = rows[0].top
    return (
      <Box eyebrow={tr('候选词 · 按步数排', 'Candidates · by number of steps')} cap={tr(<>最近的是 <b>{best}</b>：输入法就会问你「是不是想打 {best}」。</>, <>The closest is <b>{best}</b>, so your keyboard would ask “Did you mean {best}?”</>)}>
        <Tiles>{rows.map((x, k) => <span key={x.top} className={`dt${k ? '' : ' ins'}`}>{x.top}<small>{tr(`${x.d} 步`, `${x.d} step${x.d === 1 ? '' : 's'}`)}</small></span>)}</Tiles>
      </Box>
    )
  },
  local(_, t, view) {
    if (!passed(view)) return null
    const { okTop, okLeft } = localTrace(t)
    return (
      <Box eyebrow={tr('最像的一段', 'The most alike stretch')} cap={tr('从最大的那一格倒推，一直退到 0 为止。', 'Traced back from the largest cell until the score drops to 0.')}>
        <Letters s={t.top} on={okTop} />
        <Letters s={t.left} on={okLeft} />
      </Box>
    )
  },
  tags(_, t, view) {
    if (!passed(view)) return null
    const b = bestTags(t)
    return (
      <Box eyebrow={tr(`表倒推出的标法 · 代价 ${b.cost}`, `Tagging traced back from the table · cost ${b.cost}`)} cap={t.note ? L(t.note) : null}>
        <Tiles>{t.words.map((w, k) => <span key={k} className="dt ins">{L(w)}<small>{L(TAG[b.tags[k]].n)}</small></span>)}</Tiles>
      </Box>
    )
  },
  knap(_, t, view) {
    if (!passed(view)) return null
    const chosen = knapTrace(t).picked.map((k) => t.items[k])
    const kg = chosen.reduce((s, it) => s + it.w, 0)
    const value = chosen.reduce((s, it) => s + it.v, 0)
    return (
      <Box eyebrow={tr('倒推出的装法', 'The packing, traced back')} cap={tr(<>一共 {kg} kg，价值 <b>{value}</b>。</>, <>{kg} kg in all, value <b>{value}</b>.</>)}>
        <Tiles>{chosen.map((it, k) => <span key={k} className="dt ins">{L(it.n)}<small>{`${it.w} kg · ${it.v}`}</small></span>)}</Tiles>
      </Box>
    )
  },
  roll(_, t, view) {
    const on = view && !view.end && view.k ? view.res.steps[view.k - 1].cell.item : -1
    return (
      <Box eyebrow={`${tr('物品', 'Items')} · ${t.kind === '01' ? tr('每件最多拿一次', 'each at most once') : tr('每件可以拿很多次', 'each as many times as you like')}`}>
        <Tiles>{t.items.map((it, k) => <span key={k} className={`dt${k === on ? ' on' : ''}`}>{L(it.n)}<small>{`${it.w} kg · ${it.v}`}</small></span>)}</Tiles>
      </Box>
    )
  },
  /** The dictionary of a cutting level: its words, at their costs when they have any, and what a lone letter costs. */
  dictionary(_, t) {
    const costs = !Array.isArray(t.dict)
    const words = costs ? Object.entries(t.dict) : t.dict.map((w) => [w])
    return (
      <Box eyebrow={costs ? tr('词典 · 代价', 'Dictionary · cost') : tr('词典', 'Dictionary')}>
        <Tiles>
          {words.map(([w, c]) => <span key={w} className="dt">{c === undefined ? w : `${w} · ${c}`}</span>)}
          {t.letter !== undefined && <span className="dt">{tr(`单个字母 · ${t.letter}`, `a single letter · ${t.letter}`)}</span>}
        </Tiles>
      </Box>
    )
  },
  /** One cell a house cannot tell two histories apart: the first three houses of test `t`'s street. */
  robConflict(_, t) {
    const a = t.a
    const tile = (j, on, ask) => <span className={`hs${on ? ' on' : ''}${ask ? ' ask' : ''}`}>{a[j]}<small>{tr(`${j + 1}号`, `#${j + 1}`)}</small></span>
    const row = (name, robbed, j, verdict, yes) => (
      <div className="cx-row">
        <header><b>{name}</b><span>{robbed}</span></header>
        <div className="houses">{tile(0, j === 0)}{tile(1, j === 1)}<span className="arrow">→</span>{tile(2, false, true)}</div>
        <span className={`verdict ${yes ? 'yes' : 'no'}`}>{verdict}</span>
      </div>
    )
    return (
      <div className="cx">
        <div className="kicker bad">{tr('反例', 'Counterexample')}</div>
        <p className="cx-p">{tr(<>看第 1 条街的前两家。下面两段历史走到 2 号时，在一行的机器里落进<b>同一个格子</b>：</>, <>Look at the first two houses on street 1. When the two histories below reach house 2, a one-row machine puts them in <b>the same cell</b>:</>)}</p>
        {row(tr('历史 A', 'History A'), tr(`偷了 2 号 · 共 ${a[1]}`, `robbed #2 · total ${a[1]}`), 1, tr('不能偷 3 号：它和 2 号相邻', 'Can’t rob #3: it is next to #2'), false)}
        {row(tr('历史 B', 'History B'), tr(`偷了 1 号 · 共 ${a[0]}`, `robbed #1 · total ${a[0]}`), 0, tr(`可以偷 3 号：${a[0]} + ${a[2]} = ${a[0] + a[2]}`, `Can rob #3: ${a[0]} + ${a[2]} = ${a[0] + a[2]}`), true)}
        <p className="cx-p">{tr(
          <>一个格子只能存一个数。它记住了更大的 {a[1]}（历史 A），就忘掉了历史 B。可走到 3 号时，最好的 {a[0] + a[2]} 恰恰来自 B。<b>要让机器分清 A 和 B，格子得多记一件事：这家偷没偷。</b></>,
          <>A cell can hold only one number. Once it remembers the larger {a[1]} (history A), history B is forgotten. Yet at house 3, the best total, {a[0] + a[2]}, comes precisely from B. <b>For the machine to tell A and B apart, the cell has to remember one more thing: whether this house was robbed.</b></>,
        )}</p>
      </div>
    )
  },
}

/** A panel item drawn for test `t` (`view`, `st` as above). It follows a language switch on its own, wherever it is. */
export function Panel({ call, t, view = null, st = { status: [] } }) {
  useLang()
  const [name, params] = callOf(call)
  return PANELS[name](params, t, view, st)
}
