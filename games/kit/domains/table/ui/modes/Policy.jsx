// The arrows grow by themselves: on a map whose values have settled, walk the robot to the treasure by always stepping
// to the best neighbour; then every cell shows its arrow.
import { useMemo, useState } from 'react'
import { signal } from '../../model/format.js'
import { E } from '../../model/scene.js'
import { rcName } from '../../model/algo.js'
import { settle, policy, tileAt } from '../../model/worlds/value.js'
import { ROBOTS } from '../../model/robots.js'
import { T, tr } from '../../lang.js'
import HandLevel from '../HandLevel.jsx'
import Scene from '../Scene.jsx'
import { buzz, reduced, useLater, useVerdict } from '../play.jsx'

const LABEL = { gold: T('宝藏', 'treasure'), trap: T('陷阱', 'trap') }

export default function Policy({ game, level, phone, solve, fail }) {
  const L = level.source
  const t = L.map
  const table = useMemo(() => settle(t), [t])
  const [k, setK] = useState(0)
  const [path, setPath] = useState(() => [L.starts[0].join()])
  const [msg, setMsg] = useState(null) // { cls, body() }
  const [done, setDone] = useState(false)
  const verdict = useVerdict({ level, solve, fail })
  const later = useLater()
  const val = (id) => table.get(id)
  const near = (id) => {
    const [r, c] = id.split(',').map(Number)
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([y, x]) => y >= 0 && x >= 0 && y < t.R && x < t.C && tileAt(t, y, x) !== 'wall').map((p) => p.join())
  }
  const here = path.at(-1)
  const best = (id) => Math.max(...near(id).map(val))

  const onCell = (id) => {
    if (done || !near(here).includes(id)) return
    if (val(id) < best(here)) {
      const v = val(id), top = best(here)
      setMsg({ cls: 'bad', body: () => tr(<>{rcName(id)}的价值是 <b>{signal(v)}</b>，可旁边还有 <b>{signal(top)}</b> 的格子。走那一格离宝藏更近。</>, <>{rcName(id)} has a value of <b>{signal(v)}</b>, but there is a neighbour worth <b>{signal(top)}</b>. That cell is closer to the treasure.</>) })
      buzz(20)
      return
    }
    buzz(8)
    if (tileAt(t, ...id.split(',').map(Number)) !== 'gold') {
      setPath([...path, id])
      setMsg(null)
      return
    }
    const next = k + 1
    setK(next)
    if (next < L.starts.length) {
      const n = path.length
      setMsg({ cls: 'good', body: () => tr(`到了，走了 ${n} 步。换一个起点。`, `Made it in ${n} steps. On to another start.`) })
      setPath([L.starts[next].join()])
      return
    }
    setPath([...path, id])
    setDone(true)
    setMsg({ cls: 'good', body: () => tr('三个起点都走到了宝藏。', 'All three starts reached the treasure.') })
    later(verdict.pass, reduced() ? 0 : 1600)
  }

  const on = new Set(path), opts = done ? [] : near(here), cells = []
  for (let r = 0; r < t.R; r++) for (let c = 0; c < t.C; c++) {
    const id = `${r},${c}`, kind = tileAt(t, r, c)
    cells.push({ id, x: c * 64, y: r * 64, w: 56, h: 56, value: kind === 'wall' ? '' : signal(val(id)), label: LABEL[kind] || '', cls: [kind === 'wall' ? 'rock' : kind === 'floor' ? 'lit' : kind, on.has(id) ? 'path' : '', opts.includes(id) ? 'pred' : ''].filter(Boolean).join(' '), tap: opts.includes(id), aria: rcName(id) })
  }
  const edges = []
  for (let q = 0; q + 1 < path.length; q++) edges.push(E(path[q], path[q + 1], 'good'))
  if (done) policy(t, table).forEach(([a, b]) => edges.push(E(a, b, 'sel')))
  const scene = { cells, edges, robot: done ? null : here, look: ROBOTS.scout.look }
  const at = Math.min(k + 1, L.starts.length)
  return (
    <HandLevel
      game={game}
      level={level}
      phone={phone}
      board={<Scene scene={scene} opt={{ label: tr('棋盘', 'Board'), minScale: 0.7, maxScale: 1.15 }} onCell={onCell} />}
      note={done ? tr('每一格都长出了一根箭头：指向四个邻居里价值最大的那一格。从任何一格出发，顺着箭头走，都能到宝藏。', 'Every cell has grown an arrow pointing to its neighbour with the largest value. Start from any cell, follow the arrows, and you reach the treasure.') : tr(`起点 ${k + 1} / ${L.starts.length}：点一个虚线框的邻居，让机器人走过去。`, `Start ${k + 1} / ${L.starts.length}: click a neighbour in a dashed frame to move the robot there.`)}
      panel={
        <div className="pcard">
          <h3>{tr('怎么走', 'Which way')}<small>{tr(`起点 ${at} / ${L.starts.length}`, `start ${at} / ${L.starts.length}`)}</small></h3>
          <p>{tr(<>每一格的数，是站在这里有多好：离宝藏越近越大，每远一步打个九折。机器人每一步都走到<b>四个邻居里数最大</b>的那一格。</>, <>Each cell’s number says how good it is to stand there: the closer to the treasure, the bigger, with 10% knocked off for every step further away. At every step the robot moves to <b>the neighbour with the biggest number</b>.</>)}</p>
          {msg && <div className={`msg ${msg.cls}`}>{msg.body()}</div>}
        </div>
      }
      dock={{
        meta: done ? tr('全部走到了', 'All the way there') : tr(<>已经走了 <b>{path.length - 1}</b> 步</>, <><b>{path.length - 1}</b> steps so far</>),
        secondary: done ? null : { label: tr('这个起点重走', 'Redo this start'), onClick: () => { setPath([L.starts[k].join()]); setMsg(null) } },
      }}
    />
  )
}
