// The author checks of a game kept between runs, level by level (games/PLAN.md B.2): what a domain's checks said of a
// level is said again without running them while nothing they read has changed. Kept on this machine only, never in
// the repository: trace-viewer/node_modules/.cache/games-check/<game>.json. npm run check and the operation set read it
// (`--fresh` does not); npm test never does.
//
//   checkCache(game, { fresh })  → { memo(content, spec), save() }
//     memo(content, spec)        → memo(id, name, run): run()'s lines, or what it said last time. id names a level or
//                                  one of its tasks; anything else is run every time.
//
// A level's key is a hash of the kernel (every .js, .jsx and .json under games/kit but the tests), the game as a whole
// but its levels, the level itself, and every level it comes after without their words: a level's check may run what
// an earlier one built, never what a later one did. So a level's own wording changes only its own key; its puzzle or
// answers change the keys of every level after it; the kernel's or a domain's code changes them all.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const KIT = resolve(import.meta.dirname, '..')
const FOLDER = resolve(KIT, '../../trace-viewer/node_modules/.cache/games-check')

const digest = (...parts) => {
  const h = createHash('sha1')
  for (const part of parts) h.update(typeof part === 'string' ? part : JSON.stringify(part)).update('\0')
  return h.digest('hex')
}

const sources = (dir) => readdirSync(dir).sort().flatMap((name) => {
  const path = join(dir, name)
  if (name === 'node_modules') return []
  if (statSync(path).isDirectory()) return sources(path)
  return /\.(js|jsx|json)$/.test(name) && !/\.test\.js$/.test(name) ? [path] : []
})

let kit = null
/** The kernel's version: a hash of its code and data. */
export function kitVersion() {
  kit ??= digest(...sources(KIT).flatMap((path) => [path.slice(KIT.length), readFileSync(path, 'utf8')]))
  return kit
}

// A text of the content (schema.js S.text): words, which no check of an earlier level's work reads.
const isText = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.entries(v).every(([k, x]) => (k === 'zh' || k === 'en') && typeof x === 'string')
const wordless = (value) => JSON.stringify(value, (_k, v) => (isText(v) ? undefined : v))

/** Each level's key, by level id, and the level each task id is in. */
export function levelKeys(content, course) {
  const { levels, ...rest } = content
  const whole = digest(kitVersion(), rest)
  const known = (id) => course?.index?.has(id)
  const keys = new Map(levels.map((level) => {
    const before = levels.filter((l) => l.id !== level.id && (!known(level.id) || !known(l.id) || course.before(l.id, level.id)))
    return [level.id, digest(whole, level, ...before.map((l) => `${l.id}:${wordless(l)}`))]
  }))
  const home = new Map(levels.flatMap((level) => [[level.id, level.id], ...(level.tasks ?? []).map((task) => [task.id, level.id])]))
  return { keys, home }
}

/** A game's kept checks: memo hands a run's lines back when the level they are about has not changed. */
export function checkCache(game, { fresh = false } = {}) {
  const file = resolve(FOLDER, `${game}.json`)
  let kept = {}
  if (!fresh && existsSync(file)) {
    try {
      kept = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      kept = {}
    }
  }
  const used = {}
  return {
    memo(content, spec) {
      const { keys, home } = levelKeys(content, spec.course)
      return (id, name, run) => {
        const level = home.get(id) ?? home.get(String(id).split('/')[0])
        if (!level) return run()
        const key = digest(keys.get(level), id, name)
        if (!(key in kept)) kept[key] = run()
        used[key] = kept[key]
        return used[key]
      }
    },
    save() {
      mkdirSync(FOLDER, { recursive: true })
      writeFileSync(file, JSON.stringify(used))
    },
  }
}

/** Run every time: what a check gets when no cache is asked for. */
export const noMemo = (_id, _name, run) => run()
