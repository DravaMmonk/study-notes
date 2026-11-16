// A data game selects a content package in games/<id>/game.json and holds its own course, games/<id>/course.json: the
// package is the levels, their level groups (groups/<id>.json, ./groups.js) and what they are built from; the course
// arranges them into chapters. A game may also put its own wording over the package's texts without changing them
// (games/<id>/overrides/<lang>.json, keyed as the package's catalog). A game made by the agent pipeline also holds its
// course blueprint, blueprint.json (../pipeline/blueprint.js), which the checks read and the page does not. The page's
// build (../app/vite.js) and the checks (content-node.js) both read the files and assemble them here into one content:
//
//   { id, …configuration, eras (the chapters as played, groups expanded), sourceEras (as course.json writes them),
//     levels: [{ id, …levels/<id>.json }], groups: { id: groups/<id>.json }, glossary, partDefs? (pieces.json),
//     blueprint?, overridden: { key: { lang: the package's text } | null } }
import { expandEras } from './groups.js'
import { textEntries, textKey, withTextKey } from './i18n.js'

const sourceContents = new WeakSet()
export const hasCatalogSource = (content) => sourceContents.has(content)

const gameFields = new Set(['title', 'kicker', 'lede'])
const courseFields = new Set(['eras', 'order', 'mode', 'open', 'primitives', 'concept', 'replaces', 'local', 'views', 'borrow', 'words'])

/** The owner of a field in the assembled game configuration. */
export function contentFileFor([field]) {
  if (field === 'trays') return 'trays.json'
  if (courseFields.has(field)) return 'course.json'
  if (field === undefined || gameFields.has(field)) return 'game.json'
  return 'package.json'
}

/** Split the configuration into editable files; a tray file contains the tray map itself. */
export function configurationFiles({ trays, ...configuration }) {
  const files = { 'game.json': {}, 'package.json': {}, 'course.json': {} }
  for (const [field, value] of Object.entries(configuration)) files[contentFileFor([field])][field] = value
  if (trays !== undefined) files['trays.json'] = trays
  return files
}

export function combineConfiguration(files) {
  const configuration = {}
  for (const [file, value] of Object.entries(files)) {
    if (file === 'trays.json' && value === undefined) continue
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${file}: expected a JSON object`)
    if (file === 'trays.json') configuration.trays = value
    else for (const [field, data] of Object.entries(value)) {
      if (contentFileFor([field]) !== file) throw new Error(`${file}: ${field} belongs in ${contentFileFor([field])}`)
      configuration[field] = data
    }
  }
  return configuration
}

/** The packaged levels can include content the selected course does not schedule. */
export const courseLevelCount = (configuration, total, groups = {}) => configuration.eras
  ? expandEras(configuration.eras, groups).reduce((count, era) => count + era.levels.length, 0)
  : configuration.order?.length ?? total

/** What each of a game's own texts stands over: key → { lang: the package's text (undefined: the package lacks that language) }, or null for a key the package has no text under. */
export function overridesOf(catalogs, overrides) {
  const out = {}
  for (const [lang, entries] of Object.entries(overrides)) for (const key of Object.keys(entries)) {
    const known = Object.values(catalogs).some((catalog) => Object.hasOwn(catalog ?? {}, key))
    if (!known) out[key] = null
    else (out[key] ??= {})[lang] = catalogs[lang]?.[key]
  }
  return out
}

/** A value with the game's own texts (lang → key → text) in place of its package's. */
export function overlayTexts(value, overrides) {
  if (!value || typeof value !== 'object') return value
  const key = textKey(value)
  if (key) {
    const own = Object.entries(overrides).filter(([, entries]) => Object.hasOwn(entries, key))
    return own.length ? withTextKey({ ...Object.fromEntries(textEntries(value)), ...Object.fromEntries(own.map(([lang, entries]) => [lang, entries[key]])) }, key) : value
  }
  if (Array.isArray(value)) return value.map((child) => overlayTexts(child, overrides))
  return Object.fromEntries(Object.entries(value).map(([k, child]) => [k, overlayTexts(child, overrides)]))
}

/** One content from a game's files. `levels`, `groups`: [[id, value]] in any order (they are kept sorted by id). */
export function assemble({ id, game, levels, groups = [], glossary, partDefs, blueprint, overridden = {}, fromDisk = false }) {
  const byId = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)
  const groupMap = Object.fromEntries([...groups].sort(byId))
  const played = game.eras ? { eras: expandEras(game.eras, groupMap), sourceEras: game.eras } : {}
  const content = {
    id, ...game, ...played, levels: [...levels].sort(byId).map(([levelId, level]) => ({ id: levelId, ...level })), groups: groupMap, glossary,
    ...(partDefs ? { partDefs } : {}), ...(blueprint ? { blueprint } : {}), overridden,
  }
  if (fromDisk) sourceContents.add(content)
  return content
}

/** The content frozen all the way down, so nothing that reads it can write into it (the checks and the dev page read
 *  it so: a domain's course read makes what it derives, never writes it onto the content). */
export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}
