// Search and replace across the whole game (Ctrl/⌘+Shift+F), in the left panel: every text side, board line and id
// that matches (../engine/ops/search.js, the same module as the MCP's search and replace tools), grouped by level,
// each going to its field. With a replacement typed, each hit shows what it becomes and can be left out; the replace
// is the operations that make it (text.set, level.blueprint), added to the pending changeset — previewed, checked and
// reviewed there like any edit, never written by itself. Ids are found, not replaced.
import { useMemo, useState } from 'react'
import { CaseSensitive, Regex, ReplaceAll, WholeWord } from 'lucide-react'
import { tr } from '../shell/i18n.js'
import { showPath } from '../engine/ops/edit.js'
import { hitKey, patternOf, replaceOps, replaced, searchContent } from '../engine/ops/search.js'
import { usePref } from './prefs.js'

const SHOWN = 300 // hits drawn at most
const CONTEXT = 36 // characters either side of a match

const TAG = /<(level|part|wiki)-ref to="([^"]+)"><\/\1-ref>/g
/** A stretch of text with its link tags as the names they link to. */
const plain = (s) => s.replace(TAG, '⇢$2')

/** A stretch of a hit around its first match, the match marked (and, replacing, what it becomes); never cut inside a link tag. */
function Snippet({ hit, query, replacement }) {
  const [start, end] = hit.at[0]
  let from = Math.max(0, start - CONTEXT)
  let to = Math.min(hit.text.length, end + CONTEXT)
  for (const m of hit.kind === 'text' ? hit.text.matchAll(TAG) : []) {
    if (from > m.index && from < m.index + m[0].length) from = m.index
    if (to > m.index && to < m.index + m[0].length) to = m.index + m[0].length
  }
  const before = plain(hit.text.slice(from, start))
  const after = plain(hit.text.slice(end, to))
  const match = hit.text.slice(start, end)
  // What the first match becomes, read off the whole text with only it replaced (so anchors and lookarounds hold).
  const whole = replacement !== null && hit.kind !== 'id' ? replaced(hit.text, query, replacement, { tags: hit.kind === 'text', only: [0] }) : null
  const becomes = whole === null ? null : whole.slice(start, end + whole.length - hit.text.length)
  return (
    <span className="hit-text">
      {from > 0 && '…'}{before}
      {becomes === null ? <mark>{match}</mark> : <><del>{match}</del><ins>{becomes}</ins></>}
      {after}{to < hit.text.length && '…'}
      {hit.at.length > 1 && <small>+{hit.at.length - 1}</small>}
    </span>
  )
}

