// The kernel's capabilities, read only (games/DESIGN.md 6.2, 6.7): what a package can pick and combine — value types,
// operations, primitive pieces, boards, task kinds, content items, displays, languages, content kinds — each by its
// `<module>:<name>`, listed in the left column narrowed by kind, module and a search; the one picked in the middle, with
// what it says and what it takes; its description as JSON on the right.
import { useMemo, useState } from 'react'
import { L, tr } from '../shell/i18n.js'
import { sidebarSearch } from './sidebar-list.js'
import { capabilityOf } from './left-lists.js'
import SidebarListTools from './SidebarListTools.jsx'

const KINDS = [
  ['operation', '运算', 'Operations'], ['primitive', '原始件', 'Primitive pieces'], ['valueType', '值类型', 'Value types'],
  ['board', '板', 'Boards'], ['task', '任务种类', 'Task kinds'], ['content', '内容项', 'Content items'],
  ['display', '显示', 'Displays'], ['language', '语言', 'Languages'], ['contentKind', '内容种类', 'Content kinds'],
]
const ALL = ''
export const moduleOf = (name) => name.slice(0, name.indexOf(':'))

/** The capability `key` names (left-lists.js capabilityKey), else the first listed: { kind, name, it }, or null. */
export function currentCapability(capabilities, key) {
  const picked = capabilityOf(key)
  if (picked && capabilities?.[picked.kind]?.[picked.name]) return { ...picked, it: capabilities[picked.kind][picked.name] }
  const kind = KINDS.map(([k]) => k).find((k) => Object.keys(capabilities?.[k] ?? {}).length)
  if (!kind) return null
  const [name, it] = Object.entries(capabilities[kind])[0]
  return { kind, name, it }
}

/**
 * The left list of capabilities (`capabilities`: { kind: { '<module>:<name>': description } }, the vocabulary's index),
 * narrowed by kind, module and a search. `current`: { kind, name } open; `onOpen(kind, name)` opens one.
 */
export function CapabilityList({ capabilities, current, onOpen }) {
  const kinds = KINDS.filter(([kind]) => Object.keys(capabilities?.[kind] ?? {}).length)
  const [kind, setKind] = useState(current?.kind ?? kinds[0]?.[0] ?? 'operation')
  const [module, setModule] = useState(ALL)
  const [query, setQuery] = useState('')
  const entries = useMemo(() => Object.entries(capabilities?.[kind] ?? {}), [capabilities, kind])
  const modules = useMemo(() => [...new Set(Object.values(capabilities ?? {}).flatMap((of) => Object.keys(of).map(moduleOf)))].sort(), [capabilities])
  const matches = sidebarSearch(query)
  const shown = entries.filter(([name, it]) => (module === ALL || moduleOf(name) === module) && matches(name, L(it.about)))
  return (
    <nav className="parts-list capabilities" aria-label={tr('能力', 'Capabilities')}>
      <div className="capabilities-filters">
        <select className="studio-game" value={kind} aria-label={tr('能力的种类', 'Kind of capability')} onChange={(e) => setKind(e.target.value)}>
          {kinds.map(([id, zh, en]) => <option key={id} value={id}>{tr(zh, en)} · {Object.keys(capabilities[id]).length}</option>)}
        </select>
        <select className="studio-game" value={module} aria-label={tr('模块', 'Module')} onChange={(e) => setModule(e.target.value)}>
          <option value={ALL}>{tr('全部模块', 'All modules')}</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <SidebarListTools query={query} onQuery={setQuery} />
      <ul className="capabilities-list">
        {shown.map(([name, it]) => {
          const on = current?.kind === kind && current?.name === name
          return (
            <li key={name}>
              <button type="button" className={on ? 'is-on' : ''} aria-current={on ? 'true' : undefined} onClick={() => onOpen(kind, name)} title={L(it.about)}>
                <code>{name}</code><span>{L(it.about)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** The capability picked, in the middle: what it says, what it takes and gives. */
export function CapabilityView({ current }) {
  return <article className="arrange">{current && <CapabilityDetail name={current.name} it={current.it} />}</article>
}

function CapabilityDetail({ name, it }) {
  const ports = (list) => list.map((p) => <li key={p.name}><code>{p.name}</code><span className="capability-type">{p.type}</span>{p.optional && <small>{tr('可不接', 'Optional')}</small>}</li>)
  return (
    <section className="capability-detail" aria-label={name}>
      <h2><code>{name}</code></h2>
      {it.about && <p>{L(it.about)}</p>}
      {it.args && <><h3>{tr('输入', 'Inputs')}</h3><ul className="capability-ports">{ports(it.args)}</ul></>}
      {it.inputs && <><h3>{tr('输入口', 'Inputs')}</h3><ul className="capability-ports">{ports(it.inputs)}</ul></>}
      {(it.returns || it.outputType) && <><h3>{tr('输出', 'Output')}</h3><p className="capability-type">{it.returns ?? it.outputType}</p></>}
      {it.outputs && <><h3>{tr('输出口', 'Outputs')}</h3><ul className="capability-ports">{ports(it.outputs)}</ul></>}
      {it.accepts && <><h3>{tr('也接受', 'Also accepts')}</h3><p className="capability-type">{it.accepts.join(' · ')}</p></>}
      {it.params?.fields && Object.keys(it.params.fields).length > 0 && <><h3>{tr('参数', 'Parameters')}</h3><SchemaFields fields={it.params.fields} /></>}
    </section>
  )
}

/** A schema's fields as a list: name, type (or the kind it names), whether it may be left out, what it is. */
function SchemaFields({ fields, depth = 0 }) {
  return (
    <ul className="capability-fields">
      {Object.entries(fields).map(([key, field]) => (
        <li key={key}>
          <code>{key}</code>
          <span className="capability-type">{typeOf(field)}</span>
          {field.optional && <small>{tr('可选', 'Optional')}</small>}
          {field.about && <span className="capability-about">{L(field.about)}</span>}
          {depth < 2 && field.fields && <SchemaFields fields={field.fields} depth={depth + 1} />}
          {depth < 2 && field.of?.fields && <SchemaFields fields={field.of.fields} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  )
}

const typeOf = (field) => {
  if (!field) return ''
  if (field.kind) return `${field.type} ${field.kind}`
  if (field.type === 'list') return `list ${typeOf(field.of)}`
  if (field.type === 'oneOf' || field.values) return (field.values ?? []).join(' | ') || field.type
  return field.type
}
