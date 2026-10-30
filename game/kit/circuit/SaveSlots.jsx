import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ClipboardPaste, Copy, FileText, Layers, Pencil, Plus, X } from 'lucide-react'
import { Dialog } from '../shell/Dialogs.jsx'
import { tr } from '../shell/i18n.js'
import BlueprintDialog from './BlueprintDialog.jsx'

/**
 * A level's saved boards (../shell/slots.js), handed to the board's editor by the shell around a level's screen:
 * { game, level, at, list: [{ no, name }], open(k), add({ copy }), rename(k, name), drop(k) }. Outside a level (a bench in the parts
 * box, an intro) there is none, and the editors show no switcher.
 */
export const SlotsContext = createContext(null)

const labelOf = (slot) => slot.name || tr(`电路 ${slot.no}`, `Board ${slot.no}`)

/**
 * The switcher between a level's saved boards: a button naming the board played, opening a list to play another,
 * rename or drop one, or start a new one (fresh, or a copy of this one); and the board on screen as text, its
 * blueprint (BlueprintDialog), to copy out or import. `board`: { graph, parts, change(graph), types } from the editor
 * (without `types` the text can be read but not imported). On the desktop board it sits in the bottom left corner and
 * opens upwards; on a phone it starts the row of tools and opens downwards (`phone`).
 */
export default function SaveSlots({ phone = false, board = null }) {
  const slots = useContext(SlotsContext)
  const [open, setOpen] = useState(false)
  const [naming, setNaming] = useState(null) // the slot being renamed
  const [dropping, setDropping] = useState(null) // the slot asked about before it goes
  const [text, setText] = useState(null) // the blueprint dialog: 'show' | 'read'
  const root = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const away = (event) => !root.current?.contains(event.target) && setOpen(false)
    const key = (event) => event.key === 'Escape' && naming === null && setOpen(false)
    document.addEventListener('pointerdown', away)
    window.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', key)
    }
  }, [open, naming])
  if (!slots) return null

  const close = () => {
    setOpen(false)
    setNaming(null)
  }
  const act = (f) => () => {
    close()
    f()
  }
  const commit = (k, name) => {
    slots.rename(k, name)
    setNaming(null)
  }
  const current = slots.list[slots.at]
  return (
    <div className={`slots ${phone ? 'is-phone' : ''} ${open ? 'is-open' : ''}`} ref={root} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="slots-toggle" onClick={() => (open ? close() : setOpen(true))} aria-expanded={open} aria-haspopup="menu" title={tr('这一关存下的电路', 'Boards saved on this level')}>
        <Layers size={phone ? 15 : 14} aria-hidden="true" />
        <span>{labelOf(current)}</span>
        {slots.list.length > 1 && <small>{slots.at + 1}/{slots.list.length}</small>}
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <div className="slots-menu" role="menu" aria-label={tr('这一关存下的电路', 'Boards saved on this level')}>
          <ul>
            {slots.list.map((slot, k) => (
              <li key={slot.no} className={k === slots.at ? 'is-current' : ''}>
                {naming === k ? (
                  <input
                    className="slots-name"
                    autoFocus
                    defaultValue={slot.name}
                    placeholder={labelOf({ ...slot, name: '' })}
                    maxLength={40}
                    aria-label={tr('电路名称', 'Board name')}
                    onFocus={(e) => e.target.select()}
                    onBlur={(e) => commit(k, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commit(k, e.target.value)
                      if (e.key === 'Escape') setNaming(null)
                    }}
                  />
                ) : (
                  <button type="button" className="slots-pick" role="menuitemradio" aria-checked={k === slots.at} onClick={act(() => slots.open(k))}>
                    <Check size={13} aria-hidden="true" />
                    <span>{labelOf(slot)}</span>
                  </button>
                )}
                <button type="button" className="slots-icon" onClick={() => setNaming(naming === k ? null : k)} aria-label={tr(`重命名「${labelOf(slot)}」`, `Rename “${labelOf(slot)}”`)} title={tr('重命名', 'Rename')}><Pencil size={13} /></button>
                {slots.list.length > 1 && <button type="button" className="slots-icon is-danger" onClick={act(() => setDropping(k))} aria-label={tr(`删除「${labelOf(slot)}」`, `Delete “${labelOf(slot)}”`)} title={tr('删除', 'Delete')}><X size={13} /></button>}
              </li>
            ))}
          </ul>
          <div className="slots-add">
            <button type="button" role="menuitem" onClick={act(() => slots.add({ copy: false }))}><Plus size={13} aria-hidden="true" />{tr('新建空白电路', 'New empty board')}</button>
            <button type="button" role="menuitem" onClick={act(() => slots.add({ copy: true }))}><Copy size={13} aria-hidden="true" />{tr('复制这块电路', 'Copy this board')}</button>
          </div>
          {board && (
            <div className="slots-add">
              <button type="button" role="menuitem" onClick={act(() => setText('show'))}><FileText size={13} aria-hidden="true" />{tr('以文本查看 / 复制', 'View / copy as text')}</button>
              {board.types && <button type="button" role="menuitem" onClick={act(() => setText('read'))}><ClipboardPaste size={13} aria-hidden="true" />{tr('从文本导入', 'Import from text')}</button>}
            </div>
          )}
        </div>
      )}
      {text && board && <BlueprintDialog board={board} head={{ game: slots.game, level: slots.level }} mode={text} onClose={() => setText(null)} />}
      {/* On the page itself: the tools' blurred backing would otherwise hold the dialog inside it. */}
      {dropping !== null && slots.list[dropping] && createPortal(
        <Dialog
          title={tr(`删除「${labelOf(slots.list[dropping])}」？`, `Delete “${labelOf(slots.list[dropping])}”?`)}
          lines={[tr('删除后无法撤销。这一关的其他电路不受影响。', 'This cannot be undone. The other boards of this level are unaffected.')]}
          actions={[[tr('取消', 'Cancel'), () => setDropping(null)], [tr('删除', 'Delete'), () => { slots.drop(dropping); setDropping(null) }]]}
          onClose={() => setDropping(null)}
        />,
        document.body,
      )}
    </div>
  )
}
