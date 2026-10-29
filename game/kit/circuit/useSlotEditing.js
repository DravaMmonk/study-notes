import { useEffect, useRef, useState } from 'react'
import { enableDrag } from '../drag.js'
import { L, tr } from '../shell/i18n.js'
import { baseRefusal, byId, connect, ends, feeding, inPort, keepLocked, layout, lockedRefusal, moveToSlot, outPort, outputsOf, parsePort, placement, removeNode, srcNode, srcOf } from './model.js'
import { drawWires } from './SlotBoard.jsx'
import { useHistory } from './useHistory.js'

const buzz = (pattern = 8) => navigator.vibrate?.(pattern)
export const NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'

/**
 * How the phone board is edited, the same in every game. Wires go dot to dot: tap one dot, then another (or the
 * block itself), or drag between them; tapping a wired input unplugs it. Parts come from the tray: tap to drop into
 * the next free slot, or hold and drag into a slot; holding a placed part moves it, and dragging it back onto the
 * tray removes it. A part's sheet can also start a move (startMove): the next slot tapped takes it, and tapping another
 * part swaps the two. A frame's regions are grids of their own (model.js placement): a slot there is the same, and a
 * part dragged into one moves into the frame, or out of it onto the board. Every change can be undone and redone (useHistory).
 *
 * @param graph, onChange(graph), parts            the circuit and the game's description of its nodes (model.js)
 * @param create(graph, type, at, region) → { graph, id }  add a part of `type` in slot `at` of `region` (null: the
 *                                                 board itself; the game makes its nodes)
 * @param label(node)                              a block's own name (without its number)
 * @param openNode(id), openSlot(at, region)       the game's sheets for a block and an empty slot
 * @param root, scroller                           refs to the element that holds the board and tray, and to the board's
 *                                                 scrolling pane (drags start inside `root` and scroll `scroller`)
 * @param scope                                    names the board for undo (a level's stage)
 * @returns state and handlers for SlotBoard (`history`: its undo and redo), Tray and Notice
 */
const LOCKED_MOVE = { zh: '关卡放好的元件不能删，只能在原来的区域里挪动。', en: 'A part the level placed cannot be deleted; it moves only within its own region.' }

