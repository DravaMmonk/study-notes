import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Highlighter,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
  X,
} from 'lucide-react'
import './App.css'
import 'katex/dist/katex.min.css'
import AnnotationEntry from './components/AnnotationEntry'
import { annotationAtPoint } from './lib/highlightGeometry'
import { buildDocumentTree, noteDocuments, renderMarkdown } from './lib/content'
import {
  addAnnotation,
  annotationColors,
  applyAnnotations,
  deleteAnnotation,
  getAnnotations,
  updateAnnotation,
} from './lib/annotations'

const defaultDocument = noteDocuments.find((document) => document.path === 'index.md') ?? noteDocuments[0]

function documentFromLocation() {
  const requestedPath = new URLSearchParams(window.location.search).get('note')
  return noteDocuments.find((document) => document.path === requestedPath) ?? defaultDocument
}

const initialDocument = documentFromLocation()
const sidebarStorageKey = 'fieldnotes.sidebar.open'

function initialSidebarState() {
  const savedState = window.localStorage.getItem(sidebarStorageKey)
  if (savedState !== null) return savedState === 'true'
  return window.innerWidth > 900
}

function App() {
  const [activeDocument, setActiveDocument] = useState(initialDocument)
  const [query, setQuery] = useState('')
  const [annotations, setAnnotations] = useState(() => getAnnotations(initialDocument.path))
  const [activeAnnotationId, setActiveAnnotationId] = useState(null)
  const [selectionDraft, setSelectionDraft] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarState)
  const [inspectorOpen, setInspectorOpen] = useState(() => window.innerWidth > 690)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [toast, setToast] = useState('')
  const searchRef = useRef(null)
  const articleRef = useRef(null)
  const commentRef = useRef(null)
  const selectionToolbarRef = useRef(null)

  const renderedDocument = useMemo(
    () => renderMarkdown(activeDocument.content, activeDocument.sourcePath),
    [activeDocument],
  )

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return noteDocuments
    return noteDocuments.filter((document) =>
      `${document.title} ${document.path} ${document.content}`.toLocaleLowerCase().includes(normalizedQuery),
    )
  }, [query])

  const tree = useMemo(() => buildDocumentTree(filteredDocuments), [filteredDocuments])

  useEffect(() => {
    window.localStorage.setItem(sidebarStorageKey, String(sidebarOpen))
  }, [sidebarOpen])

  useEffect(() => {
    const onLocationChange = () => {
      const nextDocument = documentFromLocation()
      setActiveDocument(nextDocument)
      setAnnotations(getAnnotations(nextDocument.path))
      setActiveAnnotationId(null)
      setSelectionDraft(null)
      if (window.matchMedia('(max-width: 900px)').matches) setSidebarOpen(false)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('popstate', onLocationChange)
    return () => window.removeEventListener('popstate', onLocationChange)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setSelectionDraft(null)
        window.getSelection()?.removeAllRanges()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const article = articleRef.current
      if (!article) return
      const rect = article.getBoundingClientRect()
      const readableDistance = Math.max(article.offsetHeight - window.innerHeight * 0.55, 1)
      setScrollProgress(Math.min(100, Math.max(0, (-rect.top / readableDistance) * 100)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [activeDocument])

  useEffect(() => {
    const article = articleRef.current
    if (!article) return
    article.innerHTML = renderedDocument.html
    return applyAnnotations(article, annotations, activeAnnotationId)
  }, [renderedDocument, annotations, activeAnnotationId])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!selectionDraft) return undefined

    const dismissOutsideToolbar = (event) => {
      if (selectionToolbarRef.current?.contains(event.target)) return
      setSelectionDraft(null)
    }
    const dismissCollapsedSelection = () => {
      window.requestAnimationFrame(() => {
        const selection = window.getSelection()
        const toolbarHasFocus = selectionToolbarRef.current?.contains(document.activeElement)
        if (!toolbarHasFocus && (!selection || selection.isCollapsed)) setSelectionDraft(null)
      })
    }

    document.addEventListener('pointerdown', dismissOutsideToolbar, true)
    document.addEventListener('selectionchange', dismissCollapsedSelection)
    return () => {
      document.removeEventListener('pointerdown', dismissOutsideToolbar, true)
      document.removeEventListener('selectionchange', dismissCollapsedSelection)
    }
  }, [selectionDraft])

  const navigateToDocument = (targetDocument, heading = '') => {
    if (targetDocument.path === activeDocument.path) return
    const url = new URL(window.location.href)
    url.searchParams.set('note', targetDocument.path)
    url.hash = heading
    window.history.pushState({}, '', url)
    setActiveDocument(targetDocument)
    setAnnotations(getAnnotations(targetDocument.path))
    setActiveAnnotationId(null)
    setSelectionDraft(null)
    if (window.matchMedia('(max-width: 900px)').matches) setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (heading) {
      window.setTimeout(() => document.querySelector(heading)?.scrollIntoView({ block: 'start' }), 0)
    }
  }

  const handleArticleMouseUp = () => {
    window.setTimeout(() => {
      const selection = window.getSelection()
      const article = articleRef.current
      if (!selection || selection.isCollapsed || !article || !selection.rangeCount) {
        setSelectionDraft(null)
        return
      }

      const range = selection.getRangeAt(0)
      if (!article.contains(range.commonAncestorContainer)) return

      const beforeStart = range.cloneRange()
      beforeStart.selectNodeContents(article)
      beforeStart.setEnd(range.startContainer, range.startOffset)

      const selectedText = selection.toString()
      const quote = selectedText.trim()
      if (!quote) return

      const rawStart = beforeStart.toString().length
      const leadingWhitespace = selectedText.length - selectedText.trimStart().length
      const start = rawStart + leadingWhitespace
      const selectionRect = range.getBoundingClientRect()

      setSelectionDraft({
        start,
        end: start + quote.length,
        quote,
        prefix: article.textContent.slice(Math.max(0, start - 32), start),
        suffix: article.textContent.slice(start + quote.length, start + quote.length + 32),
        x: Math.min(window.innerWidth - 190, Math.max(12, selectionRect.left + selectionRect.width / 2 - 82)),
        y: Math.max(76, selectionRect.top + window.scrollY - 54),
      })
    }, 0)
  }

  const createHighlight = (color, withComment = false) => {
    if (!selectionDraft) return
    const annotation = addAnnotation(activeDocument.path, { ...selectionDraft, color, note: '' })
    setAnnotations(getAnnotations(activeDocument.path))
    setActiveAnnotationId(annotation.id)
    setSelectionDraft(null)
    window.getSelection()?.removeAllRanges()
    if (withComment) {
      setInspectorOpen(true)
      window.setTimeout(() => commentRef.current?.focus(), 80)
    } else {
      setToast('Highlight saved locally')
    }
  }

  const handleAnnotationClick = (event) => {
    const documentLink = event.target.closest('a[data-note-path]')
    if (documentLink) {
      const document = noteDocuments.find((item) => item.path === documentLink.dataset.notePath)
      if (document) {
        event.preventDefault()
        navigateToDocument(document, documentLink.hash)
      }
      return
    }
    const mark = event.target.closest('mark[data-annotation-id]')
    const id = mark?.dataset.annotationId ?? annotationAtPoint(articleRef.current, event.clientX, event.clientY)
    if (!id) return
    setActiveAnnotationId(id)
    setInspectorOpen(true)
  }

  const handleCommentChange = (id, note) => {
    try {
      updateAnnotation(activeDocument.path, id, { note })
      setAnnotations(getAnnotations(activeDocument.path))
      return true
    } catch {
      setToast('Comment is too large for local storage')
      return false
    }
  }

  const createAnnotationFromQuote = (quoteValue, noteValue) => {
    const quote = quoteValue.trim()
    const note = noteValue.trim()
    const article = articleRef.current
    if (!quote || !note || !article) return false

    const start = article.textContent.indexOf(quote)
    if (start === -1) {
      setToast('Passage not found in this note')
      return false
    }

    if (annotations.some((annotation) => annotation.quote === quote && annotation.note === note)) {
      setToast('Annotation already exists')
      return false
    }

    const annotation = addAnnotation(activeDocument.path, {
      start,
      end: start + quote.length,
      quote,
      prefix: article.textContent.slice(Math.max(0, start - 32), start),
      suffix: article.textContent.slice(start + quote.length, start + quote.length + 32),
      color: 'amber',
      note,
    })
    setAnnotations(getAnnotations(activeDocument.path))
    setActiveAnnotationId(annotation.id)
    setInspectorOpen(true)
    setToast('Annotation saved locally')
    window.setTimeout(() => {
      document.querySelector(`[data-annotation-id="${CSS.escape(annotation.id)}"]`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 80)
    return true
  }

  const handleDelete = (id) => {
    deleteAnnotation(activeDocument.path, id)
    setAnnotations(getAnnotations(activeDocument.path))
    setActiveAnnotationId(null)
    setToast('Annotation deleted')
  }

  const jumpToAnnotation = (id) => {
    setActiveAnnotationId(id)
    document.querySelector(`[data-annotation-id="${CSS.escape(id)}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  const exportAnnotations = () => {
    const payload = JSON.stringify({ document: activeDocument.path, annotations }, null, 2)
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeDocument.slug}-annotations.json`
    link.click()
    URL.revokeObjectURL(url)
    setToast('Annotations exported')
  }

  return (
    <div className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'} ${inspectorOpen ? '' : 'inspector-collapsed'}`}>
      <div className="reading-progress" style={{ transform: `scaleX(${scrollProgress / 100})` }} />

      <Sidebar
        activePath={activeDocument.path}
        documentCount={noteDocuments.length}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={navigateToDocument}
        query={query}
        searchRef={searchRef}
        setQuery={setQuery}
        tree={tree}
      />

      <main className="reading-workspace">
        <header className="topbar">
          <button
            className="icon-button sidebar-toggle"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label={sidebarOpen ? 'Collapse library' : 'Expand library'}
            aria-pressed={sidebarOpen}
          >
            {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
          </button>
          <div className="breadcrumbs" title={activeDocument.path}>
            {activeDocument.path.split('/').map((part, index, parts) => (
              <span key={`${part}-${index}`}>
                {part.replace(/\.md$/, '')}
                {index < parts.length - 1 && <i>/</i>}
              </span>
            ))}
          </div>
          <div className="topbar-actions">
            <span className="annotation-count"><Highlighter size={15} /> {annotations.length}</span>
            <button
              className="icon-button"
              onClick={() => setInspectorOpen((value) => !value)}
              aria-label={inspectorOpen ? 'Close annotations' : 'Open annotations'}
            >
              {inspectorOpen ? <PanelRightClose size={19} /> : <PanelRightOpen size={19} />}
            </button>
          </div>
        </header>

        <div className="document-frame">
          <article
            ref={articleRef}
            className="markdown-body"
            onMouseUp={handleArticleMouseUp}
            onClick={handleAnnotationClick}
          />
          <DocumentOutline headings={renderedDocument.headings} />
        </div>
      </main>

      <AnnotationInspector
        activeAnnotationId={activeAnnotationId}
        annotations={annotations}
        commentRef={commentRef}
        isOpen={inspectorOpen}
        onAdd={createAnnotationFromQuote}
        onChange={handleCommentChange}
        onClose={() => setInspectorOpen(false)}
        onDelete={handleDelete}
        onError={setToast}
        onExport={exportAnnotations}
        onJump={jumpToAnnotation}
        title={activeDocument.title}
      />

      {selectionDraft && (
        <SelectionToolbar
          ref={selectionToolbarRef}
          draft={selectionDraft}
          onCreate={createHighlight}
          onDismiss={() => setSelectionDraft(null)}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function Sidebar({ activePath, documentCount, isOpen, onClose, onNavigate, query, searchRef, setQuery, tree }) {
  return (
    <>
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><BookOpen size={17} /></div>
          <div>
            <strong>FIELDNOTES</strong>
            <span>Local study library</span>
          </div>
          <button className="icon-button sidebar-close" onClick={onClose} aria-label="Close library"><X size={18} /></button>
        </div>

        <label className="search-field">
          <Search size={16} />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
          />
          <kbd>⌘K</kbd>
        </label>

        <div className="library-heading"><span>Library</span><span>{documentCount}</span></div>
        <nav className="document-tree">
          {tree.children.length ? (
            tree.children.map((node) => (
              <TreeNode key={node.path} node={node} activePath={activePath} onNavigate={onNavigate} depth={0} />
            ))
          ) : (
            <div className="empty-search">No notes found</div>
          )}
        </nav>

        <div className="sidebar-footer"><span className="status-dot" /><span>Reading local Markdown</span></div>
      </aside>
      {isOpen && <button className="mobile-scrim" onClick={onClose} aria-label="Close library overlay" />}
    </>
  )
}

function TreeNode({ node, activePath, onNavigate, depth }) {
  const [expanded, setExpanded] = useState(depth < 2)
  if (node.document) {
    return (
      <button
        className={`document-link ${activePath === node.document.path ? 'is-active' : ''}`}
        style={{ '--tree-depth': depth }}
        onClick={() => onNavigate(node.document)}
      >
        <FileText size={14} />
        <span>{node.document.title}</span>
      </button>
    )
  }

  return (
    <div className="tree-folder">
      <button className="folder-label" style={{ '--tree-depth': depth }} onClick={() => setExpanded((value) => !value)}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{node.name}</span>
      </button>
      {expanded && node.children.map((child) => (
        <TreeNode key={child.path} node={child} activePath={activePath} onNavigate={onNavigate} depth={depth + 1} />
      ))}
    </div>
  )
}

function DocumentOutline({ headings }) {
  if (headings.length < 2) return null
  return (
    <nav className="document-outline" aria-label="On this page">
      <span>On this page</span>
      {headings.map((heading) => (
        <a key={heading.id} href={`#${heading.id}`} className={`outline-level-${heading.level}`}>{heading.text}</a>
      ))}
    </nav>
  )
}

function SelectionToolbar({ draft, onCreate, onDismiss, ref }) {
  return (
    <div
      ref={ref}
      className="selection-toolbar"
      style={{ left: draft.x, top: draft.y }}
      onPointerDown={(event) => event.preventDefault()}
    >
      <button className="toolbar-close" onClick={onDismiss} aria-label="Dismiss selection"><X size={14} /></button>
      <div className="color-options">
        {Object.entries(annotationColors).map(([name, value]) => (
          <button
            key={name}
            className="color-swatch"
            style={{ '--swatch': value }}
            onClick={() => onCreate(name)}
            aria-label={`Highlight ${name}`}
          />
        ))}
      </div>
      <span className="toolbar-divider" />
      <button className="comment-action" onClick={() => onCreate('amber', true)}>
        <MessageSquareText size={15} /> Comment
      </button>
    </div>
  )
}

function AnnotationInspector({
  activeAnnotationId,
  annotations,
  commentRef,
  isOpen,
  onAdd,
  onChange,
  onClose,
  onDelete,
  onError,
  onExport,
  onJump,
  title,
}) {
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerQuote, setComposerQuote] = useState('')
  const [composerNote, setComposerNote] = useState('')

  const saveComposer = () => {
    if (!onAdd(composerQuote, composerNote)) return
    setComposerOpen(false)
    setComposerQuote('')
    setComposerNote('')
  }

  return (
    <aside className={`annotation-inspector ${isOpen ? 'is-open' : ''}`}>
      <div className="inspector-header">
        <div><span>Annotations</span><strong>{annotations.length}</strong></div>
        <button className="icon-button" onClick={onClose} aria-label="Close annotations"><X size={18} /></button>
      </div>
      <p className="inspector-context">{title}</p>

      <button className="add-annotation-button" onClick={() => setComposerOpen((value) => !value)}>
        <MessageSquareText size={15} /> {composerOpen ? 'Cancel' : 'Add annotation'}
      </button>

      {composerOpen && (
        <div className="annotation-composer">
          <label>
            Passage to highlight
            <textarea
              value={composerQuote}
              onChange={(event) => setComposerQuote(event.target.value)}
              placeholder="Paste an exact passage from this note"
              aria-label="Passage to highlight"
            />
          </label>
          <label>
            Question and answer
            <textarea
              value={composerNote}
              onChange={(event) => setComposerNote(event.target.value)}
              placeholder="问题：…\n\n答案：…"
              aria-label="Question and answer"
            />
          </label>
          <button type="button" onClick={saveComposer} disabled={!composerQuote.trim() || !composerNote.trim()}>
            Save annotation
          </button>
        </div>
      )}

      <div className="annotation-list">
        {annotations.length ? annotations.map((annotation) => (
          <AnnotationEntry
            key={annotation.id}
            active={activeAnnotationId === annotation.id}
            annotation={annotation}
            color={annotationColors[annotation.color]}
            commentRef={commentRef}
            onChange={onChange}
            onDelete={onDelete}
            onError={onError}
            onJump={onJump}
          />
        )) : (
          <div className="empty-annotations">
            <Highlighter size={24} />
            <strong>No annotations yet</strong>
            <p>Select any passage in the note to highlight it or add a comment.</p>
          </div>
        )}
      </div>

      {annotations.length > 0 && (
        <button className="export-button" onClick={onExport}><Download size={15} /> Export this note</button>
      )}
    </aside>
  )
}

export default App
