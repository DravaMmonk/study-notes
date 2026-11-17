import { createElement, Fragment } from 'react'
import { L, isPair } from 'kernel/view'
import { refParts } from 'kernel/view'

// Text a bench model computes: a string, a { zh, en } pair, or a list of parts, where a part may also be
// { b } (a number that matters), { muted }, { sub } (a subscript) or { off, text } (struck through while `off`).
export function Rich({ text }) {
  if (text === null || text === undefined || text === false) return null
  if (isPair(text)) return <Rich text={L(text)} />
  if (typeof text === 'number') return text
  if (typeof text === 'string') return refParts(text).map((part, i) => typeof part === 'string' ? <Fragment key={i}>{part}</Fragment> : createElement(`${part.kind}-ref`, { key: i, to: part.ref }))
  if (Array.isArray(text)) return text.map((part, i) => <Fragment key={i}><Rich text={part} /></Fragment>)
  if ('b' in text) return <b><Rich text={text.b} /></b>
  if ('muted' in text) return <span className="bench-muted"><Rich text={text.muted} /></span>
  if ('sub' in text) return <sub><Rich text={text.sub} /></sub>
  if ('off' in text) return <span className={text.off ? 'is-off' : ''}><Rich text={text.text} /></span>
  return null
}
