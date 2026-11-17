import { runtime as circuitRuntime } from '../../../packages/circuit/core/index.js'
import { pluginRuntime } from './plugin-runtime.js'
import { contentRoots, contentSchemas } from './content.js'
// Server-side capability implementations are loaded only for checks and textual play.
import { vocabularyFor, modules } from './kernel.js'
import { runtimeIds, taskModule, runtimeSpec } from './runtime-model.js'
export { runtimeIds, taskModule, runtimeWorks, runtimeSpec } from './runtime-model.js'

/** Resolve module runtimes using capability ownership. The vocabulary tables remain shared. */
export async function runtimeOf(content, root) {
  const { loadPlugins } = await import('./plugin-node.js')
  const { contentRoot } = await import('./resolver.js')
  root ??= contentRoots.get(content) ?? contentRoot()
  const plugins = await loadPlugins(content, root)
  const pluginIds = new Set([...plugins.tables.play.keys()].map(name => name.split(':')[0]).filter(id => id !== 'circuit'))
  const vocabulary = contentSchemas.get(content) ?? vocabularyFor(runtimeIds(content).filter(id => !pluginIds.has(id)))
  const runtimes = await Promise.all(runtimeIds(content).filter(id => pluginIds.has(id) || modules.some(module => module.id === id)).map(async (id) => ({ id, runtime: pluginIds.has(id) ? pluginRuntime(id, plugins, vocabulary) : id === 'circuit' ? circuitRuntime : (await import(`../modules/${id}/runtime.js`)).default })))
  const complete = runtime => ({ ...runtime, validate: async spec => [...await runtime.validate(spec), ...await plugins.checks({ content, levels: spec.levels, excludePackages: runtimes.map(({ id }) => id) })] })
  if (runtimes.length === 1) return complete({ ...runtimes[0].runtime, vocabulary })
  const byId = new Map(runtimes.map(({ id, runtime }) => [id, runtime]))
  const choose = (ctx) => byId.get(taskModule(ctx.level.source ?? ctx.level))
  const context = (ctx) => ({ ...ctx, game: ctx.game?.moduleGames?.[taskModule(ctx.level.source ?? ctx.level)] ?? ctx.game })
  return complete({
    vocabulary,
    names: (source) => {
      const names = {}
      for (const { runtime } of runtimes) for (const [kind, values] of Object.entries(runtime.names?.(source) ?? {})) {
        names[kind] = new Set([...(names[kind] ?? []), ...values])
      }
      return names
    },
    languages: Object.assign({}, ...runtimes.map(({ runtime }) => runtime.languages)),
    spec: (source) => runtimeSpec(source, runtimes),
    validate: async (spec) => (await Promise.all(runtimes.map(({ runtime }, index) => runtime.validate({ ...spec.specs[index], memo: spec.memo })))).flat(),
    play: {
      open: (ctx) => choose(ctx).play.open(context(ctx)),
      attempt: (ctx, text) => choose(ctx).play.attempt(context(ctx), text),
    },
  })
}
