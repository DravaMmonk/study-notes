// The command palette's index (Ctrl/⌘+K in the studio): every place to go and every action, as items to search —
// the levels (id, number on the map, both titles), the eras, the fields of the level being edited, the encyclopedia's
// entries, the check's findings, the fields edited lately and the studio's actions. Typed words rank them: a match at
// the start of the label first, then anywhere in it, then a match of the letters in order; `>` searches the actions
// only, `@` the fields of the level being edited. Pure: the page turns an item into what it does.
//
//   an item: { kind, key (unique), label, detail?, words (what else it is found by), …what it points at }

const plain = (v) => (v && typeof v === 'object' ? `${v.zh ?? ''} ${v.en ?? ''}` : String(v ?? ''))
const one = (v, lang) => (v && typeof v === 'object' ? v[lang] ?? v.zh ?? v.en ?? '' : String(v ?? ''))

/**
 * Every item, in the order shown before anything is typed: recent fields, actions, levels in play order, eras,
 * fields, entries, findings. Arguments: content (the game), labels ([{ id, label }]: the levels' numbers on the map,
 * in play order), level (the id being edited) and fields ([path text]: its fields), items (the worklist), recent
 * ([{ level, path }] newest first), actions ([{ id, label, keys? }]), lang (the side titles show in).
 */
export function paletteIndex({ content, labels = [], level = null, fields = [], items = [], recent = [], actions = [], lang = 'zh' }) {
  const out = []
  const byId = new Map(content.levels.map((l) => [l.id, l]))
  const label = new Map(labels.map((l) => [l.id, l.label]))
  const order = labels.length ? labels.map((l) => l.id).filter((id) => byId.has(id)) : content.levels.map((l) => l.id)
  for (const r of recent) out.push({ kind: 'recent', key: `recent ${r.level ?? ''} ${r.path}`, label: r.path || r.level, detail: r.level ?? 'game.json', words: `${r.level ?? ''} ${r.path}`, level: r.level, path: r.path })
  for (const a of actions) out.push({ kind: 'action', key: `action ${a.id}`, label: a.label, detail: a.keys ?? '', words: `${a.id} ${a.words ?? ''}`, action: a.id })
  for (const id of order) {
    const l = byId.get(id)
    out.push({ kind: 'level', key: `level ${id}`, label: `${label.get(id) ?? id} ${one(l.title, lang)}`.trim(), detail: id, words: `${id} ${plain(l.title)}`, level: id })
  }
  ;(content.eras ?? []).forEach((era, e) => out.push({ kind: 'era', key: `era ${e}`, label: `${era.id} ${one(era.title ?? era.chapter?.title, lang)}`.trim(), detail: '', words: plain(era.title ?? era.chapter?.title), era: e }))
  for (const path of fields) out.push({ kind: 'field', key: `field ${path}`, label: path, detail: level, words: path, level, path })
  for (const entry of content.glossary?.entries ?? []) out.push({ kind: 'entry', key: `entry ${entry.id}`, label: one(entry.title, lang), detail: entry.id, words: `${entry.id} ${plain(entry.title)}`, entry: entry.id })
  items.filter((it) => it.severity !== 'pass').forEach((it, k) => out.push({ kind: 'finding', key: `finding ${k}`, label: it.text, detail: it.rule, words: `${it.rule} ${it.levels.join(' ')}`, finding: it }))
  return out
}

/** How well `query` (lowercase) matches `text`: 0 for no match; the start of the text best, then a word start, then anywhere, then letters in order. */
export function scoreOf(text, query) {
  const t = text.toLowerCase()
  if (!query) return 1
  const at = t.indexOf(query)
  if (at === 0) return 1000 - t.length / 100
  if (at > 0) return (/[\s\-_.·[]/.test(t[at - 1]) ? 800 : 600) - at
  let k = 0
  let gaps = 0
  let last = -1
  for (let i = 0; i < t.length && k < query.length; i += 1) {
    if (t[i] === query[k]) {
      if (last >= 0) gaps += i - last - 1
      last = i
      k += 1
    }
  }
  return k === query.length ? Math.max(1, 300 - gaps * 4) : 0
}

/** The items matching `typed`, best first (ties keep the index's order); `>` only actions, `@` only fields. */
export function rankPalette(items, typed) {
  const mode = typed.startsWith('>') ? 'action' : typed.startsWith('@') ? 'field' : null
  const q = (mode ? typed.slice(1) : typed).trim().toLowerCase()
  const pool = mode ? items.filter((it) => it.kind === mode) : items
  if (!q) return pool
  return pool
    .map((it, k) => [it, Math.max(scoreOf(it.label, q), scoreOf(it.words ?? '', q) * 0.9, scoreOf(it.detail ?? '', q) * 0.8), k])
    .filter(([, s]) => s > 0)
    .sort(([, a, i], [, b, j]) => b - a || i - j)
    .map(([it]) => it)
}
