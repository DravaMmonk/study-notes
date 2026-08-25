import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, ImagePlus, Trash2 } from 'lucide-react'
import { renderAnnotationMarkdown } from '../lib/content'

const maxEmbeddedImageSize = 1024 * 1024

function AnnotationCard({
  active,
  annotation,
  color,
  commentRef,
  onChange,
  onDelete,
  onError,
  onJump,
}) {
  const [expanded, setExpanded] = useState(active && !annotation.note)
  const [mode, setMode] = useState(active && !annotation.note ? 'edit' : 'preview')
  const editorRef = useRef(null)
  const imageInputRef = useRef(null)
  const renderedNote = useMemo(() => renderAnnotationMarkdown(annotation.note), [annotation.note])

  useEffect(() => {
    if (expanded && mode === 'edit' && active && !annotation.note) editorRef.current?.focus()
  }, [active, annotation.note, expanded, mode])

  const setEditorRef = (element) => {
    editorRef.current = element
    if (active && commentRef) commentRef.current = element
  }

  const toggleExpanded = () => {
    setExpanded((value) => {
      const nextValue = !value
      if (nextValue && !annotation.note) setMode('edit')
      return nextValue
    })
  }

  const insertMarkdown = (markdown) => {
    const editor = editorRef.current
    const start = editor?.selectionStart ?? annotation.note.length
    const end = editor?.selectionEnd ?? annotation.note.length
    const before = annotation.note.slice(0, start)
    const after = annotation.note.slice(end)
    const leadingBreak = before && !before.endsWith('\n') ? '\n\n' : ''
    const trailingBreak = after && !after.startsWith('\n') ? '\n\n' : ''
    const insertion = `${leadingBreak}${markdown}${trailingBreak}`
    const nextNote = `${before}${insertion}${after}`
    if (!onChange(annotation.id, nextNote)) return

    setMode('edit')
    window.requestAnimationFrame(() => {
      const cursor = start + insertion.length
      editorRef.current?.focus()
      editorRef.current?.setSelectionRange(cursor, cursor)
    })
  }

  const handleImage = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onError('Choose an image file')
      return
    }
    if (file.size > maxEmbeddedImageSize) {
      onError('Images must be smaller than 1 MB')
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const alt = file.name.replaceAll('[', '').replaceAll(']', '') || 'annotation image'
      insertMarkdown(`![${alt}](${reader.result})`)
    })
    reader.addEventListener('error', () => onError('Image could not be read'))
    reader.readAsDataURL(file)
  }

  return (
    <div
      className={`annotation-item ${active ? 'is-active' : ''} ${expanded ? 'is-expanded' : ''}`}
      style={{ '--annotation-color': color }}
    >
      <button className="quote-button" onClick={() => onJump(annotation.id)}>
        <span className="quote-mark" />
        <q>{annotation.quote}</q>
      </button>

      <button
        className="comment-toggle"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} comment on ${annotation.quote}`}
      >
        <span>{annotation.note ? 'Comment' : 'Add comment'}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {!expanded && (
        annotation.note ? (
          <div className="annotation-note-preview is-collapsed" dangerouslySetInnerHTML={{ __html: renderedNote }} />
        ) : (
          <p className="empty-comment">No comment yet</p>
        )
      )}

      {expanded && (
        <div className="comment-workspace">
          <div className="comment-toolbar">
            <div className="comment-modes" aria-label="Comment view">
              <button className={mode === 'edit' ? 'is-active' : ''} onClick={() => setMode('edit')}>Edit</button>
              <button className={mode === 'preview' ? 'is-active' : ''} onClick={() => setMode('preview')}>Preview</button>
            </div>
            <button className="image-button" onClick={() => imageInputRef.current?.click()} aria-label="Insert image">
              <ImagePlus size={15} /> Image
            </button>
            <input
              ref={imageInputRef}
              className="image-input"
              type="file"
              accept="image/*"
              onChange={handleImage}
            />
          </div>

          {mode === 'edit' ? (
            <textarea
              ref={setEditorRef}
              className="comment-editor"
              value={annotation.note}
              onChange={(event) => onChange(annotation.id, event.target.value)}
              placeholder="Write Markdown…"
              aria-label={`Comment on ${annotation.quote}`}
            />
          ) : (
            <div className="annotation-note-preview is-expanded">
              {annotation.note
                ? <div dangerouslySetInnerHTML={{ __html: renderedNote }} />
                : <p className="empty-comment">Nothing to preview yet</p>}
            </div>
          )}
        </div>
      )}

      <div className="annotation-meta">
        <span>{new Date(annotation.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
        <button onClick={() => onDelete(annotation.id)} aria-label="Delete annotation"><Trash2 size={14} /></button>
      </div>
    </div>
  )
}

export default AnnotationCard
