// Trays describe presentation: ordered parts and optional menus for related parts.
import { S } from 'kernel'


import { partStages } from "./part-stages.js"

export const trayMembers = (tray) => (tray?.items ?? []).flatMap((entry) => typeof entry === 'string' ? [entry] : entry.items)

/** The named circuit trays that may be opened in the workshop, in course order. */
export function workshopTrayNames(trays = {}, parts = {}) {
  const stages = partStages(parts)
  return Object.entries(trays)
    .filter(([, tray]) => tray.workshop !== false && trayMembers(tray).some((type) => stages.has(type)))
    .map(([name]) => name)
}

/** How many parts of one menu a level must show before they gather into that menu: a tray's `menuThreshold`, else this. */
export const MENU_THRESHOLD = 3

/**
 * Project available parts onto the selected trays, leaving availability to the course. A menu gathers its parts only
 * where enough of them stand together: among the parts the level shows, a menu opens when at least its tray's
 * `menuThreshold` (3 by default) of them are there, else they stand on their own; the same holds among the folded ones.
 */
export function trayDisplay(trays, names, shown, folded, partOf = id => id) {
  const first = new Set(shown.map(({ type }) => type))
  const remaining = new Map([...shown, ...folded].map((item) => [item.type, item]))
  const menus = names.flatMap((name) => (trays[name]?.items ?? [])
    .filter((entry) => typeof entry !== 'string').map((entry) => ({ ...entry, items: entry.items.map(partOf), key: JSON.stringify([name, entry.id]), at: trays[name]?.menuThreshold ?? MENU_THRESHOLD })))
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
    // Where the level shows enough of the menu's parts, the menu holds them all, folded ones too; else the parts
    // shown stand on their own, and the folded ones form the menu only if there are enough of them.
    const visible = children.filter(({ type }) => first.has(type))
    if (visible.length >= menu.at) {
      add({ menu: menu.key, label: menu.title, children }, true)
      continue
    }
    for (const child of visible) add(child, true)
    const hidden = children.filter(({ type }) => !first.has(type))
    if (hidden.length >= menu.at) add({ menu: menu.key, label: menu.title, children: hidden }, false)
    else for (const child of hidden) add(child, false)
  }
  return { items, folded: more }
}

/** A task names a declared tray; membership is resolved by the content assembler. */
export const TRAY = S.opt(S.name('circuit/tray'))

/** The names of the parts a game's levels build, for its trays (domain.js names; the vocabulary's go by reference). */
export const partNames = (built = []) => ({ 'circuit/part': new Set(built) })

/** The tray a level or task plays with: the one it names, else a game's only tray; null in a game of several. */
export const trayIn = (trays = {}, named) => named ?? (Object.keys(trays).length === 1 ? Object.keys(trays)[0] : null)
