// The kernel's capabilities, read only (games/PACKAGES.md 7.1, 8): what a package can pick and combine — value types,
// operations, primitive pieces, boards, task kinds, content items, displays, languages, content kinds — each by its
// `<module>:<name>`, narrowed by kind, module and a search, with what it says and what it takes.
import { useMemo, useState } from 'react'
import { L, tr } from '../shell/i18n.js'
import { sidebarSearch } from './sidebar-list.js'

const KINDS = [
  ['operation', '运算', 'Operations'], ['primitive', '原始件', 'Primitive pieces'], ['valueType', '值类型', 'Value types'],
  ['board', '板', 'Boards'], ['task', '任务种类', 'Task kinds'], ['content', '内容项', 'Content items'],
  ['display', '显示', 'Displays'], ['language', '语言', 'Languages'], ['contentKind', '内容种类', 'Content kinds'],
]
const ALL = ''
export const moduleOf = (name) => name.slice(0, name.indexOf(':'))

/** `capabilities`: { kind: { '<module>:<name>': description } } (the vocabulary's index). */
export default function CapabilityBrowser({ capabilities }) {
  const kinds = KINDS.filter(([kind]) => Object.keys(capabilities?.[kind] ?? {}).length)
  const [kind, setKind] = useState(kinds[0]?.[0] ?? 'operation')
  const [module, setModule] = useState(ALL)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(null)
  const entries = useMemo(() => Object.entries(capabilities?.[kind] ?? {}), [capabilities, kind])
  const modules = useMemo(() => [...new Set(Object.values(capabilities ?? {}).flatMap((of) => Object.keys(of).map(moduleOf)))].sort(), [capabilities])
  const matches = sidebarSearch(query)
  const shown = entries.filter(([name, it]) => (module === ALL || moduleOf(name) === module) && matches(name, L(it.about)))
  const current = shown.find(([name]) => name === picked) ?? shown[0] ?? null
  return (
    <article className="arrange capabilities">
      <header className="arrange-bar">
        <select className="studio-game" value={kind} aria-label={tr('能力的种类', 'Kind of capability')} onChange={(e) => { setKind(e.target.value); setPicked(null) }}>
          {kinds.map(([id, zh, en]) => <option key={id} value={id}>{tr(zh, en)} · {Object.keys(capabilities[id]).length}</option>)}
        </select>
        <select className="studio-game" value={module} aria-label={tr('模块', 'Module')} onChange={(e) => setModule(e.target.value)}>
          <option value={ALL}>{tr('全部模块', 'All modules')}</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input className="field-input capabilities-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('搜索', 'Search')} aria-label={tr('搜索', 'Search')} />
      </header>
      <div className="capabilities-body">
        <ul className="capabilities-list" aria-label={tr('能力', 'Capabilities')}>
          {shown.map(([name, it]) => (
            <li key={name}>
              <button type="button" className={current?.[0] === name ? 'is-on' : ''} aria-current={current?.[0] === name ? 'true' : undefined} onClick={() => setPicked(name)}>
                <code>{name}</code><span>{L(it.about)}</span>
              </button>
            </li>
          ))}
        </ul>
        {current && <CapabilityDetail name={current[0]} it={current[1]} />}
      </div>
    </article>
  )
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
