import { COURSE_FIELDS, COURSE_OPTIONS } from '../../engine/course-schema.js'
import { S } from '../../engine/schema.js'
import { taskLevel } from '../../engine/tasks.js'
import { qualifyVocabulary } from '../../engine/capabilities.js'
import { defineVocabulary } from '../../engine/vocabulary.js'

const row = S.obj({ total: S.int(), chips: S.list(S.int(), { min: 1 }), reference: S.syntax('sum'), naive: S.syntax('sum') })

export const vocabulary = qualifyVocabulary('rows', defineVocabulary({
  domain: 'rows',
  version: 1,
  languages: { sum: { about: { zh: '由整数和加号组成的等式右边', en: 'The right side of an equation, built from integers and addition' } } },
  kinds: { kind: { equation: { about: { zh: '补齐等式右边的加法式' } } } },
  game: S.obj({ title: S.text(), kicker: S.text(), lede: S.text(), chapters: S.list(S.obj({ id: S.int(), ...COURSE_FIELDS })), ...COURSE_OPTIONS }),
  level: taskLevel({ title: S.text() }, {
    kind: S.ref('kind'), brief: S.text(), rows: S.list(row, { min: 1 }),
  }),
}))
