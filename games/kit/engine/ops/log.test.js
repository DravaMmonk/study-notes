// node --test (npm test, from trace-viewer) — who wrote what in a change log (log.js authorship), on entries written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { authorship } from './log.js'

const entry = (by, ...files) => ({ ...(by && { by }), ops: [], files: files.map((file) => ({ file })) })

test('a file an agent wrote counts as revised once a person changes it, and only while the agent’s was the last word', () => {
  const log = [
    entry('agent:levels:m', 'levels/a.json', 'levels/b.json'),
    entry('agent:copy:m', 'levels/a.json'),
    entry('studio', 'levels/a.json'),
    entry('studio', 'levels/a.json'),
    { adopt: true, files: [{ file: 'levels/b.json' }] },
    entry(null, 'game.json'),
  ]
  assert.deepEqual(authorship(log), [
    { by: 'agent:levels:m', changes: 1, files: 2, revised: 0 },
    { by: 'agent:copy:m', changes: 1, files: 1, revised: 1 },
    { by: 'studio', changes: 2, files: 1, revised: 0 },
    { by: 'unknown', changes: 1, files: 1, revised: 0 },
  ])
})
