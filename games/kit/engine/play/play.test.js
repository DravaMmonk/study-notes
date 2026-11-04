// The play interface on every domain that has a play hook, over its starter game (kit/domains/<d>/starter, what npm run
// new-game copies) in course order until the course is done (run from trace-viewer: npm test). A scripted player answers
// each level with the content's reference board (or moves) through the interface: before it, the naive answer (where
// the level has one) fails with the game's feedback; the reference then passes, and the session goes on from its
// progress (the parts built run the boards it passed with). A level whose content writes no reference the player can
// type (an answer the domain judges some other way) is given up, and the course goes on. The view never shows a
// reference answer or a hidden test.
import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { closeGames } from '../games.mjs'
import { readContent } from '../content-node.js'
import { loadPlay } from './node.mjs'
import { createPlay } from './play.js'
import { checkPlaytest, newSession } from './session.js'

after(() => closeGames())

const DOMAINS = resolve(import.meta.dirname, '../../domains')
const withPlay = []
for (const name of readdirSync(DOMAINS).filter((d) => existsSync(resolve(DOMAINS, d, 'domain.js')))) {
  if ((await import(resolve(DOMAINS, name, 'domain.js'))).default.play) withPlay.push(name)
}

/**
 * A reference (or naive) answer as the player would write it: blueprint lines, or a hand level's moves. Content may
 * leave out what a table level's input cards read (its reader infers it from the wires); the game's import wants it
 * written on the card, as the board's own text shows it.
 */
function answer(lines) {
  const text = (lines ?? []).map((m) => (typeof m === 'string' ? m : Object.entries(m).map(([op, arg]) => `${op} ${arg}`)[0]))
  const cards = ['view', 'facts'].filter((card) => !text.some((l) => l.startsWith(`${card}[`))).map((card) => [card, [...new Set(text.join('\n').match(new RegExp(`\\b${card}\\.(\\w+)`, 'g'))?.map((m) => m.split('.')[1]) ?? [])]]).filter(([, picks]) => picks.length)
  return [...cards.map(([card, picks]) => `${card}[picks=[${picks.join(', ')}]]()`), ...text].join('\n')
}

/** Whether content wrote a reference the player can type: blueprint lines, or a hand level's moves. */
const typed = (lines) => Array.isArray(lines) && lines.every((m) => typeof m === 'string' || (m && typeof m === 'object' && Object.keys(m).length === 1 && typeof Object.values(m)[0] !== 'object'))

/** The content's answers for where the level stands: its task, or (a table level) its stage. */
function answers(content, record, id, task) {
  const level = content.levels.find((l) => l.id === id)
  const played = level.tasks ? { ...level, ...level.tasks[task] } : level
  if (played.stages) {
    const stage = record.progress.data[id]?.stage ?? 0
    const s = played.stages[stage]
    return { ref: s.solution ?? played.stages.at(-1).solution, naive: stage === played.stages.length - 1 ? played.naive : null, hidden: [] }
  }
  return { ref: played.solution, naive: played.naive, hidden: (played.hidden ?? []).map((t) => t.label?.en).filter(Boolean), visible: (played.tests ?? []).map((t) => t.label?.en) }
}

test('every domain with a play hook has a starter game to play it on', () => {
  assert.ok(withPlay.length > 0)
  for (const name of withPlay) assert.ok(existsSync(resolve(DOMAINS, name, 'starter')), `${name} has a play hook but no starter/`)
})

let naives = 0
for (const name of withPlay.filter((d) => existsSync(resolve(DOMAINS, d, 'starter')))) {
  test(`${name}: the reference passes through the play interface, the naive answer fails, nothing hidden shows`, async () => {
    const content = readContent('starter', resolve(DOMAINS, name))
    const { shell, hook, course } = await loadPlay(content)
    const record = newSession({ game: content.id, session: 'test', player: { kind: 'script' }, attempts: 50, progress: shell.store.blank() })
    const play = createPlay({ game: shell, course, hook, record })
    let solved = 0
    // Each attempt passes a stage, a task or a level, or gives one up: the course has fewer of them than this.
    const bound = 10 * content.levels.reduce((n, l) => n + (l.tasks?.length ?? 1) * (l.stages?.length ?? 1), 0)
    for (let guard = 0; guard < bound; guard++) {
      const view = play.view()
      if (!view.level) break
      const { ref, naive, hidden, visible } = answers(content, record, view.level, view.task)
      if (!typed(ref)) {
        play.giveUp()
        continue
      }
      const refText = answer(ref)
      if (ref.length > 1) assert.ok(!view.text.includes(refText), `${view.level}: the view shows the reference answer`)
      for (const label of hidden) if (!visible.includes(label)) assert.ok(!view.text.includes(`### ${label}`), `${view.level}: the view shows the hidden test ${label}`)
      if (typed(naive)) {
        const r = play.attempt(answer(naive))
        assert.equal(r.pass, false, `${view.level}: the naive answer passes`)
        assert.ok(r.text.split('\n\n')[0].trim().length > 0, `${view.level}: the naive answer gets no feedback`)
        naives++
      }
      const r = play.attempt(refText)
      // A stage of a table level passes without the level passing: the next view is the next stage of it.
      if (!r.pass) assert.match(r.text, /On to stage/, `${view.level}: the reference fails: ${r.text}`)
      if (r.pass) {
        // A pass asks what the player worked out; the answer is kept on the level's outcome.
        assert.match(r.text, /--explain/)
        play.explain(`worked out ${view.level}`)
        assert.equal(record.levels.filter((e) => e.outcome === 'solved').at(-1).learned, `worked out ${view.level}`)
        solved++
      }
    }
    // The course is done: every level passed, given up or skipped, and the starter's references solved some.
    assert.equal(play.view().level, null, `${name}: the course is not done`)
    assert.deepEqual(shell.levels.map((l) => l.id).filter((id) => !record.progress.solved.includes(id)), [])
    assert.ok(solved > 0, `${name}: no level solved by its reference`)
    assert.deepEqual(checkPlaytest(record), [])
    assert.ok(record.levels.every((e) => ['solved', 'skipped', 'gave-up'].includes(e.outcome)))
  })
}

test('some starter has a naive answer, and every one tried failed', () => {
  assert.ok(naives > 0)
})
