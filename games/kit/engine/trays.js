// Trays describe presentation: ordered pieces and optional menus for related pieces.
import { S } from './schema.js'
import { editorOf } from './pieces.js'
import { T as t } from '../shell/i18n.js'

const ITEM = S.either(S.ref('part'), S.name('part'))
const MENU = S.obj({
  id: S.str({ pattern: '^[A-Za-z0-9][A-Za-z0-9_-]*$' }),
  title: S.text(),
  items: S.list(ITEM, { min: 1 }),
})
const ENTRY = S.either(...ITEM.of, MENU)

export const TRAYS = S.opt(S.map(S.obj({
  name: S.text(),
  desc: S.text(),
  workshop: S.opt(S.bool({ about: t('允许在元件工坊使用。省略时允许。', 'Allow use in the component workshop. Enabled when omitted.') })),
  items: S.list(ENTRY),
}), { section: 'course', about: t('托盘的名称、描述和按顺序展示的元件。', 'Tray names, descriptions, and ordered pieces.') }))

export const trayMembers = (tray) => (tray?.items ?? []).flatMap((entry) => typeof entry === 'string' ? [entry] : entry.items)

/** The named circuit trays that may be opened in the workshop, in course order. */
export function workshopTrayNames(trays = {}, pieces = {}) {
  return Object.entries(trays)
    .filter(([, tray]) => tray.workshop !== false && trayMembers(tray).some((type) => Object.hasOwn(pieces, type) && editorOf(pieces[type]) === 'circuit'))
    .map(([name]) => name)
}

/** Project available pieces onto the selected trays, leaving availability to the course. */
export function trayDisplay(trays, names, shown, folded) {
  const first = new Set(shown.map(({ type }) => type))
  const remaining = new Map([...shown, ...folded].map((item) => [item.type, item]))
  const menus = names.flatMap((name) => (trays[name]?.items ?? [])
    .filter((entry) => typeof entry !== 'string').map((entry) => ({ ...entry, key: JSON.stringify([name, entry.id]) })))
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

const SINGLE = S.opt(S.str({ section: 'course', about: t('这一关（这个任务）用的托盘；游戏只有一套托盘时不用写') }))

/** A single group or an ordered list of groups used by a level or task. */
export const TRAY = S.opt({
  ...S.either(SINGLE, S.list(S.str(), { min: 1 })),
  section: 'course',
  about: t('这一关或任务用的托盘，可按顺序选用多组', 'Tray or ordered list of trays used in this level or task'),
})

/** The names of the parts a game's levels build, for its trays (domain.js names; the vocabulary's go by reference). */
export const partNames = (built = []) => ({ part: new Set(built) })

/** The tray a level or task plays with: the one it names, else a game's only tray; null in a game of several. */
export const trayIn = (trays = {}, named) => named ?? (Object.keys(trays).length === 1 ? Object.keys(trays)[0] : null)
