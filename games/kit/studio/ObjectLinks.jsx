// An object's place among the others (games/PACKAGES.md 3.6, 8): the files are kept by job, the object is edited in
// one place. Above an object's fields: the tags that hold it, the relations that name it, the layouts that place it,
// and the layers it comes from; each opens where it is edited.
import { Layers, LayoutGrid, Spline, Tag } from 'lucide-react'
import { tr } from '../shell/i18n.js'
import { objectPlaces, shownName } from './objects-edit.js'

export default function ObjectLinks({ content, kind, full, namespace, onOpen }) {
  const { tags, relations, layouts } = objectPlaces(content, kind, full)
  const source = content?.sources?.[kind]?.[full]
  const chain = source ? [source.declaration, ...source.overrides] : []
  const chip = (what, name, Icon) => (
    <button key={`${what}:${name}`} type="button" className="object-link" onClick={() => onOpen({ [what]: name })}>
      <Icon size={12} aria-hidden="true" /><code>{shownName(namespace, name)}</code>
    </button>
  )
  if (!tags.length && !relations.length && !layouts.length && chain.length < 2) return null
  return (
    <nav className="object-links" aria-label={tr('关联', 'Linked objects')}>
      {chain.length > 1 && <span className="source-mark"><Layers size={12} aria-hidden="true" /> {chain.join(' ← ')}</span>}
      {tags.map((name) => chip('tag', name, Tag))}
      {relations.map((name) => chip('relation', name, Spline))}
      {layouts.map((name) => chip('layout', name, LayoutGrid))}
    </nav>
  )
}
