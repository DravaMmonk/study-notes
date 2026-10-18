import { useEffect, useRef, useState } from 'react'
import { enableDrag } from '../drag.js'
import { L, tr } from '../shell/i18n.js'
import { baseRefusal, byId, connect, ends, feeding, inPort, layout, moveToSlot, outPort, outputsOf, parsePort, placement, removeNode, srcNode, srcOf } from './model.js'
import { drawWires } from './SlotBoard.jsx'
import { useHistory } from './useHistory.js'

const buzz = (pattern = 8) => navigator.vibrate?.(pattern)
export const NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'

/**
 * How the phone board is edited, the same in every game. Wires go dot to dot: tap one dot, then another (or the
 * block itself), or drag between them; tapping a wired input unplugs it. Parts come from the tray: tap to drop into
 * the next free slot, or hold and drag into a slot; holding a placed part moves it, and dragging it back onto the
 * tray removes it. Every change can be undone and redone (useHistory); clearing asks twice.
 *
 * @param graph, onChange(graph), parts            the circuit and the game's description of its nodes (model.js)
 * @param create(graph, type, at) → { graph, id }  add a part of `type` in slot `at` (the game makes its nodes)
 * @param label(node)                              a block's own name (without its number)
 * @param openNode(id), openSlot(at)               the game's sheets for a block and an empty slot
 * @param autoWire                                 wire the very first part between the only source and the sink
 * @param reset()                                  start the circuit over
 * @param root, scroller                           refs to the element that holds the board and tray, and to the board's
 *                                                 scrolling pane (drags start inside `root` and scroll `scroller`)
 * @param scope                                    names the board for undo (a level's stage)
 * @returns state and handlers for SlotBoard (`history`: its undo and redo), Tray and Notice
 */
