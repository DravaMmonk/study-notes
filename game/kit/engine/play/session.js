// A blind session (games/DESIGN.md 6.6): one player playing one game from its first level, in course order, keeping
// its own progress like a save. Its record is data, part of the game's content: games/<game>/playtests/<session>.json,
// whose shape is PLAYTEST below. It holds everything the audit panel (./stats.js) reads, and the progress to go on from.
//
//   progress   the shell's save (../../shell/progress.js): solved levels, the boards the built parts run, tasks passed
//   levels     one outcome a level (or task) played: solved, gave up (the session's cap on attempts, or the player),
//              skipped (a play the harness does not cover; the level counts as passed so the course goes on, and a part
//              it builds runs its reference board, as for any level passed without a board)
//              a solved one keeps what the player says they worked out on it (`learned`)
//   attempts   every attempt in order: the text sent, whether it passed, what the game said
import { S, validate } from '../schema.js'

const OUTCOMES = ['solved', 'gave-up', 'skipped', 'open']

const OUTCOME = S.obj({
  level: S.str(),
  task: S.int({ min: 0 }),
  outcome: S.oneOf(OUTCOMES),
  required: S.bool({ about: 'whether the level is on the main path (not a topic or a challenge)' }),
  attempts: S.int({ min: 0 }),
  hints: S.int({ min: 0, about: 'hints the player asked for' }),
  parts: S.list(S.str(), { about: 'the part types on the passing board (the last board tried, when not passed)' }),
  seconds: S.opt(S.num({ about: 'from first seeing the level to its outcome' })),
  why: S.opt(S.str({ about: 'why a level was skipped' })),
  seen: S.opt(S.num({ about: 'while open: when the level was first seen (ms since 1970)' })),
  learned: S.opt(S.str({ about: 'once solved: what the player says they worked out, in their own words' })),
})

const ATTEMPT = S.obj({
  level: S.str(),
  task: S.int({ min: 0 }),
  at: S.str(),
  text: S.str(),
  pass: S.bool(),
  says: S.str({ about: 'the feedback the game gave, as the player read it' }),
})

/** The schema of a session's record. */
export const PLAYTEST = S.obj({
  game: S.str(),
  session: S.str(),
  player: S.obj({
    kind: S.oneOf(['llm', 'human', 'script']),
    model: S.opt(S.str()),
    note: S.opt(S.str()),
  }),
  lang: S.oneOf(['zh', 'en']),
  started: S.str(),
  limits: S.obj({ attempts: S.int({ min: 1, about: 'attempts a level gets before the session gives it up' }), levels: S.opt(S.int({ min: 1 })) }),
  usage: S.opt(S.obj({ tokens: S.opt(S.int()), seconds: S.opt(S.num()), cost: S.opt(S.num()) }, { about: 'the whole session, when the runner knows it' })),
  progress: S.any({ about: 'the shell save the session goes on from' }),
  levels: S.list(OUTCOME),
  attempts: S.list(ATTEMPT),
})

/** What is wrong with a record, [{ at, says }]. */
export const checkPlaytest = (record) => validate(PLAYTEST, record)

/** A new session's record. */
export function newSession({ game, session, player = { kind: 'llm' }, lang = 'en', attempts = 8, levels, progress, now = new Date() }) {
  return { game, session, player, lang, started: now.toISOString(), limits: { attempts, ...(levels ? { levels } : {}) }, progress, levels: [], attempts: [] }
}

/** The outcome entry of a level's task, made when first seen. */
export function outcomeOf(record, level, task, required, now = new Date()) {
  let entry = record.levels.find((e) => e.level === level && e.task === task)
  if (!entry) {
    entry = { level, task, outcome: 'open', required, attempts: 0, hints: 0, parts: [], seen: now.getTime() }
    record.levels.push(entry)
  }
  return entry
}

/** Close an outcome, with the time it took. */
export function close(entry, outcome, now = new Date(), extra = {}) {
  Object.assign(entry, { outcome, ...extra })
  if (entry.seen !== undefined) entry.seconds = Math.round((now.getTime() - entry.seen) / 1000)
  delete entry.seen
}
