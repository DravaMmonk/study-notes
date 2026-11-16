// Where an object comes from (games/PACKAGES.md 4, 8): the layer that declares it and the layers that override it, in
// load order. On another layer's object, the button that starts overriding it in this one.
import { Layers } from 'lucide-react'
import { tr } from '../shell/i18n.js'

export default function SourceMark({ content, kind, full, own, overriding, pending, onOverride }) {
  const source = content?.sources?.[kind]?.[full]
  const chain = source ? [source.declaration, ...source.overrides] : []
  return (
    <>
      {chain.length > 1 || !own ? <span className="source-mark" title={tr('声明 ← 覆盖', 'Declared ← overridden')}>{chain.join(' ← ')}</span> : null}
      {!own && !overriding && <button type="button" className="kit-btn is-label" disabled={pending} onClick={onOverride}>
        <Layers size={13} aria-hidden="true" />{tr('在本包覆盖', 'Override in this package')}
      </button>}
    </>
  )
}
