// Server-side capability implementations are loaded only for checks and textual play.
import { vocabularyFor } from './kernel.js'
import { runtimeIds, taskModule, runtimeSpec } from './runtime-model.js'
export { runtimeIds, taskModule, runtimeWorks, runtimeSpec } from './runtime-model.js'

/** Resolve module runtimes using capability ownership. The vocabulary tables remain shared. */
export async function runtimeOf(content) {
  const runtimes = await Promise.all(runtimeIds(content).map(async (id) => ({ id, runtime: (await import(`../modules/${id}/runtime.js`)).default })))
  if (runtimes.length === 1) return { ...runtimes[0].runtime, vocabulary: vocabularyFor(runtimes[0].id) }
  const byId = new Map(runtimes.map(({ id, runtime }) => [id, runtime]))
  const choose = (ctx) => byId.get(taskModule(ctx.level.source ?? ctx.level))
  const context = (ctx) => ({ ...ctx, game: ctx.game?.moduleGames?.[taskModule(ctx.level.source ?? ctx.level)] ?? ctx.game })
  return {
    vocabulary: vocabularyFor(runtimes.map(({ id }) => id)),
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
  }
}
