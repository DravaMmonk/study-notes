import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  ArrowLeft,
  ArrowRight,
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
import { applyLang, currentLang, otherLang } from '../../games/kit/lang.js'
import { THEMES } from '../../games/kit/theme.js'
import { mountBarMenus } from '../../games/kit/menu.js'
import sections from '../../docs/.sections.json'
import AnnotationEntry from './components/AnnotationEntry'
import { createFigureHost } from './figures/host'
import { annotationAtPoint } from './lib/highlightGeometry'
import { buildDocumentTree, libraryDocuments, noteDocuments, renderMarkdown, versionOf } from './lib/content'
import { translate } from './lib/strings'
import {
  addAnnotation,
  annotationColors,
  applyAnnotations,
  deleteAnnotation,
  getAnnotations,
  updateAnnotation,
} from './lib/annotations'

const defaultDocument = noteDocuments.find((document) => document.path === 'index.md') ?? noteDocuments[0]

// The note in the address, in the reader's language.
function documentFromLocation(lang) {
  const requestedPath = new URLSearchParams(window.location.search).get('note')
  return versionOf(noteDocuments.find((document) => document.path === requestedPath) ?? defaultDocument, lang)
}

const initialDocument = documentFromLocation(currentLang())
const sidebarStorageKey = 'fieldnotes.sidebar.open'
const themeStorageKey = 'fieldnotes.theme'
const sectionTitle = (path, lang) => sections[path]?.[lang]

