import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { renderAnnotationMarkdown } from '../lib/content'

const maxEmbeddedImageSize = 1024 * 1024

function AnnotationEntry({
  active,
  annotation,
  color,
  commentRef,
  onChange,
  onDelete,
  onError,
  onJump,
}) {
  const [mode, setMode] = useState(active && !annotation.note ? 'edit' : 'preview')
  const editorRef = useRef(null)
  const imageInputRef = useRef(null)
  const renderedNote = useMemo(() => renderAnnotationMarkdown(annotation.note), [annotation.note])

  useEffect(() => {
    if (mode === 'edit' && active && !annotation.note) editorRef.current?.focus()
  }, [active, annotation.note, mode])

  const setEditorRef = (element) => {
    editorRef.current = element
    if (active && commentRef) commentRef.current = element
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
    <article
      className={`annotation-item ${active ? 'is-active' : ''}`}
      style={{ '--annotation-color': color }}
      aria-label={`Annotation on ${annotation.quote}`}
    >
      <button className="quote-button" onClick={() => onJump(annotation.id)} title="Show passage in note">
        <span className="quote-mark" aria-hidden="true" />
        <q>{annotation.quote}</q>
      </button>

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
        <div className="annotation-note-preview">
          {annotation.note
            ? <div dangerouslySetInnerHTML={{ __html: renderedNote }} />
            : <p className="empty-comment">No comment yet</p>}
        </div>
      )}

      <div className="annotation-meta">
        <time dateTime={annotation.createdAt}>
          {new Date(annotation.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
        </time>
        <div className="annotation-actions">
          {mode === 'edit' && (
            <button onClick={() => imageInputRef.current?.click()} aria-label="Insert image">
              <ImagePlus size={14} /> Image
            </button>
          )}
          <button
            onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
            aria-label={`${mode === 'edit' ? 'Finish editing' : 'Edit'} annotation on ${annotation.quote}`}
          >
            {mode === 'edit' ? 'Done' : annotation.note ? 'Edit' : 'Add comment'}
          </button>
          <button className="delete-annotation" onClick={() => onDelete(annotation.id)} aria-label="Delete annotation">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <input ref={imageInputRef} className="image-input" type="file" accept="image/*" onChange={handleImage} />
    </article>
  )
}

export default AnnotationEntry
