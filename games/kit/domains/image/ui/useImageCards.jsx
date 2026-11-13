import { createElement, useEffect, useMemo, useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import { sensorCaption } from '../../../circuit/index.js'
import { L, tr } from '../../../shell/i18n.js'
import { WORDS } from '../../../shell/words.js'
import ParamControl from './ParamControl.jsx'
import { partsFor, visibleSettings } from './parts.js'
import { setParam } from './parameters.js'
import ValueView from './views/ValueView.jsx'
import ImageView from './ImageView.jsx'
import { rangeOf } from './display.js'
import { ParamChip } from './phone/parts.jsx'
import PhoneSettings from './PhoneSettings.jsx'
import ColourPreview from './ColourPreview.jsx'
import MultiOutputPreview from './MultiOutputPreview.jsx'
import { IMAGE_VIEWS, KIND_NAMES, formatNumber, kindOf, nodeView, viewsIn } from './views/views.js'

// Vision Complete's desktop board: the shared circuit editor (games/kit/circuit CanvasEditor), whose cards here show
// their settings and what they output for the selected test, so the player watches the image flow. How a card draws
// a 2-D value (pixels, terrain, spectrum…) is the card's own choice, with a bar to draw them all one way.

export const NODE_W = 140
const PORT_ROW = 20 // the height of a port's row on a card (games/kit/circuit CanvasEditor.jsx)

export function useImageCards({ kit, graph, onChange, run, testIndex, has, sensors, outputLabels, colourOutputs, views, ioKinds, scan, onScan, theme, focus, test, phone }) {
  const [peek, setPeek] = useState(null)
  const [menu, setMenu] = useState(null) // id of the card whose view menu is open
  const values = run?.results[testIndex]?.values
  const errors = run?.results[testIndex]?.errors
  const parts = useMemo(() => partsFor(kit, { sensors, outputLabels, colourOutputs }), [kit, sensors, outputLabels, colourOutputs])

  // Choosing a view changes nothing in the circuit: it is saved, but tests do not re-run.
  const viewOf = (node) => nodeView(node, views)
  const offered = viewsIn(views?.shows)
  const isNew = (key) => views?.fresh?.includes(key)
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

  // Settings and values share the body between the port rails.
  const body = (node, ctx, roomy = false, settings = true) => {
    const shownValues = ctx ? ctx.view?.values : values
    const value = shownValues?.get(node.id)
    const error = (ctx ? ctx.view?.errors : errors)?.get(node.id)
    const shown = viewOf(node)
    const outputs = node.type !== 'input' ? parts.outputs(node) : null
    return (
      <>
        {settings && !ctx?.readOnly && visibleSettings(kit, node, has).map((param, index) => (
          <ParamControl key={param.key} param={param} value={node.params[param.key]} onChange={(v) => onChange(setParam(kit, graph, node.id, param.key, v))} roomy={roomy} style={!roomy && node.type !== 'arith' && index === 0 && param.buttons ? { marginTop: -PORT_ROW * Math.max(1, parts.inputs(node).length) } : undefined} />
        ))}
        {node.type === 'input' && sensors?.[node.params.name]?.description && <details className="node-description" onPointerDown={(event) => event.stopPropagation()}><summary>{tr('说明')}</summary><p>{L(sensors[node.params.name].description)}</p></details>}
        <div className="node-preview">
          {error ? <span className="node-error">{L(error)}</span> : outputs?.length > 1 ? <MultiOutputPreview node={node} outputs={outputs} values={shownValues} view={shown} theme={theme} size={42} compact /> : node.type === 'input' && value?.c === 3 ? <ColourPreview img={value} theme={theme} labels selected={peek?.id === node.id ? peek : null} onHover={(p) => setPeek(p ? { ...p, id: node.id } : null)} /> : <ValueView img={value} view={shown} size={NODE_W - 22} theme={theme} label={L(WORDS.notWired)} grid scan={scan} onScan={onScan} selected={peek?.id === node.id ? peek : null} onHover={(p) => setPeek(p ? { ...p, id: node.id } : null)} />}
          {!ctx?.readOnly && !error && kindOf(value) === 'image' && !(node.type === 'input' && value?.c === 3) && offered.length > 1 && (
            <button className={`node-view ${menu === node.id ? 'is-open' : ''}`} aria-haspopup="menu" aria-expanded={menu === node.id} aria-label={tr(`显示方式：${L(IMAGE_VIEWS[shown].label)}`, `Display: ${L(IMAGE_VIEWS[shown].label)}`)} title={tr('切换显示方式')} onPointerDown={(e) => e.stopPropagation()} onClick={() => setMenu(menu === node.id ? null : node.id)}>
              {createElement(IMAGE_VIEWS[shown].icon, { size: 12, strokeWidth: 1.8 })}
              <span>{L(IMAGE_VIEWS[shown].label)}</span>
            </button>
          )}
          {peek?.id === node.id && <span className="node-peek">{peek.frequency ? tr('频率 ') : ''}({peek.x}, {peek.y}) = {Array.isArray(peek.value) ? peek.value.map((v) => v.toFixed(3)).join(', ') : peek.value.toFixed(3)}</span>}
          {menu === node.id && (
            <div className="view-menu" role="menu" aria-label={tr('显示方式')} onPointerDown={(e) => e.stopPropagation()}>
              {offered.map(([key, option]) => (
                <button key={key} role="menuitemradio" aria-checked={shown === key} onClick={() => { showAs([node.id], key); setMenu(null) }}>
                  {createElement(option.icon, { size: 14, strokeWidth: 1.7 })}
                  <span><b>{L(option.label)}{isNew(key) && <em className="pb-new">{tr('新')}</em>}</b><small>{L(option.hint)}</small></span>
                  {shown === key && <Check size={13} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    )
  }
  // An output card says whether it passes this test.
  const head = (node, ctx) => {
    if (ctx?.readOnly) return null
    const check = checkOf(node)
    if (!check || check.pass === null) return null
    return <em className="node-verdict" title={check.pass ? tr('这组测试通过') : L(check.reason)}>{check.pass ? tr('通过', 'Pass') : tr('未通过', 'Fail')}</em>
  }
  // The input and output cards say under their title what they carry, so a long label never pushes the badge off.
  const caption = (node) => {
    if (node.type === 'input') { const s = sensors?.[node.params.name]; return sensorCaption(s, KIND_NAMES[s?.type]) }
    const kind = L(KIND_NAMES[ioKinds?.[node.params.name]])
    return [outputLabels?.[node.params.name] ? tr('输出', 'output') : null, kind].filter(Boolean).join(' · ')
  }
  const cardClass = (node, ctx) => {
    const check = ctx?.readOnly ? null : checkOf(node)
    // `focus`: the part a bench in the parts box is about (PartDemo.jsx).
    return `node-${node.type} ${menu === node.id ? 'has-menu' : ''} ${check && check.pass !== null ? (check.pass ? 'is-pass' : 'is-fail') : ''} ${focus === node.type ? 'is-focus' : ''}`
  }

  const corner = imageCards.length > 0 && offered.length > 1 && (
    <div className="board-views" role="group" aria-label={tr('所有图像元件的显示方式')} onPointerDown={(e) => e.stopPropagation()}>
      <span className="board-views-label">{tr('全部显示为')}</span>
      {offered.map(([key, option]) => (
        <button key={key} aria-pressed={shared === key} title={tr(`${L(option.label)}：${L(option.hint)}`, `${L(option.label)}: ${L(option.hint)}`)} onClick={() => showAs(imageCards.map((n) => n.id), key)}>
          {createElement(option.icon, { size: 14, strokeWidth: 1.7 })}
          <span>{L(option.label)}{isNew(key) && <em className="pb-new">{tr('新')}</em>}</span>
        </button>
      ))}
      {customised && <button className="board-views-reset" title={tr('恢复本关默认的显示方式')} aria-label={tr('恢复默认显示方式')} onClick={resetViews}><RotateCcw size={13} /></button>}
    </div>
  )
  const thumb = (node, ctx) => {
    const value = ctx.view?.values?.get(node.id)
    if (ctx.view?.errors?.get(node.id)) return <i className="pb-error">!</i>
    const outputs = node.type !== 'input' ? parts.outputs(node) : null
    if (outputs?.length > 1) return <MultiOutputPreview node={node} outputs={outputs} values={ctx.view?.values} view={viewOf(node)} theme={theme} size={40} compact />
    if (!value) return <i className="pb-empty">{tr('待接线', 'unwired')}</i>
    if (node.type === 'input' && value.c === 3) return <ColourPreview img={value} theme={theme} />
    return <ValueView img={value} view={viewOf(node)} size={kindOf(value) === 'signal' ? 82 : 52} theme={theme} />
  }
  const sinkBody = (node, ctx) => {
    const expected = !ctx.readOnly && test?.expected?.[node.params.name]
    if (!expected) return thumb(node, ctx)
    const actual = ctx.view?.values.get(node.id)
    const fits = actual?.w === expected.w && actual?.h === expected.h && actual?.c === expected.c
    const img = kindOf(expected) === 'image'
    const size = kindOf(expected) === 'signal' ? 96 : 64
    const check = checkOf(node)
    return <>
      <span className="pb-compare">
        <figure><ValueView img={expected} view={viewOf(node)} size={size} theme={theme} /><figcaption>{L(WORDS.wanted)}</figcaption></figure>
        <figure><ValueView img={actual} view={viewOf(node)} size={size} range={img ? rangeOf(expected) : undefined} theme={theme} /><figcaption>{L(WORDS.result)}</figcaption></figure>
        {img && <figure><ImageView img={fits ? actual : null} against={expected} tolerance={(test.check ?? check)?.tolerance ?? 0.02} size={size} theme={theme} label="—" /><figcaption>{tr('误差')}</figcaption></figure>}
      </span>
      {check?.pass != null && <span className="pb-verdict">{check.pass ? <Check size={13} /> : <X size={13} />}</span>}
    </>
  }
  const tileExtra = (node) => {
    if (node.type === 'arith' && ['a', 'b'].includes(node.params.constantSide)) {
      const op = L(kit.types.arith.params[0].options.find(([key]) => key === node.params.op)?.[1])
      const value = formatNumber(node.params.constant ?? 1)
      return node.params.constantSide === 'a' ? `${value} ${op} b` : `a ${op} ${value}`
    }
    const param = visibleSettings(kit, node, has)[0]
    return param ? <ParamChip param={param} value={node.params?.[param.key] ?? param.default} /> : null
  }
  const sinkClass = (node, ctx) => {
    const check = !ctx.readOnly && checkOf(node)
    return check && check.pass !== null ? (check.pass ? 'is-pass' : 'is-fail') : ''
  }
  return {
    parts, corner,
    card: { body, head, caption, cardClass, thumb, sinkBody, sinkClass, tileExtra, nodeClass: (node) => node.type === 'input' && sensors?.[node.params.name]?.colour ? 'is-rgb-source' : '', wireState: (wire, ctx) => ((ctx ? ctx.view?.values : values)?.has(wire.from) ? 'live' : 'dead') },
    sheet: (node, ctx) => phone && !ctx.readOnly
      ? <PhoneSettings key={node.id} label={parts.label(node)} node={node} settings={visibleSettings(kit, node, has)} set={(key, value) => onChange(setParam(kit, graph, node.id, key, value))}>
          {node.type === 'output' ? sinkBody(node, ctx) : body(node, ctx, true, false)}
        </PhoneSettings>
      : body(node, ctx, true),
  }
}
