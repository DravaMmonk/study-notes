// Trace every route on a one-way street map, one click a stop.
import { useMemo, useState } from 'react'
import { allRoutes } from '../../model/algo.js'
import { E } from '../../model/scene.js'
import { tr } from '../../lang.js'
import HandLevel from '../HandLevel.jsx'
import Scene from '../Scene.jsx'
import { buzz, reduced, useLater, useToast, useVerdict } from '../play.jsx'

export default function Trace({ game, level, phone, saved, save, solve, fail }) {
  const L = level.source
  const [route, setRoute] = useState([])
  const [found, setFound] = useState(() => saved?.found ?? [])
  const [flash, setFlash] = useState(null)
  const [toast, toastEl] = useToast()
  const verdict = useVerdict({ level, solve, fail })
  const later = useLater()
  const { by, total } = useMemo(() => ({ by: Object.fromEntries(L.cells.map((c) => [c.id, c])), total: allRoutes(L.start, L.end, L.edges).length }), [L])
  const has = (a, b) => L.edges.some((e) => e[0] === a && e[1] === b)
  const name = (id) => by[id].label

  const onCell = (id) => {
    setFlash(null)
    if (!route.length) {
      if (id !== L.start) {
        toast(tr(`路线要从「${name(L.start)}」出发`, `A route has to start at “${name(L.start)}”`))
        buzz(20)
        return
      }
      setRoute([id])
      buzz(6)
      return
    }
    const last = route.at(-1)
    if (id === last) {
      setRoute(route.slice(0, -1))
      return
    }
    if (!has(last, id)) {
      toast(tr(`没有从「${name(last)}」通往「${name(id)}」的单行道`, `There is no one-way street from “${name(last)}” to “${name(id)}”`))
      buzz(20)
      return
    }
    const next = [...route, id]
    if (id !== L.end) {
      setRoute(next)
      buzz(6)
      return
    }
    const key = next.join('>')
    let all = found
    if (found.some((r) => r.join('>') === key)) toast(tr('这条路线已经找过了', 'You already found this route'))
    else {
      all = [...found, next]
      setFound(all)
      toast(tr(`找到第 ${all.length} 条路线`, `Found route ${all.length}`))
      buzz(15)
    }
    setFlash(next)
    setRoute([])
    save({ found: all })
    if (all.length === total) later(verdict.pass, reduced() ? 0 : 500)
  }

  const showRoute = route.length ? route : flash || []
  const onRoute = (a, b) => {
    const i = showRoute.indexOf(a)
    return i >= 0 && showRoute[i + 1] === b
  }
  const scene = {
    cells: L.cells.map((c) => {
      const k = showRoute.indexOf(c.id)
      const cls = [k >= 0 ? (route.length ? 'sel' : 'path') : '', c.id === L.start && !route.length ? 'coach' : '']
      return { id: c.id, x: c.x, y: c.y, w: 92, h: 66, label: c.label, value: k >= 0 ? k + 1 : '', cls: cls.filter(Boolean).join(' '), tap: true }
    }),
    edges: L.edges.map(([a, b]) => E(a, b, onRoute(a, b) ? (route.length ? 'sel' : 'good') : 'idle')),
  }
  const walk = (r) => r.map(name).join(' → ')
  return (
    <HandLevel
      game={game}
      level={level}
      phone={phone}
      board={<Scene scene={scene} opt={{ label: tr('棋盘', 'Board'), maxScale: 1.25 }} onCell={onCell} />}
      note={route.length ? `${tr('当前路线：', 'Current route: ')}${walk(route)}` : tr(`从「${name(L.start)}」开始点。`, `Start by clicking “${name(L.start)}”.`)}
      panel={
        <>
          <div className="pcard">
            <h3>{tr('已找到的路线', 'Routes found')}<small>{`${found.length} / ${total}`}</small></h3>
            <div className="routes">
              {found.length ? found.map((r, k) => <div key={k} className="route">{`${k + 1}. ${walk(r)}`}</div>) : <div className="route empty">{tr('还没有', 'None yet')}</div>}
              {route.length > 0 && <div className="route now">{`${tr('正在走：', 'Walking: ')}${walk(route)}`}</div>}
            </div>
          </div>
          <div className="pcard"><h3>{tr('规则', 'Rule')}</h3><p>{tr(`只能顺着箭头走。点到「${name(L.end)}」就记下一条路线；同一条路线只算一次。`, `You can only follow the arrows. Reaching “${name(L.end)}” records a route; each route counts only once.`)}</p></div>
        </>
      }
      dock={{
        meta: tr(<>已找到 <b>{found.length}</b>{` / ${total} 条`}</>, <>Found <b>{found.length}</b>{` / ${total}`}</>),
        secondary: route.length ? { label: tr('撤销一步', 'Undo a step'), onClick: () => setRoute(route.slice(0, -1)) } : null,
      }}
    >
      {toastEl}
    </HandLevel>
  )
}
