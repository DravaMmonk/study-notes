import { Fragment, createElement } from 'react'
import { L } from './i18n.js'
import { markupOf } from '../engine/markup.js'

// A game's text as the shell draws it: its markup (../engine/markup.js) as elements, references as their link chips
// (refs.js), anything else as the characters it is. Nothing is ever set as HTML.

const draw = (nodes) => nodes.map((node, i) => {
  if (typeof node === 'string') return <Fragment key={i}>{node}</Fragment>
  if (node.ref) return createElement(`${node.ref}-ref`, { key: i, to: node.to })
  return createElement(node.tag, { key: i }, draw(node.kids))
})

/** Text (a string or a { zh, en } pair, in the reading language) with its markup drawn. */
export function Markup({ text }) {
  if (text === null || text === undefined) return null
  return draw(markupOf(String(L(text))).nodes)
}
