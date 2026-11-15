// Chapters keep route topology, optional levels and named groups in separate fields.
import { S } from './schema.js'
import { T as t } from '../shell/i18n.js'

const levels = S.list(S.level())
const lane = S.list(S.level(), { min: 1 })
const item = S.either(S.level(), S.obj({ parallel: S.list(lane, { min: 2 }) }))

export const COURSE_FIELDS = {
  path: S.list(item, { about: t('主路线：关卡按序开放；并行路线汇合后继续', 'Ordered levels and parallel routes that join before the path continues') }),
  branches: S.opt(S.list(S.obj({ levels: lane, after: S.opt(levels) }))),
  optional: S.opt(levels),
  groups: S.opt(S.list(S.obj({ title: S.text(), code: S.opt(S.str({ pattern: '^[A-Za-z][A-Za-z0-9_-]*$' })), levels }))),
}

export const COURSE_SCHEMA_REMOVAL = { at: 'game.eras.of', why: 'Separate route topology, optional levels, and presentation groups.' }
