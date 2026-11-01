// A data game's content (games/DESIGN.md 6.1): its folder games/<id>/ holds game.json, one file a level in levels/
// (named by the level's id) and glossary.json, and nothing that runs. The page's build (../app/vite.js) and the checks
// (content-node.js) both read the files and assemble them here into one content:
//
//   { id, domain, vocabulary, …game.json, levels: [{ id, …levels/<id>.json }], glossary }

/** One content from a game's files. `levels`: [[id, level]] in any order (they are kept sorted by id). */
export function assemble({ id, game, levels, glossary }) {
  const sorted = [...levels].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return { id, ...game, levels: sorted.map(([levelId, level]) => ({ id: levelId, ...level })), glossary }
}
