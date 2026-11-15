// A data game selects a content package and one of its courses in games/<id>/game.json. A game made by the agent pipeline also holds its
// course blueprint, blueprint.json (../pipeline/blueprint.js), which the checks read and the page does not. The page's
// build (../app/vite.js) and the checks (content-node.js) both read the files and assemble them here into one content:
//
//   { id, …configuration, levels: [{ id, …levels/<id>.json }], glossary, partDefs? (pieces.json), blueprint? }

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
export const courseLevelCount = (configuration, total) => configuration.eras
  ? configuration.eras.reduce((count, era) => count + era.levels.length, 0)
  : configuration.order?.length ?? total

/** One content from a game's files. `levels`: [[id, level]] in any order (they are kept sorted by id). */
export function assemble({ id, game, levels, glossary, partDefs, blueprint, fromDisk = false }) {
  const sorted = [...levels].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const content = { id, ...game, levels: sorted.map(([levelId, level]) => ({ id: levelId, ...level })), glossary, ...(partDefs ? { partDefs } : {}), ...(blueprint ? { blueprint } : {}) }
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
