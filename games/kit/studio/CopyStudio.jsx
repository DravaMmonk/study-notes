// The copy workspace (games/DESIGN.md 6.7): the writer's. It opens a package or a game and audits and edits every
// text of that layer in every language — terms, references, and a game's own wording over its packages' texts. On the
// left the texts by object (the whole layer, a level group or a chapter, the encyclopedia, the pieces) or by file, and
// for a package search and replace last; in the middle the copy table (CopyTable.jsx) of what is picked, with its
// findings; on the right the field a row goes to (Inspector.jsx); the check and the change log fold under the middle.
import './studio.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, FileText, ListTree, Search as SearchIcon } from 'lucide-react'
import { L, getLang, tr } from '../shell/i18n.js'
import { withParts } from '../engine/parts/define.js'
import { parsePath } from '../engine/ops/edit.js'
import { call } from './api.js'
import { placesOf } from './form.js'
import { itemOf } from './worklist.js'
import { usePref } from './prefs.js'
import { confirmDelete } from './delete.js'
import { allCopyRows, copyFieldOf, copyFiles, textField } from './copy.js'
import { groupTree } from './groups.js'
import { sidebarSearch } from './sidebar-list.js'
import { useChangeset } from './useChangeset.js'
import StudioBar from './StudioBar.jsx'
import PanelResizer from './PanelResizer.jsx'
import CopyTable from './CopyTable.jsx'
import Search from './Search.jsx'
import SidebarListTools from './SidebarListTools.jsx'
import Review from './Review.jsx'
import Audit, { auditSum } from './Audit.jsx'
import Drawer, { Debug } from './Drawer.jsx'
import Inspector from './Inspector.jsx'

const QUERY = new URLSearchParams(window.location.search)
const SETTLE = 700
const LISTS = { objects: [ListTree, '按对象', 'By object'], files: [FileText, '按文件', 'By file'], search: [SearchIcon, '搜索', 'Search'] }

/** Keep what the workspace opens and the scope or file shown in the address. */
const remember = (opened, scope, file) => {
  const url = new URL(window.location.href)
  url.searchParams.set('space', 'copy')
  for (const k of ['package', 'game', 'scope', 'file', 'tab', 'level', 'group', 'era', 'part', 'glossary']) url.searchParams.delete(k)
  url.searchParams.set(opened.game ? 'game' : 'package', opened.game ?? opened.package)
  if (file !== null) url.searchParams.set('file', file)
  else url.searchParams.set('scope', String(scope))
  window.history.replaceState(null, '', url)
}

/**
 * `opened`: { package } | { game }, what the workspace opens; `packages`, `games`: what it can open; `onOpen(next)` opens
 * another; `space` the workspace switch.
 */
