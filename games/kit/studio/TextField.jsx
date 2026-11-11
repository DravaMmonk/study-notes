// A text pair as an author writes it: Chinese and English side by side, each growing with what it holds. A link
// (<level-ref>, <part-ref>, <wiki-ref>, ../shell/refs.js) shows as a chip with the name it will show in the game, and
// is put in from a picker that searches the game's levels, parts and entries, never typed as a tag: opened by 🔗, by
// Ctrl/⌘+L (a selection becomes the search and is replaced by the link) or by typing [[ (【【 from a Chinese keyboard);
// the links the other language has and this one lacks come first. The copy rules a machine can see
// (../engine/text.js, ../pipeline/lint.js) are checked as it is typed, beside it.
//
//   <TextField value field onSet names compact? />   onSet({ zh } | { en }): the side typed into; compact: the findings
//                                                    a count on the text, listed while it is being edited
//   names: { level: Map(id → { label, title }), part: Map(key → name), wiki: Map(id → title), quotes, onLevel(id) }
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link2 } from 'lucide-react'
import { tr } from '../shell/i18n.js'
import { REF, refProblems } from '../engine/text.js'
import { lintText } from '../pipeline/lint.js'
import { OptionList } from './Picker.jsx'
import { MOD } from './Shortcuts.jsx'

const HAS_REF = /<(level|part|wiki)-ref to="[^"]+"><\/\1-ref>/
const tag = (kind, to) => `<${kind}-ref to="${to}"></${kind}-ref>`
const TRIGGERS = ['[[', '【【']
const pairOf = (value) => (typeof value === 'string' ? { zh: value } : value ?? { zh: '' })

/** What a chip says: a level's number and title, a part's name, an entry's title (in the side's language). */
function chipText(names, kind, id, lang) {
  const pick = (v) => (v && typeof v === 'object' ? v[lang] ?? v.zh : v)
  if (kind === 'level') {
    const l = names?.level.get(id)
    return l ? `${l.label} ${pick(l.title) ?? ''}`.trim() : null
  }
  const name = names?.[kind].get(id)
  return name ? pick(name) : null
}

/* ---------- a side as DOM: text nodes and chips; and back ---------- */

function chip(kind, id, names, lang) {
  const span = document.createElement('span')
  const text = chipText(names, kind, id, lang)
  span.className = `ref-chip is-${kind} ${text ? '' : 'is-missing'}`
  span.contentEditable = 'false'
  span.dataset.ref = kind
  span.dataset.to = id
  span.textContent = text ?? id
  return span
}

function draw(el, value, names, lang) {
  el.textContent = ''
  let at = 0
  for (const m of value.matchAll(REF)) {
    if (m.index > at) el.append(value.slice(at, m.index))
    el.append(chip(m[1], m[2], names, lang))
    at = m.index + m[0].length
  }
  if (at < value.length) el.append(value.slice(at))
}

/** The text a node stands for: text as it is, a chip as its tag, a line break as \n. */
function textOf(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/​/g, '')
  if (node.dataset?.ref) return tag(node.dataset.ref, node.dataset.to)
  if (node.nodeName === 'BR') return '\n'
  const inner = [...node.childNodes].map(textOf).join('')
  return ['DIV', 'P'].includes(node.nodeName) && node.previousSibling ? `\n${inner}` : inner
}
const serialize = (el) => [...el.childNodes].map(textOf).join('')

/** Where a point (container, offset) is, counted in the text the side stands for. */
function offsetOf(el, container, offset) {
  const range = document.createRange()
  range.selectNodeContents(el)
  range.setEnd(container, offset)
  const box = document.createElement('div')
  box.append(range.cloneContents())
  return serialize(box).length
}

