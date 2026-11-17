// Module adapters retain their screens and work readers; this layer only joins their data projections.
import { defineGame } from '../shell/index.js'
import { runtimeWorks } from '../engine/runtime-model.js'

/** Compose module games over one course, dispatching task services to their owning projection. */
export function composeGame(content, modules) {
  if (modules.length === 1) return modules[0].define(content)
  const { plan, scopes, works } = runtimeWorks(content, modules)
  const active = scopes.flatMap((scope, index) => (works[index].LEVELS ?? works[index].levels).length
    ? [{ id: scope.id, game: modules[index].define(scope.content, works[index]) }] : [])
  const games = active.map(({ game }) => game)
  const byModule = Object.fromEntries(active.map(({ id, game }) => [id, game]))
  const fragments = (id) => games.flatMap(game => game.byId[id] ? [{ game, level: game.byId[id] }] : [])
  const levels = plan.order.map((id, index) => {
    const fragmentsAt = fragments(id)
    const source = content.levels.find(level => level.id === id)
    const tasks = new Map(fragmentsAt.flatMap(({ level }) => level.tasks.map(task => [task.key, task])))
    const ordered = source.tasks.map(task => tasks.get(task.id))
    return { ...fragmentsAt[0].level, index, tasks: ordered, kind: ordered[0].kind ?? fragmentsAt[0].level.kind,
      unlocks: [...new Set(fragmentsAt.flatMap(({ level }) => level.unlocks ?? []))], keeps: fragmentsAt.some(({ level }) => level.keeps) }
  })
  const primary = fragments(plan.order[0])[0]?.game ?? games[0]
  const define = primary.compose ?? defineGame
  const game = define({
    ...Object.assign({}, ...games), ...primary, course: works[0].course, levels,
    kinds: Object.assign({}, ...games.map(game => game.kinds)),
    ...Object.assign({}, ...games.map(game => game.composeModules?.({ games, byModule }))),
    intro: level => fragments(level.id)[0].game.intro(fragments(level.id)[0].level),
    unlocked: level => fragments(level.id).flatMap(({ game, level }) => game.unlocked(level)),
    passed: level => fragments(level.id).map(({ game, level }) => game.passed(level)).find(Boolean) ?? null,
    core: level => fragments(level.id).some(({ game, level }) => game.core(level)),
  })
  game.moduleGames = byModule
  return game
}