export default function Search({ content, vocabulary, onAdd, onJump }) {
  const [find, setFind] = useState('')
  const [replacement, setReplacement] = useState('')
  const [replacing, setReplacing] = useState(false)
  const [opts, setOpts] = usePref('search-options', { regex: false, caseSensitive: false, word: false, in: ['zh', 'en', 'board', 'id'] })
  const [left, setLeft] = useState(() => new Set()) // hits left out of the replace
  // What is searched: the sides of texts, board lines, ids (each a toggle, one always left on).
  const query = useMemo(() => {
    const sides = opts.in.filter((x) => x === 'zh' || x === 'en')
    return { find, regex: opts.regex, caseSensitive: opts.caseSensitive, word: opts.word, sides, kinds: [...(sides.length ? ['text'] : []), ...opts.in.filter((x) => x === 'board' || x === 'id')] }
  }, [find, opts])
  const bad = Boolean(find) && !patternOf(query)
  const hits = useMemo(() => (bad ? [] : searchContent(content, vocabulary, query)), [content, vocabulary, query, bad])
  const groups = useMemo(() => {
    const out = []
    for (const hit of hits.slice(0, SHOWN)) {
      const name = hit.level ?? hit.file
      if (out.at(-1)?.name !== name) out.push({ name, level: hit.level, hits: [] })
      out.at(-1).hits.push(hit)
    }
    return out
  }, [hits])
  const toReplace = hits.filter((h) => h.kind !== 'id' && !left.has(hitKey(h)))
  const add = () => {
    const { ops } = replaceOps(content, vocabulary, query, replacement, toReplace.map(hitKey))
    if (ops.length) onAdd(ops, tr(`把「${find}」换成「${replacement}」`, `Replace “${find}” with “${replacement}”`))
    setLeft(new Set())
  }
  const among = (v) => setOpts((o) => ({ ...o, in: o.in.includes(v) ? (o.in.length > 1 ? o.in.filter((x) => x !== v) : o.in) : [...o.in, v] }))
  const flip = (key) => setLeft((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const opt = (k, Icon, title) => <button type="button" className={opts[k] ? 'is-on' : ''} aria-pressed={opts[k]} onClick={() => setOpts((o) => ({ ...o, [k]: !o[k] }))} title={title}><Icon size={14} aria-hidden="true" /></button>
  return (
    <div className="search">
      <div className="search-box">
        <button type="button" className={`search-mode ${replacing ? 'is-on' : ''}`} onClick={() => setReplacing(!replacing)} aria-expanded={replacing} aria-label={tr('替换', 'Replace')}>›</button>
        <div className="search-fields">
          <div className="search-row">
            <input className={`field-input ${bad ? 'is-bad' : ''}`} value={find} onChange={(e) => { setFind(e.target.value); setLeft(new Set()) }} placeholder={tr('搜索', 'Search')} aria-label={tr('搜索', 'Search')} autoFocus spellCheck={false} />
            <span className="search-opts">
              {opt('caseSensitive', CaseSensitive, tr('区分大小写', 'Match case'))}
              {opt('word', WholeWord, tr('整词', 'Whole word'))}
              {opt('regex', Regex, tr('正则表达式', 'Regular expression'))}
            </span>
          </div>
          <div className="seg is-small search-kinds">
            {[['zh', '中'], ['en', 'En'], ['board', tr('板', 'Board')], ['id', 'id']].map(([v, name]) => (
              <button key={v} type="button" className={opts.in.includes(v) ? 'is-on' : ''} aria-pressed={opts.in.includes(v)} onClick={() => among(v)}>{name}</button>
            ))}
          </div>
          {replacing && (
            <div className="search-row">
              <input className="field-input" value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder={tr('替换为', 'Replace with')} aria-label={tr('替换为', 'Replace with')} spellCheck={false} />
              <button type="button" className="search-go" onClick={add} disabled={!toReplace.length} title={tr('替换：加入待定的变更集', 'Replace: into the pending changeset')}><ReplaceAll size={14} aria-hidden="true" />{toReplace.length}</button>
            </div>
          )}
        </div>
      </div>
      {find && !bad && <p className="search-sum">{tr(`${hits.length} 处 · ${new Set(hits.map((h) => h.file)).size} 个文件`, `${hits.length} hits · ${new Set(hits.map((h) => h.file)).size} files`)}</p>}
      <div className="search-hits">
        {groups.map((g) => (
          <section key={g.name} className="hit-group">
            <button type="button" className="hit-head" onClick={() => g.level && onJump(g.level, null)}><b>{g.name}</b><small>{g.hits.length}</small></button>
            {g.hits.map((hit) => {
              const key = hitKey(hit)
              const out = left.has(key)
              return (
                <div key={key} className={`hit is-${hit.kind} ${out ? 'is-out' : ''}`}>
                  {replacing && hit.kind !== 'id' && <input type="checkbox" checked={!out} onChange={() => flip(key)} aria-label={tr('替换这一处', 'Replace this one')} />}
                  <button type="button" onClick={() => onJump(hit.level ?? null, hit.path, hit.in)} title={`${showPath(hit.path)}${hit.side ? ` · ${hit.side}` : ''}${hit.line !== undefined ? ` · ${hit.line + 1}` : ''}`}>
                    <code>{hit.kind === 'board' ? `${showPath(hit.path)}:${hit.line + 1}` : hit.kind === 'id' ? 'id' : `${showPath(hit.path)}${hit.side === 'en' ? ' en' : ''}`}</code>
                    <Snippet hit={hit} query={query} replacement={replacing ? replacement : null} />
                  </button>
                </div>
              )
            })}
          </section>
        ))}
        {hits.length > SHOWN && <p className="search-sum">{tr(`还有 ${hits.length - SHOWN} 处`, `${hits.length - SHOWN} more`)}</p>}
      </div>
    </div>
  )
}
