// Chapter order is independent of directed prerequisites.
import { S } from './schema.js'
import { T as t } from '../shell/i18n.js'

const levels = S.list(S.level())
export const COURSE_FIELDS = {
  levels,
  links: S.opt(S.list(S.obj({ from: S.level(), to: S.level(), required: S.opt(S.bool()) }))),
  optional: S.opt(levels),
}

export const COURSE_SCHEMA_REMOVAL = { at: 'game.eras.of', why: t('把课程顺序和先修连线分别存放', 'Store course order separately from prerequisite wires.') }
