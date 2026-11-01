import { Fragment } from 'react'
import { L, isPair } from '../i18n.js'

// Text a bench model computes: a string, a { zh, en } pair, or a list of pieces, where a piece may also be
// { b } (a number that matters), { muted }, { sub } (a subscript) or { off, text } (struck through while `off`).
export function Rich({ text }) {
  if (text === null || text === undefined || text === false) return null
  if (typeof text === 'string' || typeof text === 'number') return text
  if (isPair(text)) return L(text)
  if (Array.isArray(text)) return text.map((piece, i) => <Fragment key={i}><Rich text={piece} /></Fragment>)
  if ('b' in text) return <b><Rich text={text.b} /></b>
  if ('muted' in text) return <span className="bench-muted"><Rich text={text.muted} /></span>
  if ('sub' in text) return <sub><Rich text={text.sub} /></sub>
  if ('off' in text) return <span className={text.off ? 'is-off' : ''}><Rich text={text.text} /></span>
  return null
}
