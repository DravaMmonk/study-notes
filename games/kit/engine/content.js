// A data game combines its course (games/<id>/game.json) with the levels, glossary and pieces in its content
// package. A game made by the agent pipeline also holds its
// course blueprint, blueprint.json (../pipeline/blueprint.js), which the checks read and the page does not. The page's
// build (../app/vite.js) and the checks (content-node.js) both read the files and assemble them here into one content:
//
//   { id, domain, vocabulary, …game.json, levels: [{ id, …levels/<id>.json }], glossary, partDefs? (pieces.json), blueprint? }

const sourceContents = new WeakSet()
export const hasCatalogSource = (content) => sourceContents.has(content)

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
