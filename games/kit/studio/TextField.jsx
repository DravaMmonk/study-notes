// A text pair as an author writes it: Chinese and English side by side, each growing with what it holds. A link
// (<level-ref>, <part-ref>, <wiki-ref>, ../shell/refs.js) shows as a chip with the name it will show in the game, and
// is put in from a picker that searches the game's levels, parts and entries, never typed as a tag. The copy rules a
// machine can see (../engine/text.js, ../pipeline/lint.js) are checked as it is typed, beside it.
//
//   <TextField value field onSet names />   onSet({ zh } | { en }): the side typed into
//   names: { level: Map(id → { label, title }), part: Map(key → name), wiki: Map(id → title), quotes, onLevel(id) }
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link2 } from 'lucide-react'
import { tr } from '../shell/i18n.js'
import { refProblems, untranslated } from '../engine/text.js'
import { lintText } from '../pipeline/lint.js'
import { OptionList } from './Picker.jsx'

const REF = /<(level|part|wiki)-ref to="([^"]+)"><\/\1-ref>/g
const HAS_REF = /<(level|part|wiki)-ref to="[^"]+"><\/\1-ref>/
const tag = (kind, to) => `<${kind}-ref to="${to}"></${kind}-ref>`
const pairOf = (value) => (typeof value === 'string' ? { zh: value, en: value } : value ?? { zh: '', en: '' })

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

/** Where the caret is, counted in the text the side stands for. */
function caretOf(el) {
  const sel = window.getSelection()
  if (!sel.rangeCount || !el.contains(sel.anchorNode)) return null
  const range = sel.getRangeAt(0).cloneRange()
  range.selectNodeContents(el)
  range.setEnd(sel.anchorNode, sel.anchorOffset)
  const box = document.createElement('div')
  box.append(range.cloneContents())
  return serialize(box).length
}

/** The caret put back at `n`, counted as caretOf counts (after a chip it would fall inside). */
function placeCaret(el, n) {
  let left = n
  const range = document.createRange()
  for (const node of el.childNodes) {
    const size = textOf(node).length
    if (node.nodeType === Node.TEXT_NODE && left <= size) {
      range.setStart(node, left)
      range.collapse(true)
      return select(range)
    }
    if (left <= size) {
      range.setStartAfter(node)
      range.collapse(true)
      return select(range)
    }
    left -= size
  }
  range.selectNodeContents(el)
  range.collapse(false)
  select(range)
}
const select = (range) => {
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
}

/** One side: editable text with chips. `api` gets insert(kind, id), to put a link where the caret was. */
function Side({ value, onChange, names, lang, label, api, onFocus }) {
  const el = useRef(null)
  const composing = useRef(false)
  const saved = useRef(null) // the caret when the side last lost focus
  // Drawn again only when the text is not what the side shows already (typing never redraws it under the caret).
  useLayoutEffect(() => {
    const stamp = String(names?.stamp)
    if (el.current.dataset.names === stamp && serialize(el.current) === value) return
    draw(el.current, value, names, lang)
    el.current.dataset.names = stamp
  }, [value, names, lang])

  const changed = () => {
    if (composing.current) return
    let text = serialize(el.current)
    // A tag typed or pasted as text becomes its chip.
    if ([...el.current.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && HAS_REF.test(n.nodeValue))) {
      const caret = caretOf(el.current)
      draw(el.current, text, names, lang)
      if (caret !== null) placeCaret(el.current, caret)
      text = serialize(el.current)
    }
    onChange(text)
  }
  api.current = {
    insert(kind, id) {
      const node = el.current
      node.focus()
      if (saved.current !== null) placeCaret(node, saved.current)
      else placeCaret(node, serialize(node).length)
      const sel = window.getSelection()
      const range = sel.getRangeAt(0)
      const c = chip(kind, id, names, lang)
      range.deleteContents()
      range.insertNode(c)
      range.setStartAfter(c)
      range.collapse(true)
      select(range)
      changed()
    },
  }
  return (
    <div
      ref={el} className="rich" lang={lang} role="textbox" aria-multiline="true" aria-label={label} contentEditable suppressContentEditableWarning spellCheck
      onInput={changed}
      onCompositionStart={() => { composing.current = true }}
      onCompositionEnd={() => { composing.current = false; changed() }}
      onFocus={onFocus}
      onBlur={() => { saved.current = caretOf(el.current) ?? saved.current }}
      onKeyUp={() => { saved.current = caretOf(el.current) }}
      onMouseUp={() => { saved.current = caretOf(el.current) }}
      onPaste={(e) => {
        e.preventDefault()
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          document.execCommand('insertLineBreak')
        }
      }}
      onClick={(e) => {
        const ref = e.target.closest?.('.ref-chip')
        if (ref && ref.dataset.ref === 'level' && (e.metaKey || e.ctrlKey)) names?.onLevel?.(ref.dataset.to)
      }}
    />
  )
}

