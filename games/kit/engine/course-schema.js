// Chapter order is independent of directed prerequisites.
import { S } from './schema.js'
import { T as t } from '../shell/i18n.js'

export const COURSE_FIELDS = {
  levels: S.list(S.obj({ id: S.level(), optional: S.opt(S.bool()) })),
  links: S.opt(S.list(S.obj({ from: S.level(), to: S.level(), required: S.opt(S.bool()) }))),
}

export const COURSE_SCHEMA_REMOVAL = { at: 'game.eras.of', why: t('把可选标记放在章节的关卡条目里', 'Store the optional flag on each chapter level entry.') }
