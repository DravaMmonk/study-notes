import { qualifyItems } from '../../../engine/capabilities.js'
import { callOf } from '../../../engine/schema.js'
import { L } from '../../../shell/i18n.js'
import { tr } from '../lang.js'
import { editTable, editTrace, knapTrace, lcsTable, lcsTrace, localTrace } from '../model/algo.js'
import { TAG, bestTags } from '../model/worlds/tags.js'

const passed = (view) => view?.end && view.pass
const line = (s, drawn) => [...s].map((text, k) => ({ text, tone: drawn.has(k) ? 'ins' : null }))
const escaped = (v) => String(v ?? '').replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch])

const PANELS = qualifyItems('table', 'panel', {
  lcs(_, t, view) {
    if (!passed(view)) return null
    const { pairs } = lcsTrace(t.top, t.left, lcsTable(t.top, t.left))
    const common = `<b>${escaped(pairs.map((p) => t.top[p[0]]).join(' '))}</b>`
    return {
      title: tr('表格里藏着的连线', 'The lines hidden in the table'),
      caption: tr(`从右下角沿绿色格子倒推，每走一次对角线，就是一根连线。公共子序列：${common}`,
        `Walk back from the bottom-right corner along the green cells: every diagonal step is one line. Common subsequence: ${common}`),
      rows: [line(t.top, new Set(pairs.map((p) => p[0]))), line(t.left, new Set(pairs.map((p) => p[1])))],
    }
  },
  edit(_, t, view) {
    if (!passed(view)) return null
    const { ops } = editTrace(t.left, t.top, editTable(t.left, t.top))
    const n = ops.filter((o) => o.k !== 'keep').length
    const tile = (o) => {
      if (o.k === 'keep') return { text: o.a, note: tr('保留', 'keep') }
      if (o.k === 'rep') return { text: `${o.a}→${o.b}`, note: tr('替换', 'replace'), tone: 'rep' }
      if (o.k === 'del') return { text: o.a, note: tr('删除', 'delete'), tone: 'del', strike: true }
      return { text: `+${o.b}`, note: tr('插入', 'insert'), tone: 'ins' }
    }
    return {
      title: tr(`表格倒推出的改法 · ${n} 步`, `The edits traced back from the table · ${n} step${n === 1 ? '' : 's'}`),
      caption: tr('从右下角倒推：走对角线是保留或替换，往上是删除，往左是插入。', 'Walking back from the bottom-right corner: a diagonal step is a keep or a replace, a step up is a delete, and a step left is an insert.'),
      rows: [ops.map(tile)],
    }
  },
  spell({ candidates }, t, view, st) {
    if (!passed(view) || st.status.some((x) => x !== 'pass')) return null
    const rows = candidates.map((top) => ({ top, d: editTable(t.left, top)[t.left.length][top.length] })).sort((a, b) => a.d - b.d)
    const best = escaped(rows[0].top)
    return {
      title: tr('候选词 · 按步数排', 'Candidates · by number of steps'),
      caption: tr(`最近的是 <b>${best}</b>：输入法就会问你「是不是想打 ${best}」。`, `The closest is <b>${best}</b>, so your keyboard would ask “Did you mean ${best}?”`),
      rows: [rows.map(({ top, d }, k) => ({ text: top, tone: k === 0 ? 'ins' : null, note: tr(`${d} 步`, `${d} step${d === 1 ? '' : 's'}`) }))],
    }
  },
  local(_, t, view) {
    if (!passed(view)) return null
    const { okTop, okLeft } = localTrace(t)
    return {
      title: tr('最像的一段', 'The most alike stretch'),
      caption: tr('从最大的那一格倒推，一直退到 0 为止。', 'Traced back from the largest cell until the score drops to 0.'),
      rows: [line(t.top, okTop), line(t.left, okLeft)],
    }
  },
  tags(_, t, view) {
    if (!passed(view)) return null
    const b = bestTags(t)
    return {
      title: tr(`表倒推出的标法 · 代价 ${b.cost}`, `Tagging traced back from the table · cost ${b.cost}`),
      caption: t.note ? escaped(L(t.note)) : null,
      rows: [t.words.map((text, k) => ({ text, tone: 'ins', note: TAG[b.tags[k]].n }))],
    }
  },
  knap(_, t, view) {
    if (!passed(view)) return null
    const chosen = knapTrace(t).picked.map((k) => t.items[k])
    const kg = chosen.reduce((s, it) => s + it.w, 0)
    const value = chosen.reduce((s, it) => s + it.v, 0)
    return {
      title: tr('倒推出的装法', 'The packing, traced back'),
      caption: tr(`一共 ${kg} kg，价值 <b>${value}</b>。`, `${kg} kg in all, value <b>${value}</b>.`),
      rows: [chosen.map((it) => ({ text: it.n, tone: 'ins', note: `${it.w} kg · ${it.v}` }))],
    }
  },
  roll(_, t, view) {
    const on = view && !view.end && view.k ? view.res.steps[view.k - 1].cell.item : -1
    return {
      title: `${tr('物品', 'Items')} · ${t.kind === '01' ? tr('每件最多拿一次', 'each at most once') : tr('每件可以拿很多次', 'as many times as you like')}`,
      rows: [t.items.map((it, k) => ({ text: it.n, tone: k === on ? 'on' : null, note: `${it.w} kg · ${it.v}` }))],
    }
  },
  dictionary(_, t) {
    const costs = !Array.isArray(t.dict)
    const words = costs ? Object.entries(t.dict) : t.dict.map((w) => [w])
    const row = words.map(([w, c]) => ({ text: c === undefined ? w : `${w} · ${c}` }))
    if (t.letter !== undefined) row.push({ text: tr(`单个字母 · ${t.letter}`, `a single letter · ${t.letter}`) })
    return { title: costs ? tr('词典 · 代价', 'Dictionary · cost') : tr('词典', 'Dictionary'), rows: [row] }
  },
  robConflict(_, t) {
    const a = t.a
    const cells = (robbed) => a.slice(0, 3).map((value, k) => ({ value, active: k === robbed, next: k === 2, label: tr(`${k + 1}号`, `#${k + 1}`) }))
    return {
      title: tr('反例', 'Counterexample'),
      lead: tr('看第 1 条街的前两家。下面两段历史走到 2 号时，在一行的机器里落进<b>同一个格子</b>：', 'Look at the first two houses of street 1. When the two histories reach house 2, a one-row machine puts them in <b>the same cell</b>:'),
      histories: [{
        name: tr('历史 A', 'History A'), description: tr(`偷了 2 号 · 共 ${a[1]}`, `robbed #2 · total ${a[1]}`), cells: cells(1),
        result: tr('不能偷 3 号：它和 2 号相邻', 'Can’t rob #3: it is next to #2'), pass: false,
      }, {
        name: tr('历史 B', 'History B'), description: tr(`偷了 1 号 · 共 ${a[0]}`, `robbed #1 · total ${a[0]}`), cells: cells(0),
        result: tr(`可以偷 3 号：${a[0]} + ${a[2]} = ${a[0] + a[2]}`, `Can rob #3: ${a[0]} + ${a[2]} = ${a[0] + a[2]}`), pass: true,
      }],
      caption: tr(
        `一个格子只能存一个数。它记住了更大的 ${a[1]}（历史 A），就忘掉了历史 B。可走到 3 号时，最好的 ${a[0] + a[2]} 恰恰来自 B。<b>要让机器分清 A 和 B，格子得多记一件事：这家偷没偷。</b>`,
        `A cell can hold only one number. Once it remembers the larger ${a[1]} (history A), history B is forgotten. Yet at house 3, the best total, ${a[0] + a[2]}, comes precisely from B. <b>For the machine to tell history A from B, the cell has to remember one more fact: whether this house was robbed.</b>`,
      ),
    }
  },
})

export function panelData(call, test, view = null, status = []) {
  const [name, params] = callOf(call)
  return PANELS[name](params, test, view, { status })
}
