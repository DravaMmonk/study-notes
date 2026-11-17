// Draw two routes through a maze of a key and doors that make a counterexample: the same cell, one with the key and
// one without, a door next.
import { useState } from 'react'
import { rcName } from '../../../core/model/algo.js'
import { E, W } from '../../../core/model/scene.js'
import { L as text } from 'kernel/view'
import { tr } from 'table'
import { boardDrawing } from '../scene.js'
import { reduced } from 'kernel/view'
import { buzz, useLater, useVerdict } from 'kernel/view'

const rc = (id) => id.split(',').map(Number)

export default function useBreach({ level, solve, fail, toast }) {
  const L = level.source
  const w = L.maze, kid = w.key.join(','), doors = new Set(w.doors.map((d) => d.join(',')))
  const [routes, setRoutes] = useState({ A: [], B: [] })
  const [active, setActive] = useState('A')
  const [msg, setMsg] = useState(null) // { cls, body() } what the check found
  const [tries, setTries] = useState(0)
  const verdict = useVerdict({ hints: L.hints, solve, fail })
  const later = useLater()
  const route = routes[active]
  const gotKey = (r) => r.includes(kid)
  const info = (r) => {
    const x = routes[r]
    return x.length ? tr(`${x.length - 1} 步 · 停在${rcName(x.at(-1))} · ${gotKey(x) ? '拿了钥匙' : '没拿钥匙'}`, `${x.length - 1} step${x.length === 2 ? '' : 's'} · at ${rcName(x.at(-1))} · ${gotKey(x) ? 'has the key' : 'no key'}`) : tr('还没开始', 'not started')
  }
  const setRoute = (r) => setRoutes({ ...routes, [active]: r })

  const onCell = (id) => {
    setMsg(null)
    if (!route.length) {
      if (id !== '0,0') {
        toast(tr('路线要从左上角的起点出发', 'A route has to start from the top-left corner'))
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
    const [r0, c0] = rc(last), [r, c] = rc(id)
    if (!((r === r0 && c === c0 + 1) || (r === r0 + 1 && c === c0))) {
      toast(tr('只能从路线的最后一格，往右或往下走一格', 'You can only go one cell right or down from the route’s last cell'))
      buzz(20)
      return
    }
    if (doors.has(id) && !gotKey(route)) {
      toast(tr('没有钥匙，过不了这扇门', 'Without the key you can’t get through this door'))
      buzz([20, 40, 20])
      return
    }
    setRoute([...route, id])
    buzz(6)
  }

  const check = () => {
    const { A, B } = routes
    const bad = (zh, en) => {
      const n = tries + 1
      setTries(n)
      setMsg({ cls: 'bad', body: () => n >= 2 ? [tr(zh(), en()), '', tr(`<b>提示</b>：${text(L.hintText)}`, `<b>Hint</b>: ${text(L.hintText)}`)] : tr(zh(), en()) })
      buzz([20, 40, 20])
    }
    if (!A.length || !B.length) return bad(() => '先画好两条路线。在规则面板里切换 A 和 B。', () => 'Draw both routes first. Switch between A and B in the side panel.')
    const ea = A.at(-1), eb = B.at(-1)
    if (ea !== eb) return bad(() => `两条路线停在不同的格子：A 在${rcName(ea)}，B 在${rcName(eb)}。计数器当然分得清不同的格子，让它们停在同一格。`, () => `The routes stop on different cells: A at ${rcName(ea)}, B at ${rcName(eb)}. Of course the counter can tell different cells apart. Make them stop on the same cell.`)
    const both = gotKey(A)
    if (gotKey(A) === gotKey(B)) return bad(() => `两条路线${both ? '都拿了' : '都没拿'}钥匙。它们不光状态相同，未来也一样，这不算破绽。让一条拿钥匙，另一条不拿。`, () => `${both ? 'Both routes have' : 'Neither route has'} the key. They share not only a state but also a future, so this is no flaw. Let one take the key and the other not.`)
    const [r, c] = rc(ea), next = [`${r},${c + 1}`, `${r + 1},${c}`].filter((id) => doors.has(id))
    if (!next.length) return bad(() => `它们在${rcName(ea)}汇合，一条有钥匙，一条没有。可从这里往右或往下一步都碰不到门，暂时还看不出区别。让它们在门的左边或上面汇合。`, () => `They meet at ${rcName(ea)}, one with the key and one without. But one step right or down from there never reaches a door, so there is no difference to see yet. Make them meet just left of or above a door.`)
    const keyed = gotKey(A) ? 'A' : 'B', other = keyed === 'A' ? 'B' : 'A'
    setMsg({ cls: 'good', body: () => tr(`找到了！两条路线都停在${rcName(ea)}。路线 ${keyed} 带着钥匙，下一步能穿过${rcName(next[0])}的门；路线 ${other} 空着手，过不去。可在只记位置的计数器眼里，它们是同一个状态。`, `Found it! Both routes stop at ${rcName(ea)}. Route ${keyed} carries the key and can go through the door at ${rcName(next[0])} next; route ${other} is empty-handed and can’t. Yet to a counter that only remembers position, they are the same state.`) })
    buzz(15)
    later(() => verdict.pass({ routes }), reduced() ? 0 : 900)
  }

  const sp = 66, sz = 58, cells = [], edges = [], end = `${w.R - 1},${w.C - 1}`, tail = route.at(-1)
  for (let r = 0; r < w.R; r++) for (let c = 0; c < w.C; c++) {
    const id = `${r},${c}`, a = routes.A.includes(id), b = routes.B.includes(id)
    const cls = [id === kid ? 'key' : '', doors.has(id) ? 'door' : '', a && b ? 'rab' : a ? 'ra' : b ? 'rb' : '', id === tail ? 'sel' : '']
    cells.push({ id, x: c * sp, y: r * sp, w: sz, h: sz, value: a && b ? 'A B' : a ? 'A' : b ? 'B' : '', label: id === kid ? W.key : doors.has(id) ? W.door : '', corner: id === '0,0' ? W.start : id === end ? W.end : '', cls: cls.filter(Boolean).join(' '), tap: true, aria: rcName(id) })
    if (c + 1 < w.C) edges.push(E(id, `${r},${c + 1}`, 'dim'))
    if (r + 1 < w.R) edges.push(E(id, `${r + 1},${c}`, 'dim'))
  }
  routes.A.slice(1).forEach((id, q) => edges.push(E(routes.A[q], id, 'ra', 0, -4)))
  routes.B.slice(1).forEach((id, q) => edges.push(E(routes.B[q], id, 'rb', 0, 4)))

  return {
    drawing: boardDrawing({ cells, edges }, { label: tr('棋盘', 'Board'), maxScale: 1.2 }, onCell),
    note: tr(`正在画路线 ${active}。点路线的最后一格可以撤销一步。`, `Drawing route ${active}. Click the route’s last cell to undo a step.`),
    cards: [{
      title: tr('两条路线', 'Two routes'),
      choices: {
        label: tr('正在画的路线', 'Route being drawn'),
        items: ['A', 'B'].map((r) => ({ label: `${tr('路线', 'Route')} ${r}`, className: `route-${r}`, current: active === r, select: () => setActive(r) })),
      },
      list: ['A', 'B'].map((r) => ({ text: `${r}${tr('：', ': ')}${info(r)}`, tone: `r${r.toLowerCase()}-line` })),
      action: { label: tr(`清空路线 ${active}`, `Clear route ${active}`), disabled: !route.length, run: () => { setRoute([]); setMsg(null) } },
    }, ...(msg ? [{ title: tr('检验结果', 'Check result'), feedback: msg }] : []), {
      title: tr('合格的反例', 'A valid counterexample'),
      body: tr(
        ['1. 两条路线停在<b>同一格</b>：在计数器眼里，它们是同一个状态。', '2. 一条<b>拿了钥匙</b>，一条<b>没拿</b>。', '3. 从这一格往右或往下一步，<b>就是门</b>：它们的未来不同。'],
        ['1. Both routes stop on <b>the same cell</b>: to the counter, they are the same state.', '2. One <b>has picked up the key</b>, the other <b>has not</b>.', '3. One step right or down from that cell <b>is a door</b>: their futures differ.'],
      ),
    }],
    dock: {
      meta: tr(`正在画 <b>路线 ${active}</b>`, `Drawing <b>route ${active}</b>`),
      secondary: route.length ? { label: tr('撤销一步', 'Undo a step'), onClick: () => { setRoute(route.slice(0, -1)); setMsg(null) } } : null,
      go: { label: tr('检验', 'Check'), icon: 'check', onClick: check },
    },
  }
}
