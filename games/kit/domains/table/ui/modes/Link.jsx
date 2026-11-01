// Link equal letters of two strings without crossing lines: the most lines is their longest common subsequence.
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { lcsLen } from '../../model/algo.js'
import { E } from '../../model/scene.js'
import { tr } from '../../lang.js'
import HandLevel from '../HandLevel.jsx'
import Scene from '../Scene.jsx'
import { Html, buzz, reduced, useLater, useToast, useVerdict } from '../play.jsx'

export default function Link({ game, level, phone, saved, save, solve, fail }) {
  const L = level.source
  const [ti, setTi] = useState(0)
  const [links, setLinks] = useState(() => L.tests.map((_, k) => saved?.links?.[k] || []))
  const [sel, setSel] = useState(null)
  const [flash, setFlash] = useState(null)
  const [hint, setHint] = useState(false)
  const [toast, toastEl] = useToast()
  const verdict = useVerdict({ level, solve, fail })
  const later = useLater()
  const target = (k) => lcsLen(L.tests[k].a, L.tests[k].b)
  const solvedIn = (all, k) => all[k].length >= target(k)
  const t = L.tests[ti], mine = links[ti]

  const selectTest = (k) => {
    setTi(k)
    setSel(null)
    setFlash(null)
    setHint(false)
  }
  const keep = (all) => {
    setLinks(all)
    save({ links: all })
  }
  const withLinks = (list) => links.map((x, k) => (k === ti ? list : x))

  const onCell = (id) => {
    const side = id[0], idx = +id.slice(1)
    setFlash(null)
    const at = mine.findIndex((l) => (side === 'a' ? l[0] : l[1]) === idx)
    if (!sel && at >= 0) {
      keep(withLinks(mine.filter((_, k) => k !== at)))
      toast(tr('拆掉了一根线', 'Removed a line'))
      return
    }
    if (!sel || sel.side === side) {
      setSel(sel && sel.side === side && sel.idx === idx ? null : { side, idx })
      buzz(5)
      return
    }
    const i = side === 'a' ? idx : sel.idx, j = side === 'b' ? idx : sel.idx
    setSel(null)
    if (t.a[i] !== t.b[j]) {
      toast(tr(`「${t.a[i]}」和「${t.b[j]}」不一样，不能连`, `“${t.a[i]}” and “${t.b[j]}” are different, so they can’t be linked`))
      buzz(20)
      return
    }
    if (mine.some((l) => l[0] === i || l[1] === j)) {
      toast(tr('每个字最多连一根线。先点它，拆掉原来的线', 'Each letter takes at most one line. Click it first to remove its line'))
      buzz(20)
      return
    }
    const cross = mine.filter((l) => (l[0] - i) * (l[1] - j) < 0)
    if (cross.length) {
      const shown = { links: cross, try: [i, j] }
      setFlash(shown)
      toast(tr('线不能交叉', 'Lines can’t cross'))
      buzz([20, 40, 20])
      later(() => setFlash((f) => (f === shown ? null : f)), 1200)
      return
    }
    const all = withLinks([...mine, [i, j]].sort((p, q) => p[0] - q[0]))
    keep(all)
    buzz(8)
    if (!solvedIn(all, ti)) return
    if (L.tests.every((_, k) => solvedIn(all, k))) {
      later(verdict.pass, reduced() ? 0 : 500)
      return
    }
    toast(tr(`第 ${ti + 1} 题完成`, `Puzzle ${ti + 1} done`))
    const nx = L.tests.findIndex((_, k) => !solvedIn(all, k))
    later(() => selectTest(nx), 900)
  }

  const { a, b } = t, sp = 50, sz = 44, n = Math.max(a.length, b.length)
  const oa = ((n - a.length) * sp) / 2, ob = ((n - b.length) * sp) / 2, fl = flash ? flash.links : []
  const la = new Set(mine.map((l) => l[0])), lb = new Set(mine.map((l) => l[1]))
  const isFl = (i, j) => fl.some((l) => l[0] === i && l[1] === j)
  const cls = (side, idx) => {
    const linked = side === 'a' ? la.has(idx) : lb.has(idx), selected = sel && sel.side === side && sel.idx === idx
    const flashed = flash && (side === 'a' ? flash.try[0] === idx || fl.some((l) => l[0] === idx) : flash.try[1] === idx || fl.some((l) => l[1] === idx))
    return ['tile', selected ? 'sel' : '', flashed ? 'bad' : linked ? 'ok' : ''].filter(Boolean).join(' ')
  }
  const edges = mine.map(([i, j]) => E(`a${i}`, `b${j}`, isFl(i, j) ? 'linkbad' : 'link'))
  if (flash) edges.push(E(`a${flash.try[0]}`, `b${flash.try[1]}`, 'linkbad'))
  const scene = {
    cells: [
      ...[...a].map((ch, i) => ({ id: `a${i}`, x: oa + i * sp, y: 0, w: sz, h: sz, value: ch, cls: cls('a', i), tap: true, aria: tr(`上面第 ${i + 1} 个字 ${ch}`, `Top letter ${i + 1}: ${ch}`) })),
      ...[...b].map((ch, j) => ({ id: `b${j}`, x: ob + j * sp, y: 150, w: sz, h: sz, value: ch, cls: cls('b', j), tap: true, aria: tr(`下面第 ${j + 1} 个字 ${ch}`, `Bottom letter ${j + 1}: ${ch}`) })),
    ],
    edges,
  }
  return (
    <HandLevel
      game={game}
      level={level}
      phone={phone}
      tests={L.tests.map((x, k) => ({ label: `${tr(`第 ${k + 1} 题`, `Puzzle ${k + 1}`)} · ${x.a} / ${x.b}`, status: solvedIn(links, k) ? 'pass' : null }))}
      ti={ti}
      onTest={selectTest}
      board={<Scene scene={scene} opt={{ label: tr('棋盘', 'Board'), maxScale: 1.3 }} onCell={onCell} />}
      note={sel ? tr(`已选中${sel.side === 'a' ? '上面' : '下面'}的「${t[sel.side][sel.idx]}」，再点另一行里相同的字。`, `Selected “${t[sel.side][sel.idx]}” in the ${sel.side === 'a' ? 'top' : 'bottom'} row. Now click the same letter in the other row.`) : tr('连上的字从左往右读，就是两串字共有的一串。', 'Read left to right, the linked letters are a sequence the two strings share.')}
      panel={
        <>
          <div className="pcard"><h3>{tr('三条规则', 'Three rules')}</h3><p>{tr(<>1. 只能连<b>相同</b>的字<br />2. 每个字最多连<b>一根</b>线<br />3. 线<b>不能交叉</b></>, <>1. Only link <b>equal</b> letters<br />2. Each letter takes at most <b>one</b> line<br />3. Lines <b>can’t cross</b></>)}</p></div>
          <div className="pcard">
            <h3>{tr('连出的公共子序列', 'Common subsequence so far')}<small>{`${mine.length} / ${target(ti)}${tr(' 个字', ' letters')}`}</small></h3>
            <div className="diff">{mine.length ? mine.map((l, k) => <span key={k} className="dt ins">{a[l[0]]}</span>) : <span className="opthint">{tr('还没有连线', 'No lines yet')}</span>}</div>
          </div>
          <div className="pcard"><h3>{tr('卡住了？', 'Stuck?')}</h3>{hint ? <Html as="p" html={L.hints[ti]} /> : <button className="sec-btn" type="button" onClick={() => setHint(true)}>{tr('看提示', 'Show a hint')}</button>}</div>
        </>
      }
      dock={{
        meta: tr(<>已连 <b>{mine.length}</b> 根 · 目标 <b>{target(ti)}</b> 根</>, <><b>{mine.length}</b> lines · target <b>{target(ti)}</b></>),
        secondary: mine.length ? { label: tr('清空这题', 'Clear this puzzle'), icon: <Trash2 size={16} />, onClick: () => { keep(withLinks([])); setSel(null) } } : null,
      }}
    >
      {toastEl}
    </HandLevel>
  )
}