function initialTheme() {
  try {
    const saved = window.localStorage.getItem(themeStorageKey)
    if (THEMES.some(([id]) => id === saved)) return saved
  } catch {
    // Storage can be unavailable; fall back to the system preference.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'paper'
}

function initialSidebarState() {
  const savedState = window.localStorage.getItem(sidebarStorageKey)
  if (savedState !== null) return savedState === 'true'
  return window.innerWidth > 900
}

function App() {
  const [lang, setLang] = useState(currentLang)
  const t = (key, vars) => translate(lang, key, vars)
  const [activeDocument, setActiveDocument] = useState(initialDocument)
  const [query, setQuery] = useState('')
  const [annotations, setAnnotations] = useState(() => getAnnotations(initialDocument.path))
  const [activeAnnotationId, setActiveAnnotationId] = useState(null)
  const [selectionDraft, setSelectionDraft] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarState)
  const [inspectorOpen, setInspectorOpen] = useState(() => window.innerWidth > 690)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [toast, setToast] = useState('')
  const [theme, setTheme] = useState(initialTheme)
  const [barHidden, setBarHidden] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const lastScroll = useRef(0)
  const shownPath = useRef(null)
  const figureHosts = useRef(new Map())
  const themeRef = useRef(theme)
  const langRef = useRef(lang)
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
    if (!normalizedQuery) return libraryDocuments
    return libraryDocuments.filter((document) => {
      const zh = versionOf(document, 'zh')
      const en = versionOf(document, 'en')
      return `${zh.title} ${en.title} ${document.path} ${zh.content} ${en.content}`.toLocaleLowerCase().includes(normalizedQuery)
    })
  }, [query])

  const tree = useMemo(() => buildDocumentTree(filteredDocuments), [filteredDocuments])

  useEffect(() => {
    window.localStorage.setItem(sidebarStorageKey, String(sidebarOpen))
  }, [sidebarOpen])

  useEffect(() => {
    themeRef.current = theme
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem(themeStorageKey, theme)
    } catch {
      // Theme still applies for this session.
    }
    figureHosts.current.forEach((figure) => figure.setTheme(theme))
  }, [theme])

  useEffect(() => {
    langRef.current = lang
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    document.title = lang === 'zh' ? 'Fieldnotes — 本地学习书库' : 'Fieldnotes — Local Study Library'
  }, [lang])

  useEffect(() => {
    const hosts = figureHosts.current
    return () => {
      hosts.forEach((figure) => figure.dispose())
      hosts.clear()
    }
  }, [])

  useEffect(() => {
    const onLocationChange = () => {
      const nextDocument = documentFromLocation(langRef.current)
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
        setLightbox(null)
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
      // On narrow screens the bar slides away while reading down and returns on the way up.
      const y = window.scrollY
      if (window.matchMedia('(max-width: 690px)').matches && Math.abs(y - lastScroll.current) > 6) {
        setBarHidden(y > lastScroll.current && y > 80)
        lastScroll.current = y
      } else if (y < 80) {
        setBarHidden(false)
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [activeDocument])

  useEffect(() => {
    const article = articleRef.current
    if (!article) return
    article.innerHTML = renderedDocument.html
    if (shownPath.current !== activeDocument.path) {
      shownPath.current = activeDocument.path
      article.classList.remove('is-entering')
      void article.offsetWidth
      article.classList.add('is-entering')
    }
    // Figure hosts outlive re-renders, so a figure keeps its state while annotations change.
    const hosts = figureHosts.current
    const used = new Set()
    article.querySelectorAll('.figure-slot').forEach((slot, index) => {
      const key = `${activeDocument.path}#${index}#${slot.dataset.figure}`
      used.add(key)
      if (!hosts.has(key)) hosts.set(key, createFigureHost(slot.dataset.figure, themeRef.current, { lang: activeDocument.lang ?? langRef.current }))
      slot.replaceWith(hosts.get(key).host)
    })
    hosts.forEach((figure, key) => {
      if (used.has(key)) return
      figure.dispose()
      hosts.delete(key)
    })
    return applyAnnotations(article, annotations, activeAnnotationId)
  }, [activeDocument.path, activeDocument.lang, renderedDocument, annotations, activeAnnotationId])

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

  // Open a note in the reader's language (or in `language`, when switching).
  const navigateToDocument = (note, heading = '', language = lang) => {
    const targetDocument = versionOf(note, language)
    if (targetDocument.path === activeDocument.path) return
    const url = new URL(window.location.href)
    url.searchParams.set('note', targetDocument.path)
    url.hash = heading
    window.history[language === lang ? 'pushState' : 'replaceState']({}, '', url)
    setActiveDocument(targetDocument)
    setAnnotations(getAnnotations(targetDocument.path))
    setActiveAnnotationId(null)
    setSelectionDraft(null)
    if (window.matchMedia('(max-width: 900px)').matches) setSidebarOpen(false)
    if (language === lang) window.scrollTo({ top: 0, behavior: 'instant' })
    if (heading) {
      window.setTimeout(() => document.querySelector(heading)?.scrollIntoView({ block: 'start' }), 0)
    }
  }

  const switchLanguage = (next = otherLang(lang)) => {
    if (next === lang) return
    applyLang(next)
    setLang(next)
    navigateToDocument(activeDocument, '', next)
  }
  // The bar's menus are mounted once; they reach the latest switch through a ref.
  const switchRef = useRef(switchLanguage)
  useEffect(() => {
    switchRef.current = switchLanguage
  })
  const barMenusRef = useRef(null)
  useEffect(() => {
    const menus = mountBarMenus(barMenusRef.current, { onLang: (next) => switchRef.current(next), onTheme: setTheme })
    return () => menus.destroy()
  }, [])

  const handleArticleMouseUp = (event) => {
    if (event.target.closest('.figure-host')) return
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
      setToast(t('highlightSaved'))
    }
  }

  const handleAnnotationClick = (event) => {
    if (event.target.closest('.figure-host')) return
    if (event.target.tagName === 'IMG' && window.getSelection()?.isCollapsed !== false) {
      setLightbox({ src: event.target.currentSrc || event.target.src, alt: event.target.alt })
      return
    }
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
      setToast(t('commentTooLarge'))
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
      setToast(t('passageNotFound'))
      return false
    }

    if (annotations.some((annotation) => annotation.quote === quote && annotation.note === note)) {
      setToast(t('annotationExists'))
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
    setToast(t('annotationSaved'))
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
    setToast(t('annotationDeleted'))
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
    setToast(t('annotationsExported'))
  }

  return (
    <div className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'} ${inspectorOpen ? '' : 'inspector-collapsed'}`}>
      <div className="reading-progress" style={{ transform: `scaleX(${scrollProgress / 100})` }} />

      <Sidebar
        activeBase={activeDocument.basePath}
        documentCount={libraryDocuments.length}
        lang={lang}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={navigateToDocument}
        query={query}
        searchRef={searchRef}
        setQuery={setQuery}
        tree={tree}
      />

      <main className="reading-workspace">
        {/* The kit's top bar (games/kit/ui.css), as on the notes site and in the games. */}
        <header className={`kit-bar topbar ${barHidden ? 'is-hidden' : ''}`}>
          <button
            className="kit-btn sidebar-toggle"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label={t(sidebarOpen ? 'collapseLibrary' : 'expandLibrary')}
            aria-pressed={sidebarOpen}
          >
            {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
          </button>
          <Breadcrumbs document={activeDocument} lang={lang} />
          <div className="kit-actions topbar-actions">
            {/* The kit's language and theme menus (games/kit/menu.js), mounted into an element React leaves empty. */}
            <span className="kit-bar-menus" ref={barMenusRef} />
            <span className="annotation-count" title={t('annotationCount')}><Highlighter size={15} /> {annotations.length}</span>
            <button
              className="kit-btn"
              onClick={() => setInspectorOpen((value) => !value)}
              aria-label={t(inspectorOpen ? 'closeAnnotations' : 'openAnnotations')}
            >
              {inspectorOpen ? <PanelRightClose size={19} /> : <PanelRightOpen size={19} />}
            </button>
          </div>
        </header>

        <div className="document-frame">
          <article
            ref={articleRef}
            className="markdown-body kit-prose"
            onMouseUp={handleArticleMouseUp}
            onClick={handleAnnotationClick}
          />
          <NoteNeighbours current={activeDocument} lang={lang} onNavigate={navigateToDocument} />
          <DocumentOutline key={activeDocument.path} headings={renderedDocument.headings} label={t('onThisPage')} />
        </div>
      </main>
      {lightbox && (
        <button className="lightbox" onClick={() => setLightbox(null)} aria-label={t('closeImage')}>
          <img src={lightbox.src} alt={lightbox.alt} />
          {lightbox.alt && <span>{lightbox.alt}</span>}
        </button>
      )}

      <AnnotationInspector
        activeAnnotationId={activeAnnotationId}
        annotations={annotations}
        commentRef={commentRef}
        isOpen={inspectorOpen}
        lang={lang}
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
          lang={lang}
          onCreate={createHighlight}
          onDismiss={() => setSelectionDraft(null)}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

// Where the note sits: its folders by their course and semester names, then the note's title.
function Breadcrumbs({ document, lang }) {
  const folders = document.basePath.split('/').slice(0, -1)
  const parts = folders.map((_, index) => sectionTitle(folders.slice(0, index + 1).join('/'), lang) ?? folders[index])
  parts.push(document.title)
  return (
    <div className="kit-crumbs breadcrumbs" title={document.path}>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {part}
          {index < parts.length - 1 && <i>/</i>}
        </span>
      ))}
    </div>
  )
}

function Sidebar({ activeBase, documentCount, isOpen, lang, onClose, onNavigate, query, searchRef, setQuery, tree }) {
  const t = (key) => translate(lang, key)
  return (
    <>
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Box size={17} strokeWidth={1.5} /></div>
          <div>
            <strong>FIELDNOTES</strong>
            <span>{t('brandTagline')}</span>
          </div>
          <button className="icon-button sidebar-close" onClick={onClose} aria-label={t('closeLibrary')}><X size={18} /></button>
        </div>

        <label className="search-field">
          <Search size={16} />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchNotes')}
            aria-label={t('searchNotes')}
          />
          <kbd>⌘K</kbd>
        </label>

        <div className="library-heading"><span>{t('library')}</span><span>{documentCount}</span></div>
        <nav className="document-tree">
          {tree.children.length ? (
            tree.children.map((node) => (
              <TreeNode key={node.path} node={node} activeBase={activeBase} lang={lang} onNavigate={onNavigate} depth={0} />
            ))
          ) : (
            <div className="empty-search">{t('noNotes')}</div>
          )}
        </nav>

        <div className="sidebar-footer"><span className="status-dot" /><span>{t('readingLocal')}</span></div>
      </aside>
      {isOpen && <button className="mobile-scrim" onClick={onClose} aria-label={t('closeLibraryOverlay')} />}
    </>
  )
}

// The library lists each note once (its original); titles and folder names follow the reader's language.
function TreeNode({ node, activeBase, lang, onNavigate, depth }) {
  // Folders open by default near the root and whenever they hold the note being read.
  const [manual, setManual] = useState(null)
  const holdsActive = !node.document && activeBase.startsWith(`${node.path}/`)
  const expanded = manual ?? (depth < 2 || holdsActive)
  const activeRef = useRef(null)
  const isActive = node.document && activeBase === node.document.basePath
  useEffect(() => {
    if (isActive) activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [isActive])
  if (node.document) {
    return (
      <button
        ref={activeRef}
        className={`document-link ${isActive ? 'is-active' : ''}`}
        style={{ '--tree-depth': depth }}
        onClick={() => onNavigate(node.document)}
      >
        <FileText size={14} />
        <span>{versionOf(node.document, lang).title}</span>
      </button>
    )
  }

  return (
    <div className="tree-folder">
      <button className="folder-label" style={{ '--tree-depth': depth }} onClick={() => setManual(!expanded)} aria-expanded={expanded}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{sectionTitle(node.path, lang) ?? node.name}</span>
      </button>
      {expanded && node.children.map((child) => (
        <TreeNode key={child.path} node={child} activeBase={activeBase} lang={lang} onNavigate={onNavigate} depth={depth + 1} />
      ))}
    </div>
  )
}

function DocumentOutline({ headings, label }) {
  const [current, setCurrent] = useState(null)
  // Follow the reader: the last heading above the upper third of the screen is the current section.
  useEffect(() => {
    if (headings.length < 2) return undefined
    let frame = 0
    const update = () => {
      frame = 0
      let id = headings[0].id
      for (const heading of headings) {
        const node = document.getElementById(heading.id)
        if (node && node.getBoundingClientRect().top < window.innerHeight * 0.3) id = heading.id
      }
      setCurrent(id)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    frame = window.requestAnimationFrame(update)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [headings])
  if (headings.length < 2) return null
  return (
    <nav className="document-outline" aria-label={label}>
      <span>{label}</span>
      {headings.map((heading) => (
        <a key={heading.id} href={`#${heading.id}`} className={`outline-level-${heading.level} ${current === heading.id ? 'is-current' : ''}`} aria-current={current === heading.id ? 'location' : undefined}>{heading.text}</a>
      ))}
    </nav>
  )
}

// Previous and next notes in the same folder, in library order.
function NoteNeighbours({ current, lang, onNavigate }) {
  const t = (key) => translate(lang, key)
  const folder = current.basePath.slice(0, current.basePath.lastIndexOf('/') + 1)
  const siblings = libraryDocuments.filter((document) => document.path.startsWith(folder) && !document.path.slice(folder.length).includes('/'))
  const index = siblings.findIndex((document) => document.path === current.basePath)
  const previous = siblings[index - 1] && versionOf(siblings[index - 1], lang)
  const next = siblings[index + 1] && versionOf(siblings[index + 1], lang)
  if (!previous && !next) return null
  return (
    <nav className="note-neighbours" aria-label={t('neighbours')}>
      {previous ? (
        <button className="note-neighbour" onClick={() => onNavigate(previous)}>
          <span><ArrowLeft size={13} /> {t('previous')}</span>
          <b>{previous.title}</b>
        </button>
      ) : <span />}
      {next && (
        <button className="note-neighbour is-next" onClick={() => onNavigate(next)}>
          <span>{t('next')} <ArrowRight size={13} /></span>
          <b>{next.title}</b>
        </button>
      )}
    </nav>
  )
}

function SelectionToolbar({ draft, lang, onCreate, onDismiss, ref }) {
  const t = (key, vars) => translate(lang, key, vars)
  return (
    <div
      ref={ref}
      className="selection-toolbar"
      style={{ left: draft.x, top: draft.y }}
      onPointerDown={(event) => event.preventDefault()}
    >
      <button className="toolbar-close" onClick={onDismiss} aria-label={t('dismissSelection')}><X size={14} /></button>
      <div className="color-options">
        {Object.entries(annotationColors).map(([name, value]) => (
          <button
            key={name}
            className="color-swatch"
            style={{ '--swatch': value }}
            onClick={() => onCreate(name)}
            aria-label={t('highlight', { color: t(name) })}
          />
        ))}
      </div>
      <span className="toolbar-divider" />
      <button className="comment-action" onClick={() => onCreate('amber', true)}>
        <MessageSquareText size={15} /> {t('comment')}
      </button>
    </div>
  )
}

function AnnotationInspector({
  activeAnnotationId,
  annotations,
  commentRef,
  isOpen,
  lang,
  onAdd,
  onChange,
  onClose,
  onDelete,
  onError,
  onExport,
  onJump,
  title,
}) {
  const t = (key) => translate(lang, key)
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
        <div><span>{t('annotations')}</span><strong>{annotations.length}</strong></div>
        <button className="icon-button" onClick={onClose} aria-label={t('closeAnnotations')}><X size={18} /></button>
      </div>
      <p className="inspector-context">{title}</p>

      <button className="add-annotation-button" onClick={() => setComposerOpen((value) => !value)}>
        <MessageSquareText size={15} /> {t(composerOpen ? 'cancel' : 'addAnnotation')}
      </button>

      {composerOpen && (
        <div className="annotation-composer">
          <label>
            {t('passage')}
            <textarea
              value={composerQuote}
              onChange={(event) => setComposerQuote(event.target.value)}
              placeholder={t('passagePlaceholder')}
              aria-label={t('passage')}
            />
          </label>
          <label>
            {t('questionAnswer')}
            <textarea
              value={composerNote}
              onChange={(event) => setComposerNote(event.target.value)}
              placeholder={t('questionAnswerPlaceholder')}
              aria-label={t('questionAnswer')}
            />
          </label>
          <button type="button" onClick={saveComposer} disabled={!composerQuote.trim() || !composerNote.trim()}>
            {t('saveAnnotation')}
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
            lang={lang}
            onChange={onChange}
            onDelete={onDelete}
            onError={onError}
            onJump={onJump}
          />
        )) : (
          <div className="empty-annotations">
            <Highlighter size={24} />
            <strong>{t('noAnnotations')}</strong>
            <p>{t('noAnnotationsHint')}</p>
          </div>
        )}
      </div>

      {annotations.length > 0 && (
        <button className="export-button" onClick={onExport}><Download size={15} /> {t('exportNote')}</button>
      )}
    </aside>
  )
}

export default App
