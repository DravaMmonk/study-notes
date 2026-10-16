import { createElement, useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, Check, ChevronDown, ChevronRight, Circle, Play, Trash2, Undo2, X } from 'lucide-react'
import { wouldCycle } from '../../engine/graph.js'
import { NODE_TYPES, inputsOf } from '../../engine/nodes.js'
import { describe, familyOf, iconOf } from '../catalog.js'
import ValueView from '../views/ValueView.jsx'
import ViewSwitch from '../views/ViewSwitch.jsx'
import { KIND_NAMES, kindOf, nodeView } from '../views/views.js'
import { enableDrag } from '../../../../../games/kit/drag.js'
import { ChoiceEditor, KernelEditor, NumberEditor } from './Editors.jsx'
import { NUMBERS, connect, feeding, layout, moveTo, placeAt, placement, removeNode, setParam } from './ops.js'
import { AddSheet, ParamChip, SourceSheet, TestCarousel } from './parts.jsx'
import Sheet from './Sheet.jsx'
import SlotBoard from './SlotBoard.jsx'
import { PORT_TAGS, drawWires, inPort, outPort, parsePort } from './wires.js'
import './phone.css'

const buzz = (pattern = 8) => navigator.vibrate?.(pattern)

// The phone's circuit screen, after the board in 状态之图: the level's inputs on top, parts in a
// grid of slots that keep their place, the outputs at the bottom, each block showing its result on
// the current test. Wires go dot to dot (tap one dot, then another, or drag between them); tapping a
// wired input unplugs it. Parts come from the tray (tap to drop into the next free slot, or hold and
// drag into a slot); holding a placed part moves it, or drags it back onto the tray to remove it.
export default function PhoneCircuit({ level, hiddenCount = 0, hiddenMiss, graph, onChange, onReset, run, onTest, testIndex, onTestIndex, flags, inputLabels, outputLabels, ioKinds, views, theme, scan, onScan, brief, training, footer, testDetails }) {
  const [picking, setPicking] = useState(null) // a port id, while choosing where its wire goes
  const [sheet, setSheet] = useState(null)
  const [history, setHistory] = useState([])
  const [toast, setToast] = useState(null)
  const [armed, setArmed] = useState(false)
  const [briefOpen, setBriefOpen] = useState(true)
  const root = useRef(null)
  const scroller = useRef(null)
  const values = run?.results[testIndex]?.values
  const errors = run?.results[testIndex]?.errors
  const checks = run?.results[testIndex]?.checks
  const { sources, steps } = layout(graph)
  const passed = run?.results.filter((r) => r.pass).length ?? 0
  const all = level.tests.length
  const byId = (id) => graph.nodes.find((n) => n.id === id)
  // Parts are numbered in the order of their slots, so a number stays put while wires change.
  const slots = placement(graph).cell
  const order = [...slots.keys()].sort((a, b) => slots.get(a) - slots.get(b))

  const edit = (next, note) => {
    setHistory((h) => [...h.slice(-49), graph])
    onChange(next)
    setToast(note ?? null)
  }
  const undo = () => {
    if (!history.length) return
    buzz()
    onChange(history.at(-1))
    setHistory((h) => h.slice(0, -1))
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
  const wasPassing = useRef(run?.pass)
  useEffect(() => {
    if (run?.pass && !wasPassing.current) buzz([12, 60, 18])
    wasPassing.current = run?.pass
  }, [run?.pass])

  const nameOf = (n) => {
    if (!n) return ''
    if (n.type === 'input') return inputLabels?.[n.params.name] ?? (sources.length > 1 ? n.params.name : '输入')
    if (n.type === 'output') return outputLabels?.[n.params.name] ?? '输出'
    const index = order.indexOf(n.id)
    return `${NUMBERS[index] ?? `#${index + 1}`} ${NODE_TYPES[n.type].label}`
  }
  const thumb = (n, size = 52) => {
    const value = values?.get(n.id)
    if (errors?.get(n.id)) return <span className="ph-thumb-error" style={{ width: size, height: size }}>!</span>
    return <ValueView img={value} view={nodeView(n, views)} size={kindOf(value) === 'signal' ? size * 1.6 : size} theme={theme} label="—" />
  }

  // Wiring: a source (an output dot) to a sink (an input dot), in either order.
  const ends = (a, b) => {
    const [pa, pb] = [parsePort(a), parsePort(b)]
    if (pa.side === pb.side) return null
    const [from, to] = pa.side === 'out' ? [pa, pb] : [pb, pa]
    return { from: from.id, to: to.id, port: to.port }
  }
  const refusal = (a, b) => {
    const e = ends(a, b)
    if (!e) return '两头都是输出口（或都是输入口）：一头接输出，一头接输入。'
    if (e.from === e.to) return '一块不能读它自己。'
    if (wouldCycle(graph, e.from, e.to)) return '这样会绕成一个圈：这一块要等自己算完，才能算自己。'
    return null
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
        edit(connect(graph, side.id, side.port, null), '拆掉了一根线')
        return
      }
      buzz(4)
      setPicking(p)
      return
    }
    if (picking === p) return setPicking(null)
    if (parsePort(picking).side === side.side) return setPicking(p)
    if (wire(picking, p)) setPicking(null)
    return undefined
  }
  // A wire from port `p` dropped on (or, with `p` picked, tapped onto) a block lands on its output, or on its
  // first free input.
  const wireToCard = (p, id) => {
    const node = byId(id)
    if (parsePort(p).side === 'in') return node.type !== 'output' && wire(p, outPort(id))
    const ports = node.type === 'input' ? [] : inputsOf(node.type)
    const open = ports.find((port) => !feeding(graph, id, port) && !refusal(p, inPort(id, port))) ?? ports.find((port) => !refusal(p, inPort(id, port)))
    if (!open) {
      setToast('这一块没有能接这根线的口')
      return false
    }
    return wire(p, inPort(id, open))
  }
  // While a dot is picked, tapping a block wires it too: to its output, or to its first free input.
  const onNode = (id) => {
    if (picking) {
      if (wireToCard(picking, id)) setPicking(null)
      return undefined
    }
    buzz(4)
    setSheet({ kind: 'part', node: id })
    return undefined
  }

  // Placing parts. The very first part of a one-input level is wired in for you, so the board
  // shows something at once; after that, wiring is the player's.
  const place = (type, at) => {
    let { graph: next, id } = placeAt(graph, type, at)
    const out = next.nodes.find((n) => n.type === 'output')
    const [first] = inputsOf(type)
    let note = `放进了第 ${at + 1} 格 · 从圆点拉线接上`
    if (!steps.length && sources.length === 1 && out && !feeding(next, out.id, 'in')) {
      if (first) next = connect(next, id, first, sources[0].id)
      next = connect(next, out.id, 'in', id)
      note = `接好了：${nameOf(sources[0])} → ${NODE_TYPES[type].label} → ${nameOf(out)}`
    }
    buzz()
    edit(next, note)
    setSheet(null)
  }
  const placeFirstFree = (type) => place(type, placement(graph).free[0])
  const remove = (id) => {
    buzz([6, 40, 6])
    edit(removeNode(graph, id), `拿掉了 ${nameOf(byId(id))}`)
    setSheet(null)
  }
  // Run the tests: a pass opens the level's completion dialog; otherwise say how many passed and show the first
  // test that fails (the game selects it).
  const test = () => {
    setPicking(null)
    const { pass, passed: ok, hiddenFailed, hiddenTotal } = onTest()
    if (pass) return
    buzz(20)
    if (ok === all && hiddenFailed) setToast(`这 ${all} 组都通过了，可 ${hiddenTotal} 组隐藏测试里有 ${hiddenFailed} 组没过：电路可能只对这几张图凑巧成立`)
    else setToast(ok ? `${ok}/${all} 组通过，红色的那组还没对` : '还没有一组通过，看看输出和期望差在哪')
  }
  const clear = () => {
    if (!armed) {
      buzz(4)
      setArmed(true)
      return
    }
    setArmed(false)
    setHistory((h) => [...h.slice(-49), graph])
    onReset()
    setToast('清空了电路')
  }

  // Drag and drop on the board, the tray and the dots, through the shared circuit kit (games/kit/drag.js, also
  // used by 状态之图). Handlers read the latest props through a ref.
  const latest = useRef(null)
  const say = (note) => setToast(note)
  const unpick = () => setPicking(null)
  useEffect(() => {
    latest.current = { graph, wire, place, edit, remove, say, unpick, wireToCard }
  })
  useEffect(() => {
    const el = root.current
    const board = () => el.querySelector('.pb-board')
    const handlers = {
      scroller: scroller.current,
      start: (g) => g.kind === 'port' && latest.current.unpick(),
      move: (g) => g.kind === 'port' && board() && drawWires(board(), latest.current.graph, { from: g.id, x: g.x, y: g.y }),
      drop: (g) => {
        const L = latest.current
        const over = g.over
        const slot = over?.dataset.slot !== undefined && over ? Number(over.dataset.slot) : null
        if (g.kind === 'port' && over) {
          if (over.dataset.p && over.dataset.p !== g.id) L.wire(g.id, over.dataset.p)
          else if (over.dataset.piece) L.wireToCard(g.id, over.dataset.piece)
        }
        if (g.kind === 'tray' && slot !== null) {
          if (placement(L.graph).free.includes(slot)) L.place(g.id, slot)
          else L.say('这一格已经有元件了')
        }
        if (g.kind === 'piece' && over) {
          if (slot !== null) L.edit(moveTo(L.graph, g.id, slot))
          else L.remove(g.id)
        }
        if (board()) drawWires(board(), L.graph)
      },
      end: () => board() && drawWires(board(), latest.current.graph),
    }
    return enableDrag(el, () => handlers)
  }, [])

  const pickNote = picking && (() => {
    const p = parsePort(picking)
    const node = byId(p.id)
    return p.side === 'out' ? `「${nameOf(node)}」接到哪？点一个输入口（块顶上的圆点），或点那一块` : `「${nameOf(node)}」${inputsOf(node.type).length > 1 ? `的 ${PORT_TAGS[p.port] ?? p.port} ` : ''}读哪个结果？点一个输出口（块底下的圆点），或点那一块`
  })()

  return (
    <div className="pb" ref={root}>
      <nav className="pb-tests" aria-label="测试">
        {level.tests.map((test, index) => {
          const pass = run?.results[index]?.pass
          return (
            <button key={test.label} className={`pb-test ${index === testIndex ? 'is-on' : ''} ${pass === null ? '' : pass ? 'is-pass' : 'is-fail'}`} onClick={() => onTestIndex(index)} aria-pressed={index === testIndex}>
              {pass === null ? <Circle size={10} /> : pass ? <Check size={12} /> : <X size={12} />}{test.label}
              {test.hidden && <em className="hidden-tag">隐藏</em>}
            </button>
          )
        })}
      </nav>

      <div className="pb-scroll" ref={scroller}>
        <section className={`pb-brief ${briefOpen ? 'is-open' : ''}`}>
          <button className="pb-brief-toggle" onClick={() => setBriefOpen(!briefOpen)} aria-expanded={briefOpen}>
            <span>任务</span>
            <ChevronDown size={16} />
          </button>
          {briefOpen && <div className="pb-brief-body">{brief}</div>}
        </section>
        {!steps.length && level.palette.length > 0 && <p className="pb-howto is-first">{sources.length === 1 ? "从下面的托盘点一个元件，它会放进空格并自动接好。之后点两个圆点就能连线。" : "从下面的托盘点一个元件放进空格，再点两个圆点把它接上：一头点块底下的输出口，一头点块顶上的输入口。"}</p>}
        <SlotBoard
          graph={graph}
          values={values}
          errors={errors}
          checks={checks}
          expected={level.tests[testIndex].expected}
          views={views}
          theme={theme}
          nameOf={nameOf}
          picking={picking}
          canLand={canLand}
          onPort={onPort}
          onNode={onNode}
          onSlot={(at) => level.palette.length && setSheet({ kind: 'add', at })}
        />
        {steps.length > 0 && <p className="pb-howto">点两个圆点连线，或从一个圆点拖到另一个；点已接好的输入口就拆掉。按住一块可以挪格子，拖回下面的托盘就是拿掉。</p>}
      </div>

      {level.palette.length > 0 && (
        <section className="pb-tray" data-trash aria-label="元件托盘：点一下放进空格，按住拖到某一格">
          {level.palette.map((type) => (
            <button key={type} type="button" className="pb-part" data-tray={type} data-family={familyOf(type)} onClick={() => placeFirstFree(type)}>
              <i className="family-chip">{createElement(iconOf(type), { size: 13, strokeWidth: 1.8 })}</i>
              <b>{NODE_TYPES[type].label}</b>
            </button>
          ))}
        </section>
      )}

      <footer className="pb-bar">
        <button className="pb-icon" onClick={undo} disabled={!history.length} aria-label="撤销"><Undo2 size={18} /></button>
        <button className="pb-meta" onClick={() => setSheet({ kind: 'tests' })}>{run?.untested ? `${all} 组测试${hiddenCount ? ` + ${hiddenCount} 组隐藏` : ''} · 还没测` : hiddenMiss ? `隐藏测试 ${hiddenMiss.failed} 组没过` : `${passed}/${all} 组通过`}<small>测试详情 ›</small></button>
        {steps.length > 0 && <button className={`pb-clear ${armed ? 'is-armed' : ''}`} onClick={clear}>{armed ? '确认清空' : '清空'}</button>}
        <button className={`pb-go ${run?.pass && !hiddenMiss ? 'is-pass' : ''}`} onClick={test}>
          {run?.pass && !hiddenMiss ? <Check size={17} /> : <Play size={15} />}{run?.pass && !hiddenMiss ? '全部通过' : '运行测试'}
        </button>
      </footer>

      {pickNote ? (
        <div className="pb-banner" role="status">
          <span>{pickNote}</span>
          <button onClick={() => setPicking(null)}>取消</button>
        </div>
      ) : toast && (
        <div className="ph-toast pb-toast" role="status">
          <span>{toast}</span>
          {history.length > 0 && <button onClick={undo}>撤销</button>}
        </div>
      )}

      {sheet?.kind === 'add' && (
        <AddSheet level={level} graph={graph} previewFrom={sources[0]?.id} test={level.tests[testIndex]} title={`放进第 ${sheet.at + 1} 格`} theme={theme} onAdd={(type) => place(type, sheet.at)} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'part' && byId(sheet.node) && (() => {
        const node = byId(sheet.node)
        return (
          <Sheet title={nameOf(node)} onClose={() => setSheet(null)}>
            <PartPanel
              node={node}
              graph={graph}
              flags={flags}
              ioKinds={ioKinds}
              nameOf={nameOf}
              byId={byId}
              thumb={thumb}
              value={values?.get(node.id)}
              error={errors?.get(node.id)}
              check={node.type === 'output' ? checks?.find((c) => c.name === node.params.name) : null}
              expected={node.type === 'output' ? level.tests[testIndex].expected[node.params.name] : null}
              views={views}
              theme={theme}
              scan={scan}
              onScan={onScan}
              onSource={(port) => setSheet({ kind: 'source', node: node.id, port })}
              onParam={(key) => setSheet({ kind: 'param', node: node.id, key, before: graph })}
              onView={(v) => onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, view: v } : n)) }, { keep: true })}
              onDelete={NODE_TYPES[node.type].fixed ? null : () => remove(node.id)}
            />
          </Sheet>
        )
      })()}
      {sheet?.kind === 'source' && (
        <SourceSheet
          graph={graph}
          node={byId(sheet.node)}
          port={sheet.port}
          options={[...sources, ...steps].filter((n) => n.id !== sheet.node && !wouldCycle(graph, n.id, sheet.node))}
          nameOf={nameOf}
          thumb={thumb}
          onPick={(from) => {
            buzz()
            edit(connect(graph, sheet.node, sheet.port, from))
            setSheet({ kind: 'part', node: sheet.node })
          }}
          onClose={() => setSheet({ kind: 'part', node: sheet.node })}
        />
      )}
      {sheet?.kind === 'param' && (() => {
        const target = byId(sheet.node)
        const param = NODE_TYPES[target.type].params.find((p) => p.key === sheet.key)
        // A whole session in the sheet is one undo step: the graph from when it opened.
        const change = (v) => onChange(setParam(graph, target.id, param.key, v))
        const close = () => {
          if (graph !== sheet.before) setHistory((h) => [...h.slice(-49), sheet.before])
          setSheet({ kind: 'part', node: target.id })
        }
        return (
          <Sheet title={`${nameOf(target)} · ${param.label}`} onClose={close} footer={<div className="ph-live"><span>这一步现在的结果</span>{thumb(target, 96)}</div>}>
            {param.kind === 'select' ? <ChoiceEditor param={param} value={target.params[param.key]} onChange={change} /> : param.kind === 'kernel' ? <KernelEditor param={param} value={target.params[param.key]} onChange={change} /> : <NumberEditor param={param} value={target.params[param.key]} onChange={change} />}
          </Sheet>
        )
      })()}
      {sheet?.kind === 'tests' && (
        <Sheet title={`测试 ${passed} / ${all}`} onClose={() => setSheet(null)}>
          <div className="pb-test-sheet">
            {hiddenMiss ? (
              <p className="hidden-note is-fail">这些测试都通过了，但 {hiddenMiss.total} 组隐藏测试里有 {hiddenMiss.failed} 组没过：电路可能只对这几张图凑巧成立。</p>
            ) : hiddenCount > 0 ? (
              <p className="hidden-note">另有 {hiddenCount} 组隐藏测试，运行测试时一起检查，通关后公开。</p>
            ) : null}
            <TestCarousel level={level} run={run} testIndex={testIndex} onTestIndex={onTestIndex} theme={theme} views={views} graph={graph} />
            {training}
            <details className="pb-details">
              <summary>这组测试的详情</summary>
              {testDetails}
            </details>
            {footer}
          </div>
        </Sheet>
      )}
    </div>
  )
}

