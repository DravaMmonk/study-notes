import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { L, tr } from './i18n.js'
import { numberKey, numberValue } from './number-entry.js'

function NumberPad({ label, value, onCancel, onCommit }) {
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
      <footer><button type="button" onClick={onCancel}>{tr('取消','Cancel')}</button><button type="button" disabled={parsed===null} onClick={()=>onCommit(parsed)}>{tr('完成','Done')}</button></footer>
    </section>
  </div>,document.body)
}

/** Native desktop editing, explicit touch keypad on phones; neither path changes read-only inspection. */
export default function NumberField({ label, value, onChange, phone, readOnly, min, max, step = 'any' }) {
  const [open,setOpen] = useState(false)
  const trigger = useRef(null)
  const close=()=>{setOpen(false);trigger.current?.focus()}
  if(!phone)return <input aria-label={L(label)} type="number" step={step} min={min} max={max} value={value} readOnly={readOnly} onPointerDown={(e)=>e.stopPropagation()} onChange={(e)=>onChange(e.target.value)}/>
  return <><button type="button" ref={trigger} className="number-field" aria-label={tr(`编辑${L(label)}`,`Edit ${L(label)}`)} disabled={readOnly} onPointerDown={(e)=>e.stopPropagation()} onClick={()=>setOpen(true)}>{value===''?'—':value}</button>
    {open&&<NumberPad label={label} value={value} onCancel={close} onCommit={(v)=>{onChange(String(v));close()}}/>}</>
}
