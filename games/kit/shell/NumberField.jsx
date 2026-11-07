import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { L, tr } from './i18n.js'
import { numberKey, numberValue } from './number-entry.js'
import { numberText } from '../engine/number.js'

function NumberPad({ label, value, onCancel, onCommit, onNext }) {
  const [draft,setDraft] = useState({text:String(value),replace:true})
  const root = useRef(null)
  useEffect(()=>{root.current?.focus()},[])
  const parsed = numberValue(draft.text)
  const press=(key)=>setDraft((s)=>numberKey(s,key))
  const keys=[['7','7'],['8','8'],['9','9'],['erase','⌫'],['4','4'],['5','5'],['6','6'],['sign','±'],['1','1'],['2','2'],['3','3'],['/','÷'],['0','0'],['.','.'],['e','e'],['clear','C']]
  const keyLabel=(key)=>key==='erase'?tr('退格','Backspace'):key==='clear'?tr('清空数值','Clear value'):key==='sign'?tr('切换正负号','Change sign'):key==='/'?tr('输入分数','Enter fraction'):key==='e'?tr('科学计数指数','Scientific exponent'):key
  return createPortal(<div className="number-pad-scrim" onPointerDown={(e)=>{e.stopPropagation();if(e.target===e.currentTarget)onCancel()}}>
    <section className="number-pad" role="dialog" aria-modal="true" aria-label={tr('数字小键盘','Numeric keypad')} tabIndex={-1} ref={root} onKeyDown={(e)=>{
      e.stopPropagation()
      if(e.key==='Escape'){e.preventDefault();onCancel()}
      else if(e.key==='Enter'&&e.target.tagName!=='BUTTON'){e.preventDefault();if(parsed!==null)onCommit(parsed)}
      else if(/^\d$/.test(e.key)||['.','/','e','E','-','Backspace','Delete'].includes(e.key)){e.preventDefault();press(e.key==='Backspace'?'erase':e.key==='Delete'?'clear':e.key==='-'?'sign':e.key.toLowerCase())}
    }}>
      <header><strong>{L(label)}</strong><span>{tr('数字小键盘','Numeric keypad')}</span></header>
      <output className={draft.replace?'is-selected':''} aria-label={tr('待输入数值','Numeric draft')} aria-live="polite">{draft.text||'—'}</output>
      <p>{parsed===null?tr('请输入有效数值','Enter a valid value'):draft.text.includes('/')?`= ${parsed}`:tr('支持负数、小数、分数和科学计数','Signed decimals, fractions and scientific notation')}</p>
      <div className="number-pad-keys">{keys.map(([key,text])=><button key={key} type="button" aria-label={keyLabel(key)} onClick={()=>press(key)}>{text}</button>)}</div>
      <footer><button type="button" onClick={onCancel}>{tr('取消','Cancel')}</button>{onNext&&<button type="button" disabled={parsed===null} onClick={()=>onNext(parsed)}>{tr('下一项','Next')}</button>}<button type="button" disabled={parsed===null} onClick={()=>onCommit(parsed)}>{tr('完成','Done')}</button></footer>
    </section>
  </div>,document.body)
}

const shownText = (value) => (value === '' || value === null || value === undefined ? '' : Number.isFinite(Number(value)) ? numberText(Number(value)) : String(value))

/**
 * A number to edit. On a desktop, a text field that takes decimals and fractions (1/9) as typed, ↑ and ↓ stepping by
 * `step` (1 when any); on a phone, a keypad, which walks on to the next number of the same part (下一项), so a row of
 * weights or a kernel is filled in one go. Neither path changes read-only inspection.
 */
export default function NumberField({ label, value, onChange, phone, readOnly, min, max, step = 'any' }) {
  const [open,setOpen] = useState(false)
  const [draft,setDraft] = useState(null)
  const trigger = useRef(null)
  const close=()=>{setOpen(false);trigger.current?.focus()}
  if(!phone){
    const nudge=(d)=>{const n=Number(value);if(Number.isFinite(n))onChange(String(Math.min(max??Infinity,Math.max(min??-Infinity,n+d*(typeof step==='number'?step:1)))))}
    return <input aria-label={L(label)} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={draft??shownText(value)} readOnly={readOnly}
      onPointerDown={(e)=>e.stopPropagation()} onFocus={(e)=>e.target.select()} onBlur={()=>setDraft(null)}
      onKeyDown={(e)=>{if(readOnly)return;if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();setDraft(null);nudge(e.key==='ArrowUp'?1:-1)}else if(e.key==='Enter')e.target.blur()}}
      onChange={(e)=>{setDraft(e.target.value);const v=numberValue(e.target.value);if(v!==null)onChange(String(v))}}/>
  }
  // The part's number fields in order, so the keypad can walk on to the next one.
  const next=()=>{const all=[...(trigger.current?.closest('.pf-face')?.querySelectorAll('button.number-field:not(:disabled)')??[])];return all[all.indexOf(trigger.current)+1]??null}
  return <><button type="button" ref={trigger} className="number-field" aria-label={tr(`编辑${L(label)}`,`Edit ${L(label)}`)} disabled={readOnly} onPointerDown={(e)=>e.stopPropagation()} onClick={()=>setOpen(true)}>{value===''?'—':shownText(value)}</button>
    {open&&<NumberPad label={label} value={value} onCancel={close} onCommit={(v)=>{onChange(String(v));close()}}
      onNext={next()?(v)=>{const to=next();onChange(String(v));setOpen(false);requestAnimationFrame(()=>to?.click())}:null}/>}</>
}
