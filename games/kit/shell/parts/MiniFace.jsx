import './parts.css'
import { Fragment } from 'react'
import { L } from '../i18n.js'
import { shows } from '../../engine/parts/define.js'
import { srcOf } from '../../circuit/model.js'
import Show from '../../views/Show.jsx'
import { valueWords } from './SettingField.jsx'

// A read-only node in a stage diagram. Only its name and one clipped line are visible; values use the kit's inline
// scene, so a domain never needs another rendering path for its miniatures.
export default function MiniFace({ def, node, parts, ctx, defined, mark = () => ({}) }) {
  const params = node.params ?? {}
  const settings = def?.settings.filter((s) => shows(s, def, params, defined.ops)) ?? []
  const words = (key) => {
    const s = def?.setting[key]
    return s ? valueWords(s, params[key] ?? s.default) : String(params[key] ?? '')
  }
  const blocks = def?.views?.mini ?? [{ show: 'summary' }]
  const content = parts?.packed?.(node) ? [] : blocks.flatMap((b, k) => {
    let value
    if (b.show === 'value') value = <Show value={ctx?.view?.values.get(srcOf(node, b.output ?? null))} scene="inline" />
    if (b.show === 'text') value = L(b.text)
    if (b.show === 'setting') value = words(b.key)
    if (b.show === 'summary') value = b.text ? L(b.text).replace(/\{([^}]*)\}/g, (_, key) => words(key)) : def ? settings.map((s) => words(s.key)).join(' · ') : Object.values(params).join(' · ')
    return value ? [<span key={k} {...mark(['views', 'mini', k])}>{value}</span>] : []
  })
  return <div className="part-mini" data-family={def?.family ?? parts?.family?.(node)}>
    <b>{L(def?.name ?? parts?.label?.(node) ?? node.type)}</b>
    {content.length > 0 && <div className="part-mini-line">{content.map((v, k) => <Fragment key={k}>{k > 0 && <i aria-hidden="true">·</i>}{v}</Fragment>)}</div>}
  </div>
}
