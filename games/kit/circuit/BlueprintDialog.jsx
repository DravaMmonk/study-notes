import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Download, FileUp } from 'lucide-react'
import { useEscape } from '../shell/Dialogs.jsx'
import { L, tr } from '../shell/i18n.js'
import { headOf, print, read } from './text.js'

/**
 * A board as text (text.js), its blueprint: shown to copy or save as a file, and read back from a paste or a file
 * (written in any notepad). Reading replaces the board on screen, which undo brings back.
 *
 * board  { graph, parts, change(graph), types }   the editor's board and the parts this level offers
 * head   { game, level }                          what the text's first line says it is
 * mode   'show' (the board's text, ready to copy) | 'read' (an empty box to paste into)
 */
export default function BlueprintDialog({ board, head, mode, onClose }) {
  const shown = print(board.graph, board.parts, head)
  const [text, setText] = useState(mode === 'show' ? shown : '')
  const [errors, setErrors] = useState([])
  const [copied, setCopied] = useState(false)
  const file = useRef(null)
  const box = useRef(null)
  useEscape(onClose)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // No clipboard here (an older browser, a page not served over https): the text is selected to copy by hand.
      box.current?.select()
      document.execCommand?.('copy')
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  const save = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `${[head.game, head.level].filter(Boolean).join('-') || 'board'}.txt` })
    document.body.append(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  const open = (event) => {
    const picked = event.target.files?.[0]
    event.target.value = ''
    if (!picked) return
    const reader = new FileReader()
    reader.onload = () => {
      setText(String(reader.result))
      setErrors([])
    }
    reader.readAsText(picked)
  }
  const apply = () => {
    const said = headOf(text)
    if (said?.game && head.game && said.game !== head.game) {
      setErrors([{ zh: `这是《${said.game}》的电路，不是这款游戏的。`, en: `This board is from “${said.game}”, not this game.` }])
      return
    }
    const result = read(text, board.graph, board.parts, board.types)
    if (result.errors) {
      setErrors(result.errors)
      return
    }
    board.change(result.graph)
    onClose()
  }
  const changed = text !== shown

  return createPortal(
    <div className="dialog-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog blueprint" role="dialog" aria-modal="true" aria-label={tr('电路的文本', 'The board as text')}>
        <h2>{mode === 'show' ? tr('电路的文本', 'The board as text') : tr('从文本导入', 'Import from text')}</h2>
        <p className="blueprint-note">
          {mode === 'show'
            ? tr('这就是这块电路的蓝图：复制或存成文件，在任何记事本里都能改，再导入回来。', 'This is the board’s blueprint: copy it or save it as a file, edit it in any notepad, and import it back.')
            : tr('粘贴一份蓝图，或打开一个 .txt 文件。导入会替换这块板上的电路，可以撤销。', 'Paste a blueprint, or open a .txt file. Importing replaces this board’s circuit; undo brings it back.')}
        </p>
        <textarea
          ref={box}
          className="blueprint-text"
          value={text}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          placeholder={'# blueprint 1\nn = gNot(Wind)\nout <- n'}
          aria-label={tr('蓝图', 'Blueprint')}
          onChange={(e) => {
            setText(e.target.value)
            setErrors([])
          }}
        />
        {errors.length > 0 && (
          <ul className="blueprint-errors" role="alert">
            {errors.slice(0, 6).map((e, k) => <li key={k}>{L(e)}</li>)}
            {errors.length > 6 && <li>{tr(`还有 ${errors.length - 6} 处`, `${errors.length - 6} more`)}</li>}
          </ul>
        )}
        <input ref={file} type="file" accept=".txt,text/plain" hidden onChange={open} />
        <div className="blueprint-tools">
          <button type="button" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? tr('已复制', 'Copied') : tr('复制', 'Copy')}</button>
          <button type="button" onClick={save}><Download size={14} />{tr('存为文件', 'Save as file')}</button>
          <button type="button" onClick={() => file.current?.click()}><FileUp size={14} />{tr('打开文件', 'Open file')}</button>
        </div>
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>{tr('关闭', 'Close')}</button>
          {board.types && <button type="button" className="is-primary" disabled={!text.trim() || (mode === 'show' && !changed)} onClick={apply}>{tr('导入到这块板', 'Import to this board')}</button>}
        </div>
      </div>
    </div>,
    document.body,
  )
}
