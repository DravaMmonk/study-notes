import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { renderAnnotationMarkdown } from '../lib/content'
import { translate } from '../lib/strings'

const maxEmbeddedImageSize = 1024 * 1024

function AnnotationEntry({
  active,
  annotation,
  color,
  commentRef,
  lang,
  onChange,
  onDelete,
  onError,
  onJump,
}) {
  const [mode, setMode] = useState(active && !annotation.note ? 'edit' : 'preview')
  const editorRef = useRef(null)
  const imageInputRef = useRef(null)
  const t = (key, vars) => translate(lang, key, vars)
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
      onError(t('chooseImage'))
      return
    }
    if (file.size > maxEmbeddedImageSize) {
      onError(t('imageTooLarge'))
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const alt = file.name.replaceAll('[', '').replaceAll(']', '') || 'annotation image'
      insertMarkdown(`![${alt}](${reader.result})`)
    })
    reader.addEventListener('error', () => onError(t('imageUnreadable')))
    reader.readAsDataURL(file)
  }

  return (
    <article
      className={`annotation-item ${active ? 'is-active' : ''}`}
      style={{ '--annotation-color': color }}
      aria-label={t('annotationOn', { quote: annotation.quote })}
    >
      <button className="quote-button" onClick={() => onJump(annotation.id)} title={t('showPassage')}>
        <span className="quote-mark" aria-hidden="true" />
        <q>{annotation.quote}</q>
      </button>

      {mode === 'edit' ? (
        <textarea
          ref={setEditorRef}
          className="comment-editor"
          value={annotation.note}
          onChange={(event) => onChange(annotation.id, event.target.value)}
          placeholder={t('writeMarkdown')}
          aria-label={t('commentOn', { quote: annotation.quote })}
        />
      ) : (
        <div className="annotation-note-preview">
          {annotation.note
            ? <div dangerouslySetInnerHTML={{ __html: renderedNote }} />
            : <p className="empty-comment">{t('noComment')}</p>}
        </div>
      )}

      <div className="annotation-meta">
        <time dateTime={annotation.createdAt}>
          {new Date(annotation.createdAt).toLocaleDateString(lang === 'en' ? 'en-AU' : 'zh-CN', { day: 'numeric', month: 'short' })}
        </time>
        <div className="annotation-actions">
          {mode === 'edit' && (
            <button onClick={() => imageInputRef.current?.click()} aria-label={t('insertImage')}>
              <ImagePlus size={14} /> {t('image')}
            </button>
          )}
          <button
            onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
            aria-label={`${t(mode === 'edit' ? 'finishEditing' : 'edit')} · ${t('annotationOn', { quote: annotation.quote })}`}
          >
            {t(mode === 'edit' ? 'done' : annotation.note ? 'edit' : 'addComment')}
          </button>
          <button className="delete-annotation" onClick={() => onDelete(annotation.id)} aria-label={t('deleteAnnotation')}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <input ref={imageInputRef} className="image-input" type="file" accept="image/*" onChange={handleImage} />
    </article>
  )
}

export default AnnotationEntry
