import { grantIndex } from './grants.js'

/** Omitted trays mean all parts, even when the package happens to declare only one tray. */
export function standaloneItems(content, at) {
  const level = content.levels.find(({ id }) => id === at.id)
  const named = level?.tasks?.[at.task]?.tray ?? level?.tray
  if (!named) return [...grantIndex(content.registries).keys()]
  return [...new Set([named].flat().flatMap(name => (content.trays[name]?.items ?? [])
    .flatMap(item => typeof item === 'string' ? [item] : item.items)))]
}

export const standaloneParts = (content, at) => [...new Set(standaloneItems(content, at).map(item => grantIndex(content.registries).get(item)?.part ?? item))]