export function useSlotEditing({ graph, onChange, parts, create, label, openNode, openSlot, autoWire = false, reset, root, scroller, scope }) {
  const [picking, setPicking] = useState(null) // a port id, while choosing where its wire goes
  const history = useHistory(graph, onChange, scope)
  const [toast, setToast] = useState(null) // a { zh, en } pair, read in the current language when shown
  const [armed, setArmed] = useState(false)
  const { sources, steps, sinks } = layout(graph, parts)
  const slots = placement(graph, parts).cell
  const ordered = [...slots.keys()].sort((a, b) => slots.get(a) - slots.get(b))

  const nameOf = (node) => {
    if (!node) return ''
    if (parts.role(node) !== 'part') return L(label(node))
    const index = ordered.indexOf(node.id)
    return `${NUMBERS[index] ?? `#${index + 1}`} ${L(label(node))}`
  }
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
  useEffect(() => {
    if (!armed) return undefined
    const timer = setTimeout(() => setArmed(false), 2600)
    return () => clearTimeout(timer)
  }, [armed])

  // Wiring: a source (an output dot) to a sink (an input dot), in either order.
  const refusal = (a, b) => {
    const e = ends(a, b)
    if (!e) return { zh: '两头都是输出口（或都是输入口）：一头接输出，一头接输入。', en: 'Both ends are outputs (or both inputs): connect an output to an input.' }
    return baseRefusal(graph, e.from, e.to) ?? parts.refuse?.(graph, e.from, e.to, e.port) ?? null
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
    if (!picking) {
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
      setToast({ zh: '这一块没有能接这根线的口', en: 'This block has no port this wire can go to' })
      return false
    }
    return wire(p, inPort(id, open))
  }
  // While a dot is picked, tapping a block wires it too; otherwise it opens the block's sheet.
  const onNode = (id) => {
    if (picking) {
      if (wireToCard(picking, id)) setPicking(null)
      return
    }
    buzz(4)
    openNode(id)
  }
  const onSlot = (at) => {
    setPicking(null)
    openSlot?.(at)
  }

  // Placing parts. The very first part of a one-source level can be wired in for you, so the board shows something
  // at once; after that, wiring is the player's.
  const place = (type, at) => {
    let { graph: next, id } = create(graph, type, at)
    // An input part goes up with the inputs, not into a slot.
    let note = parts.role(byId(next, id) ?? {}) === 'source'
      ? { zh: '放在了最上面的输入区 · 从圆点拉线接上', en: 'Placed with the inputs at the top · wire it up from the dots' }
      : { zh: `放进了第 ${at + 1} 格 · 从圆点拉线接上`, en: `Placed in slot ${at + 1} · wire it up from the dots` }
    const sink = sinks[0]
    const [sinkPort] = sink ? parts.inputs(sink) : []
    if (autoWire && !steps.length && sources.length === 1 && sink && !feeding(next, sink.id, sinkPort)) {
      const node = byId(next, id)
      const [first] = parts.inputs(node)
      if (first) next = connect(next, id, first, srcOf(sources[0], outputsOf(parts, sources[0])[0].key))
      next = connect(next, sink.id, sinkPort, id)
      note = { zh: `接好了：${nameOf(sources[0])} → ${L(label(node))} → ${nameOf(sink)}`, en: `Wired up: ${nameOf(sources[0])} → ${L(label(node))} → ${nameOf(sink)}` }
    }
    buzz()
    edit(next, note)
  }
  const placeFirstFree = (type) => place(type, placement(graph, parts).free[0])
  const remove = (id) => {
    buzz([6, 40, 6])
    edit(removeNode(graph, id), { zh: `拿掉了 ${nameOf(byId(graph, id))}`, en: `Removed ${nameOf(byId(graph, id))}` })
  }
  const clear = () => {
    if (!armed) {
      buzz(4)
      setArmed(true)
      return
    }
    setArmed(false)
    reset()
    setToast({ zh: '清空了电路', en: 'Circuit cleared' })
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
        if (g.kind === 'port' && over) {
          if (over.dataset.p && over.dataset.p !== g.id) now.wire(g.id, over.dataset.p)
          else if (over.dataset.piece) now.wireToCard(g.id, over.dataset.piece)
        }
        if (g.kind === 'tray' && slot !== null) {
          if (placement(now.graph, now.parts).free.includes(slot)) now.place(g.id, slot)
          else now.say({ zh: '这一格已经有元件了', en: 'That slot already has a part' })
        }
        if (g.kind === 'piece' && over) {
          if (slot !== null) now.edit(moveToSlot(now.graph, now.parts, g.id, slot))
          else now.remove(g.id)
        }
        if (board()) drawWires(board(), now.graph, now.parts)
      },
      end: () => board() && drawWires(board(), latest.current.graph, latest.current.parts),
    }
    return enableDrag(el, () => handlers)
  }, [])

  // While a dot is picked, the banner says what to tap next.
  const pickNote = picking && (() => {
    const p = parsePort(picking)
    const node = byId(graph, srcNode(p.id))
    const many = parts.inputs(node).length > 1
    return p.side === 'out'
      ? tr(`「${nameOf(node)}」接到哪？点一个输入口（块顶上的圆点），或点那一块`, `Where does "${nameOf(node)}" go? Tap an input (a dot on top of a block), or the block itself`)
      : tr(`「${nameOf(node)}」${many ? `的 ${L(parts.portLabel?.(node, p.port) ?? p.port)} ` : ''}读哪个结果？点一个输出口（块底下的圆点），或点那一块`, `Which result does "${nameOf(node)}"${many ? ` ${L(parts.portLabel?.(node, p.port) ?? p.port)}` : ''} read? Tap an output (a dot under a block), or the block itself`)
  })()

  return {
    picking, unpick: () => setPicking(null), canLand, onPort, onNode, onSlot, nameOf,
    place, placeFirstFree, remove, edit, clear, armed, toast, say: setToast, pickNote,
    history: { ...history, undo: step(history.undo), redo: step(history.redo) },
    sources, steps, sinks,
  }
}
