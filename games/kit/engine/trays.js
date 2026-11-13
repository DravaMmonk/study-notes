// A game's trays (../course.js trays, games/DESIGN.md 2): each a list of parts in the order the tray shows them. A level
// names the tray it is played with (a task may name its own); in a game of one tray it need not. A game without trays
// gives every level every part it has met, in the order met.
import { S } from './schema.js'
import { T as t } from '../shell/i18n.js'

/** game.json `trays`: { [tray]: [part] }. */
export const TRAYS = S.opt(S.map(S.list(S.either(S.ref('part'), S.name('part'))), { section: 'course', about: t('几套托盘：每套是一串元件，按托盘上的先后排；关卡用其中一套，托盘上的元件在带来它或搭出它的那一关之后可用。不写时每关拿到见过的所有元件') }))

/** A level's or a task's `tray`. */
export const TRAY = S.opt(S.str({ section: 'course', about: t('这一关（这个任务）用的托盘；游戏只有一套托盘时不用写') }))

/** The names of the parts a game's levels build, for its trays (domain.js names; the vocabulary's go by reference). */
export const partNames = (built = []) => ({ part: new Set(built) })

/** The tray a level or task plays with: the one it names, else a game's only tray; null in a game of several. */
export const trayIn = (trays = {}, named) => named ?? (Object.keys(trays).length === 1 ? Object.keys(trays)[0] : null)
