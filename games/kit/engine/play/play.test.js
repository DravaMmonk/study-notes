// The play interface on every domain that has a play hook, over its game's first levels in course order (run from
// trace-viewer: npm test). A scripted player answers each level with the content's reference board (or moves) through
// the interface: before it, the naive answer (where the level has one) fails with the game's feedback; the reference
// then passes, and the session goes on from its progress (the parts built run the boards it passed with). The view
// never shows a reference answer or a hidden test.
import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { closeGames } from '../games.mjs'
import { loadPlay } from './node.mjs'
import { createPlay } from './play.js'
import { checkPlaytest, newSession } from './session.js'

after(() => closeGames())

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

const GAMES = { bus: 9, factory: 16, 'state-graph': 14, qed: 18, 'vision-complete': 14 }

for (const [id, count] of Object.entries(GAMES)) {
  test(`${id}: the reference passes through the play interface, the naive answer fails, nothing hidden shows`, async () => {
    const { shell, hook, course, content } = await loadPlay(id)
    const record = newSession({ game: id, session: 'test', player: { kind: 'script' }, attempts: 50, progress: shell.store.blank() })
    const play = createPlay({ game: shell, course, hook, record })
    let played = 0
    let naives = 0
    for (let guard = 0; played < count && guard < 200; guard++) {
      const view = play.view()
      if (!view.level) break
      const { ref, naive, hidden, visible } = answers(content, record, view.level, view.task)
      assert.ok(ref, `${view.level}: no reference answer`)
      const refText = answer(ref)
      if (ref.length > 1) assert.ok(!view.text.includes(refText), `${view.level}: the view shows the reference answer`)
      for (const label of hidden) if (!visible.includes(label)) assert.ok(!view.text.includes(`### ${label}`), `${view.level}: the view shows the hidden test ${label}`)
      if (naive) {
        const r = play.attempt(answer(naive))
        assert.equal(r.pass, false, `${view.level}: the naive answer passes`)
        assert.ok(r.text.split("\n\n")[0].trim().length > 0, `${view.level}: the naive answer gets no feedback`)
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
        played++
      }
    }
    assert.equal(played, count, `${id}: ${played} levels passed of ${count}`)
    if (['bus', 'factory', 'vision-complete'].includes(id)) assert.ok(naives > 0, `${id}: no naive answer was tried`)
    assert.deepEqual(checkPlaytest(record), [])
    assert.ok(record.levels.every((e) => ['solved', 'skipped'].includes(e.outcome)))
  })
}