/** The selection in a side as [start, end], counted as offsetOf counts; null when it is elsewhere. */
function spanOf(el) {
  const sel = window.getSelection()
  if (!sel.rangeCount || !el.contains(sel.anchorNode)) return null
  const r = sel.getRangeAt(0)
  return [offsetOf(el, r.startContainer, r.startOffset), offsetOf(el, r.endContainer, r.endOffset)]
}

/** A range's start or end put at `n`, counted as offsetOf counts (never inside a chip). */
function setPoint(el, range, n, end) {
  let left = n
  for (const node of el.childNodes) {
    const size = textOf(node).length
    if (left <= size) {
      if (node.nodeType === Node.TEXT_NODE) end ? range.setEnd(node, left) : range.setStart(node, left)
      else if (left === 0) end ? range.setEndBefore(node) : range.setStartBefore(node)
      else end ? range.setEndAfter(node) : range.setStartAfter(node)
      return
    }
    left -= size
  }
  end ? range.setEnd(el, el.childNodes.length) : range.setStart(el, el.childNodes.length)
}

/** The selection put back at [start, end]. */
function placeSpan(el, start, end = start) {
  const range = document.createRange()
  setPoint(el, range, start, false)
  setPoint(el, range, end, true)
  select(range)
}
const select = (range) => {
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
}

/**
 * One side: editable text with chips. `api` gets insert(kind, id), to put a link over the selection it last had, and
 * focus(), to go back to it; onLink(query) asks for the link picker.
 */
function Side({ value, onChange, names, lang, label, api, onFocus, onLink }) {
  const el = useRef(null)
  const composing = useRef(false)
  const saved = useRef(null) // the selection when the side last lost focus
  const keep = () => { saved.current = spanOf(el.current) ?? saved.current }
  // Drawn again only when the text is not what the side shows already (typing never redraws it under the caret).
  useLayoutEffect(() => {
    const stamp = String(names?.stamp)
    if (el.current.dataset.names === stamp && serialize(el.current) === value) return
    // Drawn again under the caret (a title typed renames its chips): the selection stays where it was.
    const span = document.activeElement === el.current ? spanOf(el.current) : null
    draw(el.current, value, names, lang)
    if (span) placeSpan(el.current, ...span)
    el.current.dataset.names = stamp
  }, [value, names, lang])

  const changed = () => {
    if (composing.current) return
    let text = serialize(el.current)
    const caret = spanOf(el.current)?.[1] ?? null
    // [[ just typed asks for a link there, and goes.
    const trigger = caret !== null && TRIGGERS.includes(text.slice(caret - 2, caret))
    if (trigger) text = text.slice(0, caret - 2) + text.slice(caret)
    // A tag typed or pasted as text becomes its chip.
    if (trigger || [...el.current.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && HAS_REF.test(n.nodeValue))) {
      draw(el.current, text, names, lang)
      if (caret !== null) placeSpan(el.current, trigger ? caret - 2 : caret)
      text = serialize(el.current)
    }
    onChange(text)
    if (trigger) {
      keep()
      onLink('')
    }
  }
  api.current = {
    insert(kind, id) {
      api.current.focus()
      const range = window.getSelection().getRangeAt(0)
      const c = chip(kind, id, names, lang)
      range.deleteContents()
      range.insertNode(c)
      range.setStartAfter(c)
      range.collapse(true)
      select(range)
      changed()
      keep()
    },
    focus() {
      const node = el.current
      node.focus()
      const end = serialize(node).length
      placeSpan(node, ...(saved.current ?? [end, end]))
    },
  }
  return (
    <div
      ref={el} className="rich" lang={lang} role="textbox" aria-multiline="true" aria-label={label} contentEditable suppressContentEditableWarning spellCheck
      onInput={changed}
      onCompositionStart={() => { composing.current = true }}
      onCompositionEnd={() => { composing.current = false; changed() }}
      onFocus={onFocus}
      onBlur={keep}
      onKeyUp={keep}
      onMouseUp={keep}
      onPaste={(e) => {
        e.preventDefault()
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          document.execCommand('insertLineBreak')
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
          e.preventDefault()
          keep()
          const picked = window.getSelection().getRangeAt(0).cloneContents()
          onLink(picked.querySelector('[data-ref]') ? '' : picked.textContent.trim())
        }
      }}
      onClick={(e) => {
        const ref = e.target.closest?.('.ref-chip')
        if (ref && ref.dataset.ref === 'level' && (e.metaKey || e.ctrlKey)) names?.onLevel?.(ref.dataset.to)
      }}
    />
  )
}

