// Trays describe presentation: ordered pieces and optional menus for related pieces.
import { S } from './schema.js'
import { pieceStages } from './piece-stages.js'
import { editorOf } from './pieces.js'

export const trayMembers = (tray) => (tray?.items ?? []).flatMap((entry) => typeof entry === 'string' ? [entry] : entry.items)

/** The named circuit trays that may be opened in the workshop, in course order. */
export function workshopTrayNames(trays = {}, pieces = {}) {
  const stages = pieceStages(pieces)
  return Object.entries(trays)
    .filter(([, tray]) => tray.workshop !== false && trayMembers(tray).some((type) => stages.has(type) && editorOf(pieces[stages.get(type).piece]) === 'circuit'))
    .map(([name]) => name)
}

/** Project available pieces onto the selected trays, leaving availability to the course. */
export function trayDisplay(trays, names, shown, folded, pieceOf = id => id) {
  const first = new Set(shown.map(({ type }) => type))
  const remaining = new Map([...shown, ...folded].map((item) => [item.type, item]))
  const menus = names.flatMap((name) => (trays[name]?.items ?? [])
    .filter((entry) => typeof entry !== 'string').map((entry) => ({ ...entry, items: entry.items.map(pieceOf), key: JSON.stringify([name, entry.id]) })))
  const items = [], more = []
  const add = (item, visible) => (visible ? items : more).push(item)
  const done = new Set()
  const menuOf = new Map()
  for (const menu of menus) {
    for (const type of menu.items) if (!menuOf.has(type)) menuOf.set(type, menu)
  }
  for (const item of remaining.values()) {
    const menu = menuOf.get(item.type)
    if (!menu) {
      add(item, first.has(item.type))
      continue
    }
    if (done.has(menu.key)) continue
    done.add(menu.key)
    const children = [...new Set(menu.items)].flatMap((type) => menuOf.get(type) === menu && remaining.has(type) ? [remaining.get(type)] : [])
    add({ menu: menu.key, label: menu.title, children }, children.some(({ type }) => first.has(type)))
  }
  return { items, folded: more }
}

/** A task names a declared tray; membership is resolved by the content assembler. */
export const TRAY = S.opt(S.name('tray'))

/** The names of the parts a game's levels build, for its trays (domain.js names; the vocabulary's go by reference). */
export const partNames = (built = []) => ({ part: new Set(built) })

/** The tray a level or task plays with: the one it names, else a game's only tray; null in a game of several. */
export const trayIn = (trays = {}, named) => named ?? (Object.keys(trays).length === 1 ? Object.keys(trays)[0] : null)
