// Pack the backpack by hand, with two greedy shortcuts to try.
import { useState } from 'react'
import { knapBest } from '../../../core/model/algo.js'
import { L as text } from 'kernel/view'
import { T, tr } from 'table'
import { reduced } from 'kernel/view'
import { buzz, useLater, useVerdict } from 'kernel/view'

const GREEDY = { val: T('最贵的先放', 'Priciest first'), ratio: T('最划算的先放', 'Best value first') }

export default function usePack({ level, saved, save, solve, fail, toast }) {
  const L = level.source
  const [ti, setTi] = useState(0)
  const [bags, setBags] = useState(() => L.tests.map((_, k) => saved?.bags?.[k] || []))
  // The packings tried on each test, by the items in them.
  const [tried, setTried] = useState(() => bags.map((b) => new Set([b.join(',')])))
  const [msg, setMsg] = useState(null) // { cls, body() } what a shortcut did
  const verdict = useVerdict({ hints: L.hints, solve, fail })
  const later = useLater()
  const t = L.tests[ti], bag = bags[ti]
  const target = (k) => knapBest(L.tests[k])
  const sumOf = (b, k, f) => b.reduce((s, i) => s + L.tests[k].items[i][f], 0)
  const solvedIn = (all, k) => sumOf(all[k], k, 'v') >= target(k)
  const used = sumOf(bag, ti, 'w'), value = sumOf(bag, ti, 'v'), goal = target(ti)

  const pick = (k) => {
    setTi(k)
    setMsg(null)
  }
  /** A new packing of this test: kept, counted as tried, and judged. */
  const settle = (next) => {
    const all = bags.map((b, k) => (k === ti ? next : b))
    setBags(all)
    setTried(tried.map((s, k) => (k === ti ? new Set([...s, next.join(',')]) : s)))
    const work = { bags: all }
    save(work)
    if (!solvedIn(all, ti)) return
    if (L.tests.every((_, k) => solvedIn(all, k))) {
      later(() => verdict.pass(work), reduced() ? 0 : 600)
      return
    }
    toast(tr(`第 ${ti + 1} 题完成，达到了目标价值`, `Puzzle ${ti + 1} done: you reached the target value`))
    const nx = L.tests.findIndex((_, k) => !solvedIn(all, k))
    later(() => pick(nx), 1000)
  }
  const toggle = (k) => {
    if (bag.includes(k)) {
      setMsg(null)
      buzz(6)
      settle(bag.filter((x) => x !== k))
      return
    }
    const left = t.W - used
    if (t.items[k].w > left) {
      toast(tr(`装不下：${text(t.items[k].n)}重 ${t.items[k].w} kg，背包只剩 ${left} kg`, `It won’t fit: ${text(t.items[k].n)} (${t.items[k].w} kg), with only ${left} kg of room left`))
      buzz([20, 40, 20])
      return
    }
    setMsg(null)
    buzz(6)
    settle([...bag, k].sort((p, q) => p - q))
  }
  const greedy = (g) => {
    const score = (it) => (g === 'val' ? it.v : it.v / it.w)
    const order = t.items.map((_, k) => k).sort((p, q) => score(t.items[q]) - score(t.items[p]))
    const nb = []
    let left = t.W
    for (const k of order) if (t.items[k].w <= left) { nb.push(k); left -= t.items[k].w }
    nb.sort((p, q) => p - q)
    const v = sumOf(nb, ti, 'v'), tg = goal
    const names = (ks) => ks.map((k) => text(t.items[k].n))
    setMsg({
      cls: v >= tg ? 'good' : 'bad',
      body: () => tr(
        `按「${text(GREEDY[g])}」依次看 ${names(order).join('、')}，装得下就装。结果装了${names(nb).join('、')}，价值 <b>${v}</b>。${v >= tg ? '正好达到目标。' : `比目标少 <b>${tg - v}</b>。`}`,
        `“${text(GREEDY[g])}” looks at ${names(order).join(', ')} in that order and packs whatever fits. It packed ${names(nb).join(', ')}, for a value of <b>${v}</b>. ${v >= tg ? 'That hits the target exactly.' : `That is <b>${tg - v}</b> short of the target.`}`,
      ),
    })
    buzz(10)
    settle(nb)
  }

  const n = t.items.length
  return {
    capacity: {
      totals: [
        { label: tr(`背包 <b>${used}</b> / ${t.W} kg`, `Backpack <b>${used}</b> / ${t.W} kg`) },
        { label: tr(`价值 <b>${value}</b> · 目标 ${goal}`, `Value <b>${value}</b> · target ${goal}`), hit: value >= goal },
      ],
      capacityLabel: tr(`背包装了 ${used} 千克，上限 ${t.W} 千克`, `The backpack holds ${used} kg of ${t.W} kg`),
      choices: t.items.map((it, k) => ({
        id: k,
        label: text(it.n),
        score: tr(`价值 ${it.v}`, `value ${it.v}`),
        size: it.w,
        sizeLabel: `${it.w} ${tr('千克', 'kg')}`,
        sizeHint: `${it.w} kg`,
        color: `var(--t${k % 6})`,
        selected: bag.includes(k),
      })),
      remaining: t.W - used,
      onToggle: toggle,
    },
    tests: L.tests.map((x, k) => ({ label: tr(`第 ${k + 1} 题 · ${x.W} kg 背包`, `Puzzle ${k + 1} · ${x.W} kg backpack`) })),
    states: L.tests.map((_, k) => solvedIn(bags, k) ? 'pass' : null),
    ti,
    onTest: pick,
    cards: [{
      title: tr('自动装包', 'Auto-pack'),
      body: tr('两种常见的捷径：按某种顺序挨个看，装得下就装。', 'Two popular shortcuts: go through the items in some order and pack each one that still fits.'),
      choices: { items: ['val', 'ratio'].map((g) => ({ label: text(GREEDY[g]), select: () => greedy(g) })) },
      feedback: msg,
      footnote: tr('「最划算」指每千克的价值最高。', '“Best value” means the highest value per kilogram.'),
    }, {
      title: tr('试过的装法', 'Packings tried'),
      badge: `${tried[ti].size} / ${2 ** n}`,
      body: tr(`${n} 件物品，每件都有带和不带两种选择，一共 <b>${2 ** n}</b> 种装法。物品每多一件，装法就翻一倍。`, `${n} items, each either taken or left behind: <b>${2 ** n}</b> packings in all. Every extra item doubles the number of packings.`),
    }],
    dock: {
      meta: tr(`价值 <b>${value}</b> · 目标 <b>${goal}</b>`, `Value <b>${value}</b> · target <b>${goal}</b>`),
      secondary: bag.length ? { label: tr('倒空背包', 'Empty the backpack'), onClick: () => { const all = bags.map((b, k) => (k === ti ? [] : b)); setBags(all); setMsg(null); save({ bags: all }) } } : null,
    },
  }
}
