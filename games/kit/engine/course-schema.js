// A chapter of a game's course (games/DESIGN.md 2.9). Chapter order is independent of directed prerequisites. A chapter
// places single levels and whole level groups (./groups.js); a link joins levels or groups placed in the course; `rows`
// is the chapter's map as the game wants it, each row its levels from left to right (null: an empty place), and any
// level it leaves out is laid out by the map's rules around it (../course.js mapRows).
import { S } from './schema.js'
import { T as t } from '../shell/i18n.js'

const GROUP = S.name('levelGroup', { about: t('包里的一组关卡', 'a level group of the package') })
const END = S.either(S.level(), GROUP)

export const COURSE_FIELDS = {
  levels: S.list(S.either(
    S.obj({ id: S.level(), optional: S.opt(S.bool()), skippable: S.opt(S.bool()) }),
    S.obj({ group: GROUP, optional: S.opt(S.bool()) }),
  )),
  links: S.opt(S.list(S.either(
    S.obj({ from: END, to: END, required: S.opt(S.bool()) }),
    S.obj({ fromGame: S.str({ pattern: '^[a-z][a-z0-9-]*$' }), from: S.str({ pattern: '^[A-Za-z0-9][A-Za-z0-9_-]*$' }), to: END }),
  ))),
  rows: S.opt(S.list(S.list(S.either(S.level(), S.oneOf([null])), { min: 1 }), {
    about: t('路线图的每一行从左到右放哪些关卡（null 是空位）', 'the map, row by row: its levels from left to right (null: an empty place)'),
  })),
}
