// Games own chapter membership and route-map rows.
import { S } from './schema.js'
export const COURSE_FIELDS = {
  levels: S.list(S.level()),
  rows: S.opt(S.list(S.list(S.either(S.level(), S.oneOf([null])), { min: 1, max: 3 }))),
}
export const COURSE_OPTIONS = {
  optional: S.opt(S.list(S.level())),
  skippable: S.opt(S.list(S.level())),
}
