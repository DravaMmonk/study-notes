// The packages a game plays (games/DESIGN.md 2, 6.7): chosen in the arrange workspace by the kernel's
// `game.package.add` and `game.package.remove`. A package goes in after what it uses, so adding one adds the
// dependencies the game lacks first, each once, deepest first.

/** The packages `id` needs that `used` lacks, deepest first (`packages`: [{ id, uses }]). */
export function missingDependencies(packages, used, id) {
  const usesOf = new Map(packages.map((p) => [p.id, p.uses ?? []]))
  const out = []
  const seen = new Set()
  const visit = (name) => {
    if (seen.has(name)) return
    seen.add(name)
    for (const dep of usesOf.get(name) ?? []) visit(dep)
    if (name !== id && !used.includes(name)) out.push(name)
  }
  visit(id)
  return out
}

/** The operations that add `id` to the game, with the dependencies it lacks before it. */
export const packageAddOps = (packages, used, id) => [...missingDependencies(packages, used, id), id].map((name) => ({ op: 'game.package.add', package: name }))

/** The operation that takes `id` out of the game (the kernel refuses while the course or a package still uses it). */
export const packageRemoveOps = (id) => [{ op: 'game.package.remove', package: id }]
