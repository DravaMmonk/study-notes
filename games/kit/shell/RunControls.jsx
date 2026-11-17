import RunDock from './RunDock.jsx'

import { tr } from './i18n.js'


const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
/** The number keypad a screen puts in the run bar's place while a cell is typed into. extra: { key, label }. */
export function Keypad({ title, value, extra, onKey }) {
  const key = (k, cls, label = k, aria) => <button key={k} className={`key ${cls ?? ''}`} type="button" aria-label={aria} onClick={() => onKey(k)}>{label}</button>
  return (
    <div className="pad">
      <div className="pad-top"><span><b>{title}</b></span><div className="pad-val" aria-live="polite">{value || '_'}</div></div>
      <div className="keys">
        {DIGITS.map((k) => key(k))}
        {key('del', 'wide', tr('删除', 'Delete'))}
        {key('close', '', tr('收起', 'Hide'), tr('收起键盘', 'Hide keypad'))}
        {key('ok', 'wide ok', tr('确定', 'OK'))}
        {extra && key(extra.key, 'full', extra.label)}
      </div>
    </div>
  )
}

/** The run bar's own pictures: a check (检查, 检验) and a double arrow (剪到够). */
export const CheckIcon = () => <i className="run-icon"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></i>
export const SkipIcon = () => <i className="run-icon"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 5v14l9-7zM13 5v14l9-7z" fill="currentColor" /></svg></i>

/** The run bar (the kit's RunDock), or the keypad while a number is typed: pad = { title, value, extra?, onKey }. */
export function Dock({ pad, ...dock }) {
  return <div className="dock">{pad ? <Keypad {...pad} /> : <RunDock {...dock} />}</div>
}
