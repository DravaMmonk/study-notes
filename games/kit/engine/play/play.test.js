import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { proofsRoot } from '../ops/fixture.js'
import { readContent } from '../resolver.js'
import { closeGames } from '../games.mjs'
import { loadPlay } from './node.mjs'
import { createPlay } from './play.js'
import { fresh } from '../../shell/progress.js'
import { checkPlaytest, newSession } from './session.js'

after(() => closeGames())
test('installed package references solve a textual session without exposing hidden work', async () => {
  const { root, id } = proofsRoot()
  try {
    const content = readContent(id, root)
    const { shell, hook, course } = await loadPlay(content)
    const record = newSession({ game: id, session: 'test', player: { kind: 'script' }, attempts: 50, progress: fresh() })
    const play = createPlay({ game: shell, course, hook, record })
    let solved = 0
    for (let guard = 0; guard < 20; guard++) {
      const view = play.view()
      if (!view.level) break
      const level = content.levels.find(level => level.id === view.level)
      const task = level.tasks[view.task]
      if (task.naive) assert.equal(play.attempt(task.naive.join('\n')).pass, false)
      const answer = task.solution.join('\n')
      assert.ok(!view.text.includes(answer))
      const result = play.attempt(answer)
      assert.equal(result.pass, true, result.text)
      play.explain('The reference establishes the goal from the premises.')
      solved++
    }
    assert.equal(solved, content.levels.length)
    assert.equal(play.view().level, null)
    assert.deepEqual(checkPlaytest(record), [])
  } finally { rmSync(root, { recursive: true, force: true }) }
})