export function useSlotEditing({ graph, onChange: given, parts, create, label, openNode, openSlot, root, scroller, scope }) {
  const [picking, setPicking] = useState(null) // a port id, while choosing where its wire goes
  const [moving, setMoving] = useState(null) // a part's id, while choosing the slot it moves to
  // A change never takes off what the level locked on the board (model.js keepLocked).
  const onChange = (next) => given(keepLocked(graph, next))
  const history = useHistory(graph, onChange, scope)
  const [toast, setToast] = useState(null) // a { zh, en } pair, read in the current language when shown
  const { sources, steps, sinks } = layout(graph, parts)
  // Parts are numbered in reading order: the board's slots, and a frame's regions right after the frame.
  const orderOf = (g) => {
    const ordered = []
    const walk = (region) => {
      const { cell } = placement(g, parts, region)
      for (const id of [...cell.keys()].sort((x, y) => cell.get(x) - cell.get(y))) {
        ordered.push(id)
        for (const r of parts.frames?.(byId(g, id)) ?? []) walk(`${id}/${r.name}`)
      }
    }
    walk(null)
    return ordered
  }
  const ordered = orderOf(graph)
  // A part's name with its number on board `g` (the board as it is, or as it is about to be).
  const nameIn = (g, node, order = g === graph ? ordered : orderOf(g)) => {
    if (!node) return ''
    if (parts.role(node) !== 'part') return L(label(node))
    const index = order.indexOf(node.id)
    return `${NUMBERS[index] ?? `#${index + 1}`} ${L(label(node))}`
  }
  const nameOf = (node) => nameIn(graph, node)
  const edit = (next, note) => {
    onChange(next)
    setToast(note ?? null)
  }
  const step = (go) => () => {
    buzz()
    go()
    setToast(null)
    setPicking(null)
  }
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3600)
    return () => clearTimeout(timer)
  }, [toast])

  // Wiring: a source (an output dot) to a sink (an input dot), in either order.
  const refusal = (a, b) => {
    const e = ends(a, b)
    if (!e) return { zh: '两头都是输出口（或都是输入口）：一头接输出，一头接输入。', en: 'Both ends are outputs (or both inputs): connect an output to an input.' }
    return baseRefusal(graph, e.from, e.to, e.port, parts) ?? parts.refuse?.(graph, e.from, e.to, e.port) ?? null
  }
  const canLand = (p) => Boolean(picking) && !refusal(picking, p)
  const wire = (a, b) => {
    const why = refusal(a, b)
    if (why) {
      buzz(20)
      setToast(why)
      return false
    }
    const { from, to, port } = ends(a, b)
    buzz()
    edit(connect(graph, to, port, from))
    return true
  }
  const onPort = (p) => {
    const side = parsePort(p)
    setMoving(null)
    if (!picking) {
      const locked = side.side === 'in' && lockedRefusal(graph, side.id, side.port)
      if (locked) {
        buzz(20)
        setToast(locked)
        return
      }
      if (side.side === 'in' && feeding(graph, side.id, side.port)) {
        buzz([6, 30, 6])
        edit(connect(graph, side.id, side.port, null), { zh: '拆掉了一根线', en: 'Unplugged a wire' })
        return
      }
      buzz(4)
      setPicking(p)
      return
    }
    if (picking === p) return setPicking(null)
    if (parsePort(picking).side === side.side) return setPicking(p)
    if (wire(picking, p)) setPicking(null)
  }
  // A wire from port `p` dropped on (or, with `p` picked, tapped onto) a block lands on its output, or on its first
  // free input that takes it.
  const wireToCard = (p, id) => {
    const node = byId(graph, id)
    // An input dropped on a block with several outputs takes its first.
    if (parsePort(p).side === 'in') return parts.role(node) !== 'sink' && wire(p, outPort(srcOf(node, outputsOf(parts, node)[0].key)))
    const ports = parts.inputs(node)
    const open = ports.find((port) => !feeding(graph, id, port) && !refusal(p, inPort(id, port))) ?? ports.find((port) => !refusal(p, inPort(id, port)))
    if (!open) {
      setToast({ zh: '这个元件没有能接这根线的口', en: 'This part has no port this wire can go to' })
      return false
    }
    return wire(p, inPort(id, open))
  }
  // Moving a part (from its sheet): the next slot tapped takes it; a slot with a part in it swaps the two.
  const moveTo = (at, region = null) => {
    const name = nameOf(byId(graph, moving))
    const other = [...placement(graph, parts, region).cell].find(([, slot]) => slot === at)?.[0]
    const node = byId(graph, moving)
    setMoving(null)
    // A locked part moves only within the region it sits in.
    if (node?.locked && region !== (node.in ?? null)) return setToast(LOCKED_MOVE)
    const next = moveToSlot(graph, parts, node.id, at, region)
    if (next === graph) return
    buzz()
    edit(next, other && other !== moving
      ? { zh: `「${name}」和「${nameOf(byId(graph, other))}」换了位置`, en: `Swapped "${name}" and "${nameOf(byId(graph, other))}"` }
      : { zh: `把「${name}」移到了这一格`, en: `Moved "${name}" here` })
  }
  const startMove = (id) => {
    if (parts.role(byId(graph, id) ?? {}) !== 'part') return
    setPicking(null)
    setMoving(id)
  }
  // While a dot is picked, tapping a block wires it too; while a part is moving, tapping another part swaps them;
  // otherwise it opens the block's sheet.
  const onNode = (id) => {
    if (moving) {
      const node = byId(graph, id)
      const slot = placement(graph, parts, node.in ?? null).cell.get(id)
      if (id === moving || parts.role(node) !== 'part' || slot === undefined) return setMoving(null)
      return moveTo(slot, node.in ?? null)
    }
    if (picking) {
      if (wireToCard(picking, id)) setPicking(null)
      return
    }
    buzz(4)
    openNode(id)
  }
  const onSlot = (at, region = null) => {
    setPicking(null)
    if (moving) return moveTo(at, region)
    openSlot?.(at, region)
  }

  // Placing parts. Wiring is always the player's.
  const place = (type, at, region = null) => {
    const { graph: next, id } = create(graph, type, at, region)
    // An input part goes up with the inputs, not into a slot.
    const name = nameIn(next, byId(next, id))
    const note = parts.role(byId(next, id) ?? {}) === 'source'
      ? { zh: `放下了「${name}」，在最上面的输入区 · 从圆点拉线接上`, en: `Placed "${name}" with the inputs at the top · wire it up from the dots` }
      : { zh: `放下了「${name}」 · 从圆点拉线接上`, en: `Placed "${name}" · wire it up from the dots` }
    buzz()
    edit(next, note)
  }
  const placeFirstFree = (type) => place(type, placement(graph, parts).free[0])
  const remove = (id) => {
    if (byId(graph, id)?.locked) return
    buzz([6, 40, 6])
    setMoving(null)
    edit(removeNode(graph, id), { zh: `删除了「${nameOf(byId(graph, id))}」`, en: `Deleted "${nameOf(byId(graph, id))}"` })
  }

  // Drag and drop on the board, the tray and the dots, through the kit's drag.js. Handlers read the latest state
  // through a ref.
  const latest = useRef(null)
  useEffect(() => {
    latest.current = { graph, parts, wire, place, edit, remove, say: setToast, unpick: () => setPicking(null), wireToCard }
  })
  useEffect(() => {
    const el = root.current
    if (!el) return undefined
    const board = () => el.querySelector('.pb-board')
    const handlers = {
      scroller: scroller.current,
      start: (g) => g.kind === 'port' && latest.current.unpick(),
      move: (g) => g.kind === 'port' && board() && drawWires(board(), latest.current.graph, latest.current.parts, { from: g.id, x: g.x, y: g.y }),
      drop: (g) => {
        const now = latest.current
        const over = g.over
        const slot = over?.dataset.slot !== undefined && over ? Number(over.dataset.slot) : null
        const region = over?.dataset.region || null
        if (g.kind === 'port' && over) {
          if (over.dataset.p && over.dataset.p !== g.id) now.wire(g.id, over.dataset.p)
          else if (over.dataset.piece) now.wireToCard(g.id, over.dataset.piece)
        }
        if (g.kind === 'tray' && slot !== null) {
          if (placement(now.graph, now.parts, region).free.includes(slot)) now.place(g.id, slot, region)
          else now.say({ zh: '这一格已经有元件了', en: 'That slot already has a part' })
        }
        if (g.kind === 'piece' && over) {
          const piece = byId(now.graph, g.id)
          if (piece?.locked && (slot === null || region !== (piece.in ?? null))) now.say(LOCKED_MOVE)
          else if (slot !== null) now.edit(moveToSlot(now.graph, now.parts, g.id, slot, region))
          else now.remove(g.id)
        }
        if (board()) drawWires(board(), now.graph, now.parts)
      },
      end: () => board() && drawWires(board(), latest.current.graph, latest.current.parts),
    }
    return enableDrag(el, () => handlers)
  }, [])

  // While a dot is picked, or a part is moving, the banner says what to tap next.
  const pickNote = moving ? tr(`把「${nameOf(byId(graph, moving))}」移到哪？点一个格子`, `Where does "${nameOf(byId(graph, moving))}" go? Tap a slot`) : picking && (() => {
    const p = parsePort(picking)
    const node = byId(graph, srcNode(p.id))
    const many = parts.inputs(node).length > 1
    return p.side === 'out'
      ? tr(`「${nameOf(node)}」接到哪？点一个输入口（元件顶上的圆点），或点那个元件`, `Where does "${nameOf(node)}" go? Tap an input (a dot on top of a part), or the part itself`)
      : tr(`「${nameOf(node)}」${many ? `的 ${L(parts.portLabel?.(node, p.port) ?? p.port)} ` : ''}读哪个结果？点一个输出口（元件底下的圆点），或点那个元件`, `Which result does "${nameOf(node)}"${many ? ` ${L(parts.portLabel?.(node, p.port) ?? p.port)}` : ''} read? Tap an output (a dot under a part), or the part itself`)
  })()

  return {
    picking, moving, startMove, unpick: () => { setPicking(null); setMoving(null) }, canLand, onPort, onNode, onSlot, nameOf,
    place, placeFirstFree, remove, edit, toast, say: setToast, pickNote,
    history: { ...history, undo: step(history.undo), redo: step(history.redo) },
    sources, steps, sinks,
  }
}
