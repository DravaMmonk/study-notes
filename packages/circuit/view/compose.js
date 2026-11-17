import { taskModule } from 'kernel'

export function composeCircuitModules({ games, byModule }) {
  const unique = values => [...new Map(values.map(value => [value.key, value])).values()]
  const parts = unique(games.flatMap(game => game.parts?.all ?? []))
  const owner = part => games.find(game => game.parts?.all.some(value => value.key === part.key))
  const circuit = { forTask: task => byModule[taskModule(task)]?.circuit?.forTask(task) }
  const workReferences = (options) => byModule[taskModule(options.task)]?.workReferences?.(options) ?? []
  const defined = {
    of: type => games.map(game => game.defined?.of(type)).find(Boolean) ?? null,
    defaults: type => games.find(game => game.defined?.of(type))?.defined.defaults(type) ?? {},
    ops: Object.assign({}, ...games.map(game => game.defined?.ops)),
    widgets: Object.assign({}, ...games.map(game => game.defined?.widgets)),
  }
  return {
    extraParts: unique(games.flatMap(game => game.extraParts ?? [])),
    parts: {
      all: parts,
      preview: (part, options) => owner(part)?.parts.preview?.(part, options),
      settings: (part, ...args) => owner(part)?.parts.settings?.(part, ...args) ?? [],
    },
    circuit, workReferences, defined,
  }
}