// A finding about the whole text quotes the text after a colon; beside the text itself the quote says nothing.
const bare = (s) => s.replace(/^(has (?:different references in Chinese and English|no English|an empty English side|Chinese in its English side)): [\s\S]*$/, '$1')

/** The findings on a pair: both sides there, links that resolve and match, the copy rules for its field. */
export function textFindings(pair, field, names) {
  if (!names) return []
  const zhNames = {
    level: new Map([...names.level].map(([id, l]) => [id, String(l.title?.zh ?? l.title ?? '')])),
    part: new Map([...names.part].map(([k, n]) => [k, String(n?.zh ?? n ?? '')])),
    wiki: new Map([...names.wiki].map(([k, n]) => [k, String(n?.zh ?? n ?? '')])),
  }
  const found = [
    ...untranslated(pair, '').map((s) => s.trim()),
    ...refProblems(pair, '', zhNames, names.quotes ?? []).map((s) => s.trim()),
    ...lintText(field, pair).map((f) => `${f.rule}: ${f.says}`),
  ]
  return [...new Set(found)]
}

export function TextField({ value, onSet, label, field = '', names, findings = [] }) {
  const pair = pairOf(value)
  // Typed text kept here while the operation it makes is on its way back.
  const [draft, setDraft] = useState(pair)
  const typing = useRef(0)
  const key = JSON.stringify(pair)
  useEffect(() => {
    if (Date.now() - typing.current > 1500) setDraft(JSON.parse(key))
  }, [key])
  const sides = { zh: useRef(null), en: useRef(null) }
  const [side, setSide] = useState('zh')
  const [linking, setLinking] = useState(false)
  const set = useCallback((s) => (text) => {
    typing.current = Date.now()
    setDraft((d) => ({ ...d, [s]: text }))
    onSet({ [s]: text })
  }, [onSet])
  const options = useMemo(() => (names ? [
    ...[...names.level].map(([id, l]) => ({ value: `level:${id}`, label: l.label, title: l.title, group: tr('关卡', 'Levels') })),
    ...[...names.part].map(([k, n]) => ({ value: `part:${k}`, label: k, title: n, group: tr('元件', 'Parts') })),
    ...[...names.wiki].map(([k, n]) => ({ value: `wiki:${k}`, label: k, title: n, group: tr('百科', 'Encyclopedia') })),
  ] : []), [names])
  const all = [...new Set([...textFindings(draft, field, names), ...findings].map(bare))]
  return (
    <div className={`field-text ${all.length ? 'has-findings' : ''}`}>
      <div className="text-sides">
        <Side value={draft.zh ?? ''} onChange={set('zh')} names={names} lang="zh" label={`${label} 中文`} api={sides.zh} onFocus={() => setSide('zh')} />
        <Side value={draft.en ?? ''} onChange={set('en')} names={names} lang="en" label={`${label} English`} api={sides.en} onFocus={() => setSide('en')} />
      </div>
      {names && (
        <div className="text-tools">
          <button type="button" className="text-link" onPointerDown={(e) => e.preventDefault()} onClick={() => setLinking(!linking)} aria-label={tr('插入链接', 'Insert a link')} title={tr('插入链接', 'Insert a link')}><Link2 size={13} aria-hidden="true" /></button>
          {linking && (
            <OptionList
              options={options} value={null} onClose={() => setLinking(false)}
              onPick={(v) => {
                setLinking(false)
                const [kind, ...id] = v.split(':')
                sides[side].current?.insert(kind, id.join(':'))
              }}
            />
          )}
        </div>
      )}
      {all.length > 0 && <ul className="field-findings">{all.map((f) => <li key={f}>{f}</li>)}</ul>}
    </div>
  )
}
