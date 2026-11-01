// A blind session under node (./cli.mjs, ./tool.mjs): the game as the shell gets it and its domain's play hook, both
// through the checks' own loader (../games.mjs), the course the audit checks, and the session's record on disk
// (games/<game>/playtests/<session>.json, ./session.js). Run from trace-viewer, as npm run play does.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GAMES_DIR, readContent } from '../content-node.js'
import { gameOf, loadModule } from '../games.mjs'
import { createPlay } from './play.js'
import { checkPlaytest, newSession } from './session.js'

const KIT = resolve(import.meta.dirname, '../..')

/** Where a session's record lives. */
export const recordFile = (game, session, dir = GAMES_DIR) => resolve(dir, game, 'playtests', `${session}.json`)

let loadedLang = null

/**
 * Game `game` ready to play in `lang`: { shell (defineGame's result), hook (its domain's play hook), course (the course
 * the audit checks), content }. The language is the shell's, chosen before the first game loads: one language a process.
 */
export async function loadPlay(game, lang = 'en') {
  if (loadedLang && loadedLang !== lang) throw new Error(`this process plays in ${loadedLang}, not ${lang}`)
  if (!loadedLang) {
    globalThis.localStorage.setItem('fieldnotes.lang', lang)
    loadedLang = lang
  }
  const content = readContent(game)
  const shell = await gameOf(content)
  const domain = (await loadModule(resolve(KIT, 'domains', content.domain, 'domain.js'))).default
  if (!domain.play) throw new Error(`the ${content.domain} domain has no play hook`)
  return { shell, hook: domain.play, course: domain.spec(content).course, content }
}

/** Open (or start) session `session` of game `game`. A new session takes `options`: { lang, player, attempts, levels }. */
export async function openSession(game, session, options = {}) {
  const file = recordFile(game, session)
  const record = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  const lang = record?.lang ?? options.lang ?? 'en'
  const { shell, hook, course } = await loadPlay(game, lang)
  const rec = record ?? newSession({ game, session, lang, progress: shell.store.blank(), ...options })
  const play = createPlay({ game: shell, course, hook, record: rec })
  const save = () => {
    const wrong = checkPlaytest(rec)
    if (wrong.length) throw new Error(`the session record does not fit its schema: ${wrong.map((w) => `${w.at} ${w.says}`).join('; ')}`)
    mkdirSync(resolve(file, '..'), { recursive: true })
    writeFileSync(file, `${JSON.stringify(rec, null, 1)}\n`)
  }
  return { play, record: rec, save, file }
}
