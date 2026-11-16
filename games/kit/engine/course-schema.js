// Chapter order is independent of directed prerequisites.
import { S } from './schema.js'

export const COURSE_FIELDS = {
  levels: S.list(S.obj({ id: S.level(), optional: S.opt(S.bool()), skippable: S.opt(S.bool()) })),
  links: S.opt(S.list(S.either(
    S.obj({ from: S.level(), to: S.level(), required: S.opt(S.bool()) }),
    S.obj({ fromGame: S.str({ pattern: '^[a-z][a-z0-9-]*$' }), from: S.str({ pattern: '^[A-Za-z0-9][A-Za-z0-9_-]*$' }), to: S.level() }),
  ))),
}
