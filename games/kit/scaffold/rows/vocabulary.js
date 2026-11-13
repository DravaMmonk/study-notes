import { S } from '../../engine/schema.js'
import { taskLevel } from '../../engine/tasks.js'
import { defineVocabulary } from '../../engine/vocabulary.js'

const row = S.obj({ total: S.int(), chips: S.list(S.int(), { min: 1 }), reference: S.str(), naive: S.str() })

export const vocabulary = defineVocabulary({
  domain: '__name__',
  version: 1,
  kinds: { kind: { equation: { about: { zh: '补齐等式右边的加法式' } } } },
  game: S.obj({ title: S.text(), kicker: S.text(), lede: S.text(), order: S.list(S.level(), { min: 1 }) }),
  level: taskLevel({ title: S.text() }, {
    kind: S.ref('kind'), brief: S.text(), rows: S.list(row, { min: 1 }),
  }),
})
