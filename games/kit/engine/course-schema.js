// Games own chapter membership and route-map rows.
import { S } from './schema.js'
export const COURSE_FIELDS = {
  levels: S.list(S.level(), { tags: false }),
  rows: S.opt(S.list(S.list(S.either(S.level(), S.oneOf([null])), { min: 1, max: 3 }))),
}
export const COURSE_OPTIONS = {
  encyclopedia: S.opt(S.list(S.str({ reference: 'section' }))),
  optional: S.opt(S.list(S.level())),
  skippable: S.opt(S.list(S.level())),
}

export const CHAPTER = S.obj({
  number: S.opt(S.int({ min: 0 })),
  title: S.opt(S.text()), question: S.opt(S.text()), desc: S.opt(S.text()),
  chapter: S.opt(S.obj({ title: S.text(), label: S.opt(S.text()), question: S.opt(S.text()), desc: S.opt(S.text()) })),
  machine: S.opt(S.either(S.str(), S.oneOf([null]))),
  ...COURSE_FIELDS,
})
export const CHAPTERS = S.list(S.str({ reference: 'chapter' }))