/** The findings on a text: links that resolve, the copy rules for its field. */
export function textFindings(pair, field, names) {
  if (!names) return []
  const zhNames = {
    level: new Map([...names.level].map(([id, l]) => [id, String(l.title?.zh ?? l.title ?? '')])),
    part: new Map([...names.part].map(([k, n]) => [k, String(n?.zh ?? n ?? '')])),
    wiki: new Map([...names.wiki].map(([k, n]) => [k, String(n?.zh ?? n ?? '')])),
  }
  const found = [
    ...refProblems(pair, '', zhNames, names.quotes ?? []).map((s) => s.trim()),
    ...lintText(field, pair).map((f) => `${f.rule}: ${f.says}`),
  ]
  return [...new Set(found)]
}

export function TextField({ value, onSet, label, field = '', names, findings = [], compact = false }) {
  const pair = pairOf(value)
  // Typed text kept here while the operation it makes is on its way back.
  const [draft, setDraft] = useState(pair)
  const typing = useRef(0)
  const key = JSON.stringify(pair)
  useEffect(() => {
    if (Date.now() - typing.current > 1500) setDraft(JSON.parse(key))
  }, [key])
  const box = useRef(null)
  const [linking, setLinking] = useState(null) // the picker's first search while it is open
  const set = useCallback((text) => {
    typing.current = Date.now()
    setDraft({ zh: text })
    onSet({ zh: text })
  }, [onSet])
  const options = useMemo(() => (names ? [
    ...[...names.level].map(([id, l]) => ({ value: `level:${id}`, label: l.label, title: l.title, group: tr('关卡', 'Levels') })),
    ...[...names.part].map(([k, n]) => ({ value: `part:${k}`, label: k, title: n, group: tr('元件', 'Parts') })),
    ...[...names.wiki].map(([k, n]) => ({ value: `wiki:${k}`, label: k, title: n, group: tr('百科', 'Encyclopedia') })),
  ] : []), [names])
  const close = () => { setLinking(null); box.current?.focus() }
  const all = [...new Set([...textFindings(draft, field, names), ...findings])]
  return (
    <div className={`field-text ${all.length ? 'has-findings' : ''} ${compact ? 'is-compact' : ''}`}>
      <div className="text-sides">
        <Side value={draft.zh ?? ''} onChange={set} names={names} lang="zh" label={label} api={box} onLink={setLinking} />
      </div>
      {names && (
        <div className="text-tools">
          <button type="button" className="text-link" onPointerDown={(e) => e.preventDefault()} onClick={() => setLinking(linking === null ? '' : null)} aria-label={tr('插入链接', 'Insert a link')} title={tr(`插入链接（${MOD}+L 或 [[）`, `Insert a link (${MOD}+L or [[)`)}><Link2 size={13} aria-hidden="true" /></button>
          {linking !== null && (
            <OptionList
              options={options} value={null} query={linking} onClose={close}
              onPick={(v) => {
                setLinking(null)
                const [kind, ...id] = v.split(':')
                box.current?.insert(kind, id.join(':'))
              }}
            />
          )}
        </div>
      )}
      {compact && all.length > 0 && <i className="text-mark" title={all.join('\n')}>{all.length}</i>}
      {all.length > 0 && <ul className="field-findings">{all.map((f) => <li key={f}>{f}</li>)}</ul>}
    </div>
  )
}
