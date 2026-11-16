// Module adapters retain their screens and work readers; this layer only joins their data projections.
import { defineGame } from '../shell/index.js'
import { runtimeWorks, taskModule } from '../engine/runtime-model.js'

/** Compose module games over one course, dispatching task and piece services to their owning projection. */
export function composeGame(content, modules) {
  if (modules.length === 1) return modules[0].define(content)
  const { plan, scopes, works } = runtimeWorks(content, modules)
  const active = scopes.flatMap((scope, index) => (works[index].LEVELS ?? works[index].levels).length
    ? [{ id: scope.id, game: modules[index].define(scope.content, works[index]) }] : [])
  const games = active.map(({ game }) => game)
  const byModule = Object.fromEntries(active.map(({ id, game }) => [id, game]))
  const fragments = (id) => games.flatMap(game => game.byId[id] ? [{ game, level: game.byId[id] }] : [])
  const levels = plan.order.map((id, index) => {
    const parts = fragments(id)
    const source = content.levels.find(level => level.id === id)
    const tasks = new Map(parts.flatMap(({ level }) => level.tasks.map(task => [task.key, task])))
    const ordered = source.tasks.map(task => tasks.get(task.id))
    return { ...parts[0].level, index, tasks: ordered, kind: ordered[0].kind ?? parts[0].level.kind,
      unlocks: [...new Set(parts.flatMap(({ level }) => level.unlocks ?? []))], keeps: parts.some(({ level }) => level.keeps) }
  })
  const unique = values => [...new Map(values.map(value => [value.key, value])).values()]
  const pieces = unique(games.flatMap(game => game.parts?.all ?? []))
  const owner = part => games.find(game => game.parts?.all.some(value => value.key === part.key))
  const primary = fragments(plan.order[0])[0]?.game ?? games[0]
  const game = defineGame({
    ...Object.assign({}, ...games), ...primary, course: works[0].course, levels,
    kinds: Object.assign({}, ...games.map(game => game.kinds)),
    extraPieces: unique(games.flatMap(game => game.extraPieces ?? [])),
    parts: {
      all: pieces,
      preview: (part, options) => owner(part)?.parts.preview?.(part, options),
      settings: (part, ...args) => owner(part)?.parts.settings?.(part, ...args) ?? [],
    },
    intro: level => fragments(level.id)[0].game.intro(fragments(level.id)[0].level),
    unlocked: level => fragments(level.id).flatMap(({ game, level }) => game.unlocked(level)),
    passed: level => fragments(level.id).map(({ game, level }) => game.passed(level)).find(Boolean) ?? null,
    core: level => fragments(level.id).some(({ game, level }) => game.core(level)),
  })
  game.moduleGames = byModule
  game.circuit = { forTask: task => byModule[taskModule(task)]?.circuit?.forTask(task) }
  game.workReferences = (options) => byModule[taskModule(options.task)]?.workReferences?.(options) ?? []
  game.defined = {
    of: type => games.map(game => game.defined?.of(type)).find(Boolean) ?? null,
    defaults: type => games.find(game => game.defined?.of(type))?.defined.defaults(type) ?? {},
    ops: Object.assign({}, ...games.map(game => game.defined?.ops)),
    widgets: Object.assign({}, ...games.map(game => game.defined?.widgets)),
  }
  return game
}
