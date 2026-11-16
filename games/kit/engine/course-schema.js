// Chapters select level references and an optional named map layout.
import { S } from './schema.js'
export const COURSE_FIELDS = {
  levels: S.list(S.level()),
  layout: S.opt(S.name('layout')),
}
export const COURSE_OPTIONS = {
  optional: S.opt(S.list(S.level())),
  skippable: S.opt(S.list(S.level())),
}