export default function CopyStudio({ opened, packages, games, onOpen, space }) {
  const side = opened.game ? 'game' : 'package'
  const target = useMemo(() => (opened.game ? opened.game : { package: opened.package }), [opened.game, opened.package])
  const pending = useChangeset(target, side)
  const { ops, redo, why, setWhy, shown, last, checked, busy, rev, saving, said, fresh, lines, result, edit, addOps, back, again, discard, apply, undo } = pending
  const [domainVocab, setVocab] = useState(null)
  const [rawNames, setRawNames] = useState(null)
  const [list, setList] = usePref('copy-side', 'objects')
  const [scope, setScope] = useState(() => {
    const asked = QUERY.get('scope')
    return asked === null ? 'all' : /^\d+$/.test(asked) ? Number(asked) : asked
  })
  const [file, setFile] = useState(() => QUERY.get('file'))
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(null) // the field in the side panel: { at, path }
  const [drawerTab, setDrawerTab] = usePref('copy-drawer-tab', 'audit')
  const [layout, setLayout] = usePref('copy-layout', { tree: 240, audit: 200, side: 380, treeOpen: true, auditOpen: true, sideOpen: true })
  const [resize, setResize] = useState(null)
  useEffect(() => remember(opened, scope, file), [opened, scope, file])
  useEffect(() => {
    setVocab(null)
    setRawNames(null)
    setPicked(null)
    call('vocabulary', opened.game ? { game: opened.game } : { package: opened.package }).then(setVocab)
  }, [opened.game, opened.package])
  const content = shown?.content ?? null
  const loaded = Boolean(content)
  // Names for the links in the texts, as the changeset leaves the layer.
  const namesSeq = useRef(0)
  const naming = useMemo(() => JSON.stringify(ops.filter((op) => !['text.set', 'text.override'].includes(op.op))), [ops])
  useEffect(() => {
    if (!loaded) return undefined
    const no = ++namesSeq.current
    const args = opened.game ? { game: opened.game } : { package: opened.package }
    const timer = window.setTimeout(() => call('names', { ...args, scope: side, changeset: { ops: JSON.parse(naming) } }).then((r) => no === namesSeq.current && setRawNames(r)).catch(() => {}), naming === '[]' ? 0 : SETTLE)
    return () => window.clearTimeout(timer)
  }, [opened.game, opened.package, side, naming, rev, loaded])
  const vocab = useMemo(() => domainVocab && { ...domainVocab, vocabulary: withParts(domainVocab.vocabulary, content?.partDefs) }, [domainVocab, content])
  const names = useMemo(() => rawNames && {
    level: new Map(rawNames.levels.map((l) => [l.id, l])),
    part: new Map(rawNames.parts.map((p) => [p.key, p.name])),
    wiki: new Map(rawNames.entries.map((e) => [e.id, e.title])),
    quotes: rawNames.quotes,
    onLevel: () => {},
  }, [rawNames])
  const order = useMemo(() => (rawNames ? rawNames.levels.map((l) => l.id) : content?.levels.map((l) => l.id) ?? []), [rawNames, content])
  const levelOptions = useMemo(() => content?.levels.map((l) => ({ value: l.id, label: l.id, title: l.title })) ?? null, [content])
  const items = useMemo(() => lines.map(itemOf), [lines])
  const places = useMemo(() => placesOf(lines, checked?.order ?? shown?.order ?? []), [lines, checked, shown])
  const files = useMemo(() => (content && vocab ? copyFiles(allCopyRows(content, vocab.vocabulary, order, side)) : []), [content, vocab, order, side])

  const openDrawer = (next) => {
    setDrawerTab(next)
    setLayout((l) => (l.auditOpen ? l : { ...l, auditOpen: true }))
  }
  const pick = (next) => {
    setLayout((l) => (l.sideOpen ? l : { ...l, sideOpen: true }))
    setPicked(next)
  }
  const showScope = (next) => { setFile(null); setScope(next) }
  // A finding of the check: the field it names in game.json, else nothing more than the table.
  const jumpTo = (item) => {
    const found = /^content: (game|package)\.json((?:\.[^\s:[]+|\[\d+\])*): /.exec(item.text)
    if (found) pick({ at: { game: true }, path: parsePath(found[2].replace(/^\./, '')) })
    else if (item.levels[0]) pick({ at: { level: item.levels[0] }, path: [] })
  }
  const lists = Object.keys(LISTS).filter((id) => id !== 'search' || side === 'package')
  const shownList = lists.includes(list) ? list : 'objects'
  const scopes = !content ? [] : [
    ['all', side === 'game' ? tr('整款游戏') : tr('整个内容包', 'The whole package')],
    ...(side === 'game'
      ? (content.eras ?? []).map((era, k) => [k, `${era.id} ${L(era.title ?? era.chapter?.title) ?? ''}`.trim()])
      : groupTree(content, order).sections.filter((s) => s.group !== null).map((s) => [`group:${s.group}`, L(content.tags?.[s.group]?.title) || s.group])),
    ['glossary', tr('百科')],
    ...(content.partDefs ? [['pieces', tr('件', 'Pieces')]] : []),
  ]
  const matches = sidebarSearch(query)
  const sideCtx = vocab && content && { vocabulary: vocab.vocabulary, levels: content.levels.map((l) => l.id), names, levelOptions, textField, lang: getLang(), onSetting: () => {}, onSettings: () => {}, onPiece: () => {} }
  // A game edits only its own files here; its packages' texts get its own wording in the table.
  const sideField = picked && (side === 'package' || picked.at.game) ? picked : null
  const shownLayout = resize ? { ...layout, [resize.side]: resize.size } : layout
  const style = { '--tree-w': `${layout.treeOpen ? shownLayout.tree : 0}px`, '--audit-h': `${shownLayout.audit}px`, '--side-w': `${layout.sideOpen ? shownLayout.side : 0}px` }
  const resizer = { setLayout, previewResize: setResize, dragging: resize !== null }
  const ready = content && vocab
  const value = opened.game ? `game:${opened.game}` : `package:${opened.package}`
  return (
    <div className={`studio ${resize ? 'is-resizing' : ''}`}>
      <StudioBar space={space} ops={ops} busy={busy} fresh={fresh}>
        <select className="studio-game" value={value} disabled={saving} aria-label={tr('打开', 'Open')}
          onChange={(e) => { const [kind, id] = [e.target.value.slice(0, e.target.value.indexOf(':')), e.target.value.slice(e.target.value.indexOf(':') + 1)]; showScope('all'); onOpen({ [kind]: id }) }}>
          <optgroup label={tr('内容包', 'Packages')}>{packages.map(({ id }) => <option key={id} value={`package:${id}`}>{id}</option>)}</optgroup>
          <optgroup label={tr('游戏', 'Games')}>{games.map((g) => <option key={g.id} value={`game:${g.id}`}>{L(g.title) ?? g.id}</option>)}</optgroup>
        </select>
      </StudioBar>
      {!ready ? <div className="studio-loading">{tr('读取中……')}</div> : (
        <div className={`studio-body is-copy ${layout.treeOpen ? '' : 'no-tree'} ${layout.auditOpen ? '' : 'no-audit'} ${layout.sideOpen ? '' : 'no-side'}`} style={style}>
          <aside className="studio-tree">
            <div className="side-tabs" role="tablist" aria-label={tr('列表', 'Lists')}>
              {lists.map((id) => {
                const [Icon, zh, en] = LISTS[id]
                return (
                  <button key={id} type="button" role="tab" aria-selected={shownList === id} className={shownList === id ? 'is-on' : ''} aria-label={tr(zh, en)} title={tr(zh, en)} onClick={() => setList(id)}>
                    <Icon size={14} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
            {shownList === 'search'
              ? <Search content={content} vocabulary={vocab.vocabulary} onAdd={addOps} onJump={(level, path, kind) => {
                const keys = path ? parsePath(path) : []
                pick(level ? { at: { level }, path: keys } : kind === 'glossary' ? { at: { glossary: true }, path: keys } : kind === 'pieces' ? { at: { parts: true, root: keys.slice(0, 2) }, path: keys } : { at: { game: true }, path: keys })
              }} />
              : (
                <nav className="parts-list" aria-label={tr(...LISTS[shownList].slice(1))}>
                  <SidebarListTools query={query} onQuery={setQuery} />
                  {shownList === 'objects'
                    ? scopes.filter(([, label]) => matches(label)).map(([id, label]) => (
                      <button key={String(id)} type="button" className={`parts-row is-object ${file === null && scope === id ? 'is-on' : ''}`} aria-current={file === null && scope === id ? 'true' : undefined} onClick={() => showScope(id)}>
                        <i className="family-chip">{id === 'glossary' ? <BookOpen size={12} aria-hidden="true" /> : <ListTree size={12} aria-hidden="true" />}</i>
                        <span>{label}</span><i />
                      </button>
                    ))
                    : files.filter(([name]) => matches(name)).map(([name, count]) => (
                      <button key={name} type="button" className={`parts-row is-object ${file === name ? 'is-on' : ''}`} aria-current={file === name ? 'true' : undefined} onClick={() => setFile(name)}>
                        <i className="family-chip"><FileText size={12} aria-hidden="true" /></i>
                        <span>{name}</span><i />
                        <small className="object-count">{count}</small>
                      </button>
                    ))}
                </nav>
              )}
          </aside>
          <PanelResizer side="tree" size={layout.tree} open={layout.treeOpen} {...resizer} />
          <main className="studio-main">
            <div className="studio-scroll">
              <article className="editor is-wide">
                <CopyTable side={side} content={content} vocabulary={vocab.vocabulary} scope={scope} setScope={showScope} file={file} order={order} names={names} places={places} onEdit={edit}
                  onJump={(row) => pick(copyFieldOf(row))} />
              </article>
            </div>
          </main>
          <PanelResizer side="side" size={layout.side} open={layout.sideOpen} {...resizer} />
          <aside className="studio-side">
            {sideCtx && <Inspector content={content} vocab={vocab} at={sideField?.at ?? { game: true }} field={sideField ? { path: sideField.path } : null} ctx={sideCtx} places={places} onEdit={edit} onOps={addOps}
              onPick={(path) => pick({ at: sideField.at, path })} onLevel={() => {}} onRemoveLevel={() => {}} onRemoveSelection={() => setPicked(null)}
              tabs={[]} selection={sideField?.at ?? { game: true }} onToggleTab={() => {}} onOpenTab={() => {}} onCloseTab={() => {}}
              onNavigate={(path) => pick({ at: sideField.at, path })} />}
          </aside>
          {layout.auditOpen && <PanelResizer side="audit" size={layout.audit} open {...resizer} />}
          <aside className="studio-audit">
            <Drawer open={layout.auditOpen} tab={drawerTab} onTab={openDrawer} onToggle={() => setLayout((l) => ({ ...l, auditOpen: !l.auditOpen }))} sum={auditSum(items, last)} fresh={fresh} ops={ops}
              tabs={['audit', 'changes', 'debug']}
              audit={<Audit items={items} fresh={fresh} last={last} at={null} busy={busy} open={layout.auditOpen && drawerTab === 'audit'} onOpen={() => openDrawer('audit')} onJump={jumpTo} />}
              panel={drawerTab === 'changes' ? <Review ops={ops} redo={redo} result={result} shown={shown} why={why} setWhy={setWhy} said={said}
                onRemove={(k) => { if (confirmDelete(ops[k].op)) pending.remove(k) }} onBack={back} onRedo={again}
                onDiscard={discard} onOpen={pending.open} onApply={apply} onUndo={undo} onSelect={() => {}} />
                : <Debug ops={ops} last={last} />} />
          </aside>
        </div>
      )}
    </div>
  )
}