// One block in a sheet: where its inputs come from, its settings, and what it makes on this test.
function PartPanel({ node, graph, flags, ioKinds, nameOf, byId, thumb, value, error, check, expected, views, theme, scan, onScan, onSource, onParam, onView, onDelete }) {
  const spec = NODE_TYPES[node.type]
  const ports = node.type === 'input' ? [] : inputsOf(node.type)
  const params = (spec.params ?? []).filter((p) => !p.unlock || flags.has(p.unlock))
  const shown = nodeView(node, views)
  return (
    <div className="pc-inspect" data-family={familyOf(node.type)}>
      <header className="pc-inspect-head">
        <span className="ph-node">{node.type === 'output' ? <ArrowDownToLine size={15} /> : createElement(iconOf(node.type), { size: 15, strokeWidth: 1.8 })}</span>
        <small>{node.type === 'input' || node.type === 'output' ? KIND_NAMES[ioKinds?.[node.params.name]] : describe(node.type)}</small>
        {onDelete && <button className="pc-icon is-danger" onClick={onDelete} aria-label="拿掉这一块"><Trash2 size={17} /></button>}
      </header>

      {params.length > 0 && (
        <div className="pc-section">
          <span className="pc-label">设置</span>
          <div className="ph-chips">
            {params.map((param) => (
              <button key={param.key} className="ph-pill is-param" onClick={() => onParam(param.key)}>
                <ParamChip param={param} value={node.params[param.key]} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pc-section pc-result">
        <span className="pc-label">{node.type === 'output' ? (check?.pass === null ? '还没测试：点「运行测试」看是否通过' : check?.pass ? '这组通过' : check?.reason || '还没通过') : '算出的结果（当前这组测试）'}</span>
        {error ? (
          <p className="ph-error">{error}</p>
        ) : node.type === 'output' && expected ? (
          <div className="pc-compare">
            <figure><ValueView img={expected} view={shown} size={kindOf(expected) === 'image' ? 140 : 150} theme={theme} /><figcaption>期望</figcaption></figure>
            <figure><ValueView img={value} view={shown} size={kindOf(expected) === 'image' ? 140 : 150} theme={theme} label="未连接" /><figcaption>你的</figcaption></figure>
          </div>
        ) : (
          <ValueView img={value} view={shown} size={kindOf(value) === 'image' ? 200 : 300} theme={theme} label="还没有结果" grid scan={scan} onScan={onScan} />
        )}
        {kindOf(value ?? expected) === 'image' && <ViewSwitch value={shown} onChange={onView} compact />}
      </div>

      {ports.length > 0 && (
        <div className="pc-section">
          <span className="pc-label">读哪个结果 · 也可以在板上连圆点</span>
          <div className="pc-ports">
            {ports.map((port) => {
              const from = byId(feeding(graph, node.id, port))
              return (
                <button key={port} className={`pc-port ${from ? '' : 'is-empty'}`} onClick={() => onSource(port)}>
                  {ports.length > 1 && <i>{PORT_TAGS[port] ?? port}</i>}
                  {from ? thumb(from, 38) : null}
                  <span>{from ? nameOf(from) : '还没接'}</span>
                  <ChevronRight size={15} />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
