// Fill each cell by hand with the number pad: the routes to a place are the sum of the routes to every place that
// points to it.
import { useMemo, useState } from 'react'
import { evalGraph } from '../../model/algo.js'
import { E, W } from '../../model/scene.js'
import { tr, lazy } from '../../lang.js'
import HandLevel from '../HandLevel.jsx'
import Scene from '../Scene.jsx'
import { CheckIcon, buzz, typing, useKeys, useToast, useVerdict } from '../play.jsx'

export default function Fill({ game, level, phone, saved, save, solve, fail }) {
  const L = level.source
  const [vals, setVals] = useState(() => saved?.vals ?? {})
  const [sel, setSel] = useState(null)
  const [input, setInput] = useState('')
  const [marks, setMarks] = useState({})
  const [toast, toastEl] = useToast()
  const verdict = useVerdict({ level, solve, fail })
  const { by, truth } = useMemo(() => ({
    by: Object.fromEntries(L.cells.map((c) => [c.id, c])),
    truth: evalGraph(L.cells.map((c) => (c.id === L.start ? { ...c, fixed: 1 } : c)), L.edges),
  }), [L])
  const order = truth.order
  const preds = (id) => L.edges.filter((e) => e[1] === id).map((e) => e[0])
  const name = (id) => (by[id].grid ? tr(`第 ${+id.split(',')[0] + 1} 行第 ${+id.split(',')[1] + 1} 列的路口`, `the crossing at row ${+id.split(',')[0] + 1}, column ${+id.split(',')[1] + 1}`) : tr(`「${by[id].label}」`, `“${by[id].label}”`))
  const valIn = (vs, id) => (id === L.start ? 1 : vs[id] ?? null)
  const valOf = (id) => valIn(vals, id)
  const empties = L.cells.filter((c) => c.id !== L.start && valOf(c.id) === null).length
  const total = L.cells.length - 1

  const onCell = (id) => {
    if (id === L.start) {
      toast(tr('起点已经填好了：到这里的路线算 1 条', 'The start is already filled in: it counts as 1 route'))
      return
    }
    const next = sel === id ? null : id
    setSel(next)
    setInput(next && vals[id] != null ? String(vals[id]) : '')
  }
  const key = (k) => {
    if (!sel) return
    if (k === 'close') {
      setSel(null)
      return
    }
    if (k === 'del') setInput(input.slice(0, -1))
    else if (k === 'ok') {
      const next = { ...vals, [sel]: input === '' ? null : Number(input) }
      setVals(next)
      setMarks(({ [sel]: _, ...rest }) => rest)
      save({ vals: next })
      setSel(order.find((id) => id !== L.start && valIn(next, id) === null) || null)
      setInput('')
    } else if (input.length < 4) setInput((input === '0' ? '' : input) + k)
    buzz(5)
  }
  useKeys((event) => sel && typing(event, key))

  const check = () => {
    if (empties) {
      toast(tr(`还有 ${empties} 个${L.grid ? '路口' : '地点'}没填`, `${empties} ${L.grid ? 'crossing' : 'place'}${empties === 1 ? ' is' : 's are'} still empty`))
      buzz(20)
      return
    }
    const wrong = order.filter((id) => valOf(id) !== truth.val[id])
    setMarks(Object.fromEntries(order.filter((id) => id !== L.start).map((id) => [id, wrong.includes(id) ? 'bad' : 'ok'])))
    if (!wrong.length) {
      verdict.pass()
      return
    }
    const w = wrong[0], ps = preds(w), pv = ps.map(valOf), right = truth.val[w], mine = valOf(w), n = wrong.length
    const body = () => {
      const from = ps.map(name).join(tr('和', ' and '))
      return ps.length === 1
        ? tr(`指向${name(w)}的箭头只来自${from}，所以它和${from}一样，是 <b>${pv[0]}</b>。你填的是 <b>${mine}</b>。`, `The only arrow into ${name(w)} comes from ${from}, so it is the same as ${from}: <b>${pv[0]}</b>. You wrote <b>${mine}</b>.`)
        : tr(`指向${name(w)}的箭头来自${from}，它们的数是 ${pv.join(' 和 ')}，所以应该是 <b>${pv.join(' + ')} = ${right}</b>。你填的是 <b>${mine}</b>。`, `The arrows into ${name(w)} come from ${from}, whose numbers are ${pv.join(' and ')}, so it should be <b>${pv.join(' + ')} = ${right}</b>. You wrote <b>${mine}</b>.`)
    }
    verdict.fail({ head: lazy(() => tr(`${n} 处填得不对`, `${n} cell${n === 1 ? ' is' : 's are'} wrong`)), body: lazy(() => tr(`红框是填错的格子。先看第一个：${body()}`, `The red frames mark the wrong cells. Look at the first one: ${body()}`)) })
  }

  const pr = sel ? preds(sel) : []
  const scene = {
    cells: L.cells.map((c) => {
      const v = valOf(c.id)
      const cls = [c.id === L.start ? 'src' : '', sel === c.id ? 'sel' : '', pr.includes(c.id) ? 'pred' : '', marks[c.id] || '']
      const base = by[c.id].grid ? { w: 58, h: 58, corner: c.id === L.start ? W.start : c.id === L.end ? W.end : '' } : { w: 84, h: 64, label: c.label }
      return { id: c.id, x: c.x, y: c.y, ...base, value: sel === c.id ? (input || '_') : v === null ? '' : v, cls: cls.filter(Boolean).join(' '), tap: true, aria: name(c.id) }
    }),
    edges: L.edges.map(([a, b]) => E(a, b, b === sel ? 'hot' : by[a].grid ? 'dim' : 'idle')),
  }
  const filled = total - empties
  return (
    <HandLevel
      game={game}
      level={level}
      phone={phone}
      board={<Scene scene={scene} opt={{ label: tr('棋盘', 'Board'), maxScale: 1.25 }} onCell={onCell} />}
      note={sel ? tr(`指向${name(sel)}的箭头来自：${pr.map(name).join('、')}`, `The arrows into ${name(sel)} come from: ${pr.map(name).join(', ')}`) : tr(`已填 ${filled} / ${total}`, `Filled ${filled} / ${total}`)}
      panel={
        <div className="pcard">
          <h3>{tr('规则', 'Rule')}</h3>
          <div className="rule">{tr(<>到一个地点的路线数<br />= 所有指向它的地点的路线数之和</>, <>Routes to a place<br />= the sum of the routes to every place that points to it</>)}</div>
          <p>{tr(<>起点算 <b>1</b>。选中一个{L.grid ? '路口' : '地点'}后，它的「上一站」会亮起黄色虚框，指向它的箭头会变成黄色。</>, <>The start counts as <b>1</b>. When you select a {L.grid ? 'crossing' : 'place'}, its “previous stops” get a dashed yellow frame and the arrows into it turn yellow.</>)}</p>
        </div>
      }
      dock={sel
        ? { pad: { title: tr(`到${name(sel)}的路线数`, `Routes to ${name(sel)}`), value: input, onKey: key } }
        : { meta: tr(<>已填 <b>{filled}</b>{` / ${total}`}</>, <>Filled <b>{filled}</b>{` / ${total}`}</>), go: { label: tr('检查', 'Check'), icon: <CheckIcon />, onClick: check } }}
    >
      {toastEl}
    </HandLevel>
  )
}
