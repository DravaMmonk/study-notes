// The schemas of a circuit game's content (games/DESIGN.md 6.2): a level and its tasks, and game.json, for a domain's
// vocabulary. A domain gives what is its own (a task's fixed cards, a test, its checks) and gets the rest:
//
//   levelSchema({ page?, ports, test, checks?, more?, shared?, kinds? })   a level
//   GAME                                                                  game.json
//   NAME, PORT                                                            a card's name, a port
//   REMOVES                                                               what the version without `builds` removed
import { taskLevel } from './tasks.js'
import { TRAY, TRAYS } from './trays.js'
import { S } from './schema.js'
import { GAME_VIEWS, RESULTS, SHOW, START_VIEW, TASK_VIEWS } from './views.js'
import { T as t } from '../shell/i18n.js'

/** A card's name: a port's, a register's, a built piece's. */
export const NAME = S.str({ pattern: '^[A-Za-z_][A-Za-z0-9_]*$' })
/** An item a task gives, withholds or opens (../course.js itemOf): a part, one of its settings, one value of a setting. */
const HELD = S.str({ pattern: '^[A-Za-z_][A-Za-z0-9_-]*(\\.[A-Za-z_][A-Za-z0-9_]*(=.+)?)?$' })
/** A port of a task's board: one of its fixed cards, named and labelled. */
export const PORT = S.obj({ name: NAME, label: S.text(), view: START_VIEW })

/** What a domain's vocabulary removed when its built parts went into parts.json (games/DIRECTION.md decision 7). */
export const REMOVES = [{ at: 'level.builds', why: 'a built piece is a parts.json entry whose inside refers to the task that builds it' }]

/**
 * The schema of a level (./tasks.js taskLevel): what it says once, then its tasks, each a puzzle on its own board. The
 * domain gives what is its own: `ports` a task's fixed cards ({ inputs, outputs, … }; outputs by default one or more PORTs), `test` one
 * test, `checks` what a task's outputs must be beyond what its tests say ({ want }), `more` the task's other fields,
 * `page` one page of an introduction ({ t } by default). A domain whose levels also hold tasks of other kinds
 * (circuitCourse kinds) gives `kinds` ({ kind: fields }): every task then says its `kind`, a board's being 'circuit',
 * and every task has `shared`'s fields too. An introduction page and the pass text may each show a value (./views.js
 * SHOW), drawn by the kit as a figure.
 */
export const levelSchema = ({ page = S.obj({ t: S.text(), show: S.opt(SHOW) }), ports, test, checks = {}, more = {}, shared = {}, kinds = null }) => {
  const own = {
    ...shared,
    stage: S.opt(S.text({ section: 'read', about: t('这次升级留下的管线分段名称') })),
    brief: S.text(),
    hint: S.opt(S.list(S.text())),
    intro: S.opt(S.list(page, { section: 'read', about: t('这个任务自己的引言：第一次做到它时读（第一个任务的接在这一关的后面）') })),
    after: S.opt(S.text({ about: t('这个任务通过时说的话（最后一个任务用这一关的点题）') })),
  }
  const board = {
    ...own,
    ...ports,
    outputs: ports.outputs ?? S.list(PORT, { min: 1 }),
    tests: S.list(test, { min: 1, section: 'tests' }),
    hidden: S.opt(S.list(test, { section: 'tests', about: t('隐藏测试：每次运行一并检查，通关后公开；只合上可见测试的板过不了它') })),
    ...checks,
    solution: S.board({ about: t('一块板的蓝图文本，每行一个字符串') }),
    naive: S.opt(S.list(S.str(), { about: t('直觉上的错解：看起来能做、其实过不了这个任务的板，必须失败') })),
    starter: S.opt(S.list(S.str(), { about: t('这个任务一打开就摆在板上的蓝图：一样要修的作品。它不能直接过关') })),
    works: S.opt(S.list(S.obj({ label: S.opt(S.text()), board: S.list(S.str()) }), { min: 1, section: 'tests', about: t('给定的错作品，每样错一处：有了它，这个任务由玩家来写检验（行数同 tests），tests 是参考的那几行；参考解通过每一行，每样错作品至少被一行挡住') })),
    withhold: S.opt(S.list(S.str(), { section: 'course', about: t('这个任务不给的元件：玩家已经有了也从托盘收起，参考解不能用它') })),
    grants: S.opt(S.list(HELD, { section: 'course', about: t('只在这个任务里多给的：一个元件，元件的一项设置（shift.border），或设置的一个取值（shift.border=wrap）；别的任务不因此得到它。withhold 也可以按同样的写法收起一项设置或一个取值') })),
    opens: S.opt(S.list(HELD, { section: 'course', about: t('这个任务带来的设置或取值（shift.border、shift.border=wrap）：从这里起一直可用。没有哪一关带来的设置和取值，从一开始就可用') })),
    results: RESULTS,
    views: TASK_VIEWS,
    ...more,
  }
  const kind = (k, fields) => S.obj({ kind: S.oneOf([k]), ...fields })
  return taskLevel({
    title: S.text(),
    intro: S.opt(S.list(page)),
    after: S.opt(S.text()),
    afterShow: S.opt({ ...SHOW, about: t('点题旁显示的一个值') }),
    note: S.opt(S.text()),
    adds: S.opt(S.list(S.ref('part'), { section: 'course' })),
    tray: TRAY,
    showcase: S.opt(S.text({ section: 'course', about: t('新元件第一次出现时只放它一个也算一关：为什么') })),
  }, kinds ? S.by('kind', { circuit: kind('circuit', board), ...Object.fromEntries(Object.entries(kinds).map(([k, fields]) => [k, kind(k, { ...own, ...fields })])) }) : board)
}

/* ---------- game.json ---------- */

// The schema of a game.json on the base (a domain's vocabulary game): its eras laid out as ../course.js layout reads
// them and the primitives it starts from.
const ids = S.list(S.str())
const levels = S.list(S.level())
const ITEM = S.either(S.level(), S.obj({ parallel: S.list(S.obj({ id: S.str(), title: S.opt(S.text()), levels })) }))
const AFTER = S.either(S.level(), levels)
const ERA = S.obj({
  id: S.int(),
  title: S.text(),
  question: S.text(),
  foundation: S.list(ITEM),
  practice: S.opt(S.list(ITEM)),
  topics: S.opt(S.list(S.obj({ id: S.str(), after: S.opt(AFTER), requires: S.opt(ids), levels, title: S.opt(S.text()) }))),
  challenges: S.opt(S.list(S.obj({ level: S.level(), after: S.opt(AFTER) }))),
})
export const GAME = S.obj({
  title: S.text(),
  kicker: S.text(),
  lede: S.text({ about: t('这款游戏教什么、学完能亲手做成什么，不写关卡数', 'what the game teaches and what the player ends up building, not how many levels') }),
  mode: S.opt(S.oneOf(['notes'], { about: t('笔记版：一关对应一个笔记词条，所有关打开，不跑课程审计（手册第 12 节）') })),
  primitives: S.list(S.ref('part')),
  trays: TRAYS,
  concept: S.opt(S.map(S.str(), { about: t('几个元件合起来是一个新概念') })),
  replaces: S.opt(S.map(S.list(NAME), { about: t('搭出的件取代的搭出的件：从搭出它的那一关往后，托盘里给它，不再给那些') })),
  eras: S.list(ERA, { min: 1 }),
  views: GAME_VIEWS,
})
