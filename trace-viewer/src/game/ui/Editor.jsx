import { createElement, useEffect, useMemo, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { CanvasEditor, sensorCaption } from '../../../../games/kit/circuit/index.js'
import { L, tr } from '../../../../games/kit/shell/i18n.js'
import { NODE_TYPES } from '../engine/nodes.js'
import ParamControl from './ParamControl.jsx'
import { partsFor } from './parts.js'
import ValueView from './views/ValueView.jsx'
import { IMAGE_VIEWS, KIND_NAMES, kindOf, nodeView } from './views/views.js'

// Vision Complete's desktop board: the shared circuit editor (games/kit/circuit CanvasEditor), whose cards here show
// their settings and what they output for the selected test, so the player watches the image flow. How a card draws
// a 2-D value (pixels, terrain, spectrum…) is the card's own choice, with a bar to draw them all one way.

const NODE_W = 140

export default function Editor({ graph, onChange, run, testIndex, flags, sensors, outputLabels, views, ioKinds, scan, onScan, theme, hasPalette, focus, refit }) {
  const [peek, setPeek] = useState(null)
  const [menu, setMenu] = useState(null) // id of the card whose view menu is open
  const values = run?.results[testIndex]?.values
  const errors = run?.results[testIndex]?.errors
  const parts = useMemo(() => partsFor({ sensors, outputLabels }), [sensors, outputLabels])

  // Choosing a view changes nothing in the circuit: it is saved, but tests do not re-run.
  const viewOf = (node) => nodeView(node, views)
  const showAs = (ids, shown) => onChange({ ...graph, nodes: graph.nodes.map((n) => (ids.includes(n.id) ? { ...n, view: shown } : n)) }, { keep: true })
  const imageCards = graph.nodes.filter((n) => kindOf(values?.get(n.id)) === 'image')
  const shared = imageCards.length && imageCards.every((n) => viewOf(n) === viewOf(imageCards[0])) ? viewOf(imageCards[0]) : null
  const customised = graph.nodes.some((n) => n.view)
  const resetViews = () => {
    const nodes = graph.nodes.map((n) => {
      const next = { ...n }
      delete next.view
      return next
    })
    onChange({ ...graph, nodes }, { keep: true })
  }
  const setParam = (node, key, value) => onChange({ ...graph, nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...n.params, [key]: value } } : n)) })
  const checkOf = (node) => (node.type === 'output' ? run?.results[testIndex]?.checks.find((c) => c.name === node.params.name) : null)

  useEffect(() => {
    if (!menu) return undefined
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return
      if (event.target.closest?.('.view-menu, .node-view')) return
      setMenu(null)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', close)
    }
  }, [menu])

  // Under its ports a card shows its settings, then its value (or why it has none), with its own view menu.
  const body = (node) => {
    const spec = NODE_TYPES[node.type]
    const value = values?.get(node.id)
    const error = errors?.get(node.id)
    const shown = viewOf(node)
    return (
      <>
        {(spec.params ?? []).filter((p) => !p.unlock || flags.has(p.unlock)).map((param) => (
          <ParamControl key={param.key} param={param} value={node.params[param.key]} onChange={(v) => setParam(node, param.key, v)} />
        ))}
        <div className="node-preview">
          {error ? <span className="node-error">{L(error)}</span> : <ValueView img={value} view={shown} size={NODE_W - 22} theme={theme} label={tr('未连接', 'Not connected')} grid scan={scan} onScan={onScan} onHover={(p) => setPeek(p ? { ...p, id: node.id } : null)} />}
          {!error && kindOf(value) === 'image' && (
            <button className={`node-view ${menu === node.id ? 'is-open' : ''}`} aria-haspopup="menu" aria-expanded={menu === node.id} aria-label={tr(`显示方式：${L(IMAGE_VIEWS[shown].label)}`, `Display: ${L(IMAGE_VIEWS[shown].label)}`)} title={tr('换一种画法', 'Draw it another way')} onPointerDown={(e) => e.stopPropagation()} onClick={() => setMenu(menu === node.id ? null : node.id)}>
              {createElement(IMAGE_VIEWS[shown].icon, { size: 12, strokeWidth: 1.8 })}
              <span>{L(IMAGE_VIEWS[shown].label)}</span>
            </button>
          )}
          {menu === node.id && (
            <div className="view-menu" role="menu" aria-label={tr('显示方式', 'Display')} onPointerDown={(e) => e.stopPropagation()}>
              {Object.entries(IMAGE_VIEWS).map(([key, option]) => (
                <button key={key} role="menuitemradio" aria-checked={shown === key} onClick={() => { showAs([node.id], key); setMenu(null) }}>
                  {createElement(option.icon, { size: 14, strokeWidth: 1.7 })}
                  <span><b>{L(option.label)}</b><small>{L(option.hint)}</small></span>
                  {shown === key && <Check size={13} />}
                </button>
              ))}
            </div>
          )}
        </div>
        {peek?.id === node.id && <p className="node-peek">{peek.frequency ? tr('频率 ', 'frequency ') : ''}({peek.x}, {peek.y}) = {peek.value.toFixed(3)}</p>}
      </>
    )
  }
  // An output card says whether it passes this test.
  const head = (node) => {
    const check = checkOf(node)
    if (!check || check.pass === null) return null
    return <em className="node-verdict" title={check.pass ? tr('这组测试通过', 'This test passes') : L(check.reason)}>{check.pass ? tr('通过', 'Pass') : tr('未通过', 'Fail')}</em>
  }
  // The input and output cards say under their title what they carry, so a long label never pushes the badge off.
  const caption = (node) => {
    if (node.type === 'input') { const s = sensors?.[node.params.name]; return sensorCaption(s, KIND_NAMES[s?.type]) }
    const kind = L(KIND_NAMES[ioKinds?.[node.params.name]])
    return [outputLabels?.[node.params.name] ? tr('输出', 'output') : null, kind].filter(Boolean).join(' · ')
  }
  const cardClass = (node) => {
    const check = checkOf(node)
    // `focus`: the part a bench in the parts box is about (PartDemo.jsx).
    return `node-${node.type} ${menu === node.id ? 'has-menu' : ''} ${check && check.pass !== null ? (check.pass ? 'is-pass' : 'is-fail') : ''} ${focus === node.type ? 'is-focus' : ''}`
  }

  return (
    <CanvasEditor
      graph={graph}
      onChange={onChange}
      parts={parts}
      body={body}
      head={head}
      caption={caption}
      cardClass={cardClass}
      refit={refit}
      wireState={(wire) => (values?.get(wire.from) ? 'live' : 'dead')}
      width={NODE_W}
      emptyNote={hasPalette && { zh: '从上面一排元件里选一个放上来，再从卡片右侧的圆点拖线连接。', en: 'Pick a part from the row above to place it, then drag a wire from the dot on the right of a card.' }}
      overlay={imageCards.length > 0 && (
        <div className="board-views" role="group" aria-label={tr('所有图像卡片的显示方式', 'Display of every image card')} onPointerDown={(e) => e.stopPropagation()}>
          <span className="board-views-label">{tr('全部画成', 'Draw all as')}</span>
          {Object.entries(IMAGE_VIEWS).map(([key, option]) => (
            <button key={key} aria-pressed={shared === key} title={tr(`${L(option.label)}：${L(option.hint)}`, `${L(option.label)}: ${L(option.hint)}`)} onClick={() => showAs(imageCards.map((n) => n.id), key)}>
              {createElement(option.icon, { size: 14, strokeWidth: 1.7 })}
              <span>{L(option.label)}</span>
            </button>
          ))}
          {customised && <button className="board-views-reset" title={tr('恢复这一关的默认画法', "Restore this level's default views")} aria-label={tr('恢复默认画法', 'Restore default views')} onClick={resetViews}><RotateCcw size={13} /></button>}
        </div>
      )}
    />
  )
}
