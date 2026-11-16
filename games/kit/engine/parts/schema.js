// The schema of a game's pieces/<name>.json (games/DESIGN.md 6.8): every piece the course gives, as data. A piece has the
// faces every piece has (its name, what it does, its icon and family) and the
// faces of the editor it is made with (`editor`; the circuit's when it names none), each editor declaring its own:
//   circuit  a primitive's ports, its settings (one of the kernel controls), what it computes (an expression over the
//            domain's engine resources, expr.js) and its three views; or a built piece's independent board and interface.
//            Its rule: a piece computes (or keeps an input), or runs an inside, never both
//   strip    the block on a strip that marks what it stands for (`mark`, an item of the domain's `mark` kind)
// with settings declared inline. The schema is the kernel's, the same in every domain; what it names
// (resources, families, widgets, marks) the domain's vocabulary gives.
import { S } from '../schema.js'
import { PIECE_REFERENCE_FIELDS } from '../pieces.js'
import { T as t } from '../../shell/i18n.js'


const LOCAL_NAME = S.str({ pattern: '^[A-Za-z_][A-Za-z0-9_]*$', about: t('ASCII 名字：字母或下划线开头') })
export const NAME = { ...LOCAL_NAME, pattern: '^(?:@?[a-z][a-z0-9-]*/)?[A-Za-z_][A-Za-z0-9_]*$' }
const WORD = S.str({ pattern: '^[A-Za-z0-9_][A-Za-z0-9_.-]*$', about: t('ASCII 值：写进蓝图文本') })
export const EXPR = S.str({ view: 'expr', about: t('一行式子：调用领域的引擎资源') })
export const ICON = S.str({ view: 'icon', about: t('内核图标表里的一个名字') })

/** The layouts of a group of small buttons. */
export const LAYOUTS = ['row', 'column', 'grid', 'pad']

const OPTION = S.obj({ value: WORD, label: S.opt(S.text()), icon: S.opt(ICON), about: S.opt(S.text({ about: t('这个选项做什么，一句完整的话：选项开放后接在元件说明后面') })) })
const OPTIONS = S.list(OPTION, { min: 1 })
const COMMON = {
  label: S.opt(S.text()),
  about: S.opt(S.text({ about: t('悬停和详情里的一行说明') })),
  default: S.opt(S.any({ about: t('新元件的值') })),
  when: S.opt(S.str({ view: 'expr', about: t('式子：为真时才出现（只读设置）') })),
  fixed: S.opt(S.bool({ about: t('只显示，玩家不能改') })),
}
const RANGE = { min: S.opt(S.num()), max: S.opt(S.num()), step: S.opt(S.num({ min: 0 })), unit: S.opt(S.text()) }
// Options are written out, or worked out by an expression on the card's inputs (`from`: a resource giving [{ value, label }]).
const FROM = S.opt(S.str({ view: 'expr', about: t('式子：由元件的输入算出选项', 'an expression: the options worked out of the part’s inputs') }))
const CONTROL = {
  select: { options: S.opt(OPTIONS), from: FROM },
  list: { options: S.opt(OPTIONS), from: FROM },
  tree: { optional: S.opt(S.bool({ about: t('可以不填', 'may be left empty') })) },
  buttons: { options: S.opt(OPTIONS), from: FROM, layout: S.opt(S.oneOf(LAYOUTS, { about: t('row 一行，column 一列，grid 两两一行，pad 上下左右四向（选项 up、left、right、down）') })) },
  number: { ...RANGE, integer: S.opt(S.bool()), stepper: S.opt(S.bool({ about: t('两边加 − / + 按钮') })), optional: S.opt(S.bool({ about: t('没写时读到「—」（新元件仍从 default 起）') })) },
  slider: { ...RANGE, min: S.num(), max: S.num(), marks: S.opt(S.list(S.num(), { about: t('刻度') })) },
  toggle: { on: S.opt(S.text()), off: S.opt(S.text()) },
  custom: { widget: S.ref('widget'), params: S.opt(S.any()) },
}
/** The complete resolved definition of an inline setting. */
export const SETTING = S.by('control', Object.fromEntries(Object.entries(CONTROL).map(([control, fields]) => [
  control, S.obj({ control: S.oneOf([control]), ...COMMON, ...fields }),
])))

const SETTING_FIELDS = { ...COMMON, ...Object.assign({}, ...Object.values(CONTROL)) }
/** Inline settings may inherit their control and constraints from an operation parameter. */
export const INLINE_SETTING = S.obj({
  control: S.opt(S.oneOf(Object.keys(CONTROL))),
  ...Object.fromEntries(Object.entries(SETTING_FIELDS).map(([key, schema]) => [key, S.opt(schema)])),
  remove: S.opt(S.list(WORD)),
})

const leaf = {
  value: S.obj({ show: S.oneOf(['value']), output: S.opt(LOCAL_NAME) }, { about: t('输出上的值') }),
  settings: S.obj({ show: S.oneOf(['settings']), keys: S.opt(S.list(LOCAL_NAME)) }, { about: t('设置的控件') }),
  setting: S.obj({ show: S.oneOf(['setting']), key: LOCAL_NAME, as: S.opt(S.oneOf(['control', 'label'])) }, { about: t('一个设置：控件，或此刻的值的字') }),
  summary: S.obj({ show: S.oneOf(['summary']), text: S.opt(S.text({ about: t('带 {设置} 的一句话') })) }, { about: t('一行设置摘要') }),
  readout: S.obj({ show: S.oneOf(['readout']), label: S.text(), expr: EXPR, unit: S.opt(S.text()), digits: S.opt(S.int({ min: 0, max: 8 })) }, { about: t('由设置算出的读数') }),
  action: S.obj({ show: S.oneOf(['action']), label: S.text(), set: S.map(EXPR, { about: t('设置 → 按下后的新值') }), when: S.opt(EXPR) }, { about: t('按下把几个设置改成算出的值') }),
  text: S.obj({ show: S.oneOf(['text']), text: S.text() }, { about: t('一段固定的字') }),
  desc: S.obj({ show: S.oneOf(['desc']) }, { about: t('元件的说明') }),
  ports: S.obj({ show: S.oneOf(['ports']) }, { about: t('输入口和输出口') }),
  widget: S.obj({ show: S.oneOf(['widget']), widget: S.ref('widget'), params: S.opt(S.any()) }, { about: t('领域的显示项') }),
}
/** The blocks a view is made of; a row puts some side by side. */
export const BLOCKS = Object.keys(leaf).concat('row')
const LEAF = S.by('show', leaf)
export const BLOCK = S.by('show', { ...leaf, row: S.obj({ show: S.oneOf(['row']), blocks: S.list(LEAF, { min: 1 }) }, { about: t('几个块排成一行') }) })
const VIEW = S.list(BLOCK)
/** Desktop card, phone tile and shared detail. */
export const FACES = ['card', 'tile', 'detail']

/** A rule: when setting `on` changes (any setting, without it), and `when` holds, the settings in `set` take new values. */
const RULE = S.obj({ on: S.opt(LOCAL_NAME), when: S.opt(EXPR), set: S.map(EXPR, { about: t('设置 → 新值的式子') }) })
/** A check: the settings must make `holds` true; else the card says `say`. */
const CHECK = S.obj({ holds: EXPR, say: S.text() })
const PORT = S.obj({ name: LOCAL_NAME, type: S.opt(S.ref('valueType')), label: S.opt(S.text()), about: S.opt(S.text()), optional: S.opt(S.bool({ about: t('可以不接：不接时运算在这里读到「—」') })) })
const REGION = S.obj({ name: LOCAL_NAME, type: S.opt(S.ref('valueType')), label: S.opt(S.text()), opens: S.opt(S.bool()), closes: S.opt(S.bool()), gives: S.opt(S.list(LOCAL_NAME)), when: S.opt(EXPR) })
const HOLES = { inputs: S.list(PORT), outputs: S.opt(S.list(PORT, { min: 2, about: t('几个输出时才写') })) }
const SETTINGS = {
  settings: S.opt(S.map(INLINE_SETTING, { keys: LOCAL_NAME.pattern })),
  rules: S.opt(S.list(RULE, { about: t('交互：一个设置改了，另几个跟着改') })),
  checks: S.opt(S.list(CHECK, { about: t('设置必须满足的条件：不满足时卡片上说出原因，元件不计算') })),
}
const PAINT = {
  icon: ICON,
  family: S.ref('family'),
  views: S.opt(S.obj({ card: S.opt(VIEW), tile: S.opt(VIEW), detail: S.opt(VIEW) }, { about: t('桌面卡片、手机格位、详情；不写用默认') })),
}

/** The faces every piece has, whatever its editor. */
const NAMED = {
  name: S.text(),
  desc: S.text({ about: t('只写功能：读哪些口、给出什么、碰到「—」怎么办') }),
}
/**
 * A primitive: it computes an expression over the domain's engine resources, or keeps an input (`keeps`): a sink that
 * stores what reaches `input` in the register its setting `register` names, read from the next tick on (held()).
 */
export const PRIMITIVE = S.obj({
  ...NAMED,
  ...HOLES,
  outputType: S.opt(S.ref('valueType')),
  ...SETTINGS,
  regions: S.opt(S.list(REGION)),
  ...PAINT,
  keeps: S.opt(S.obj({ input: LOCAL_NAME, register: LOCAL_NAME }, { about: t('把这个输入存进设置 register 说的寄存器，下一拍起读得到（held）；存的件不写 compute') })),
  compute: S.opt(S.either(EXPR, S.map(EXPR, { about: t('每个输出一个式子') }))),
  nulls: S.opt(S.oneOf(['give', 'pass'], { about: t('give：任何输入是「—」就给「—」（默认）；pass：交给运算') })),
})
/**
 * A built piece has named implementations. A task can publish player work to any one of them.
 */
const REFERENCE = S.obj(Object.fromEntries(PIECE_REFERENCE_FIELDS
  .map((key) => [key, S.opt(key === 'solution' ? S.board() : S.any())])),
{ about: t('可独立读取的参考作品和接口', 'A standalone reference work and its interface') })

export const INSIDE = S.list(S.obj({
  id: LOCAL_NAME,
  form: S.opt(LOCAL_NAME),
  label: S.opt(S.str({ about: t('这种形态在元件上叫什么') })),
  reference: REFERENCE,
}), { min: 1 })
export const BUILT = S.obj({
  ...NAMED,
  inputs: S.opt(S.list(PORT)),
  outputs: HOLES.outputs,
  outputType: S.opt(S.ref('valueType')),
  inside: INSIDE,
  card: S.opt(S.ref('op', { about: t('不跑内部的作品，照这个引擎资源跑（它能做的比证出的更多）；内部仍说它是什么、在哪里得到') })),
  ...SETTINGS,
  icon: S.opt(ICON),
  family: S.opt(S.ref('family')),
  views: PAINT.views,
})
/** A block on a strip: what it marks, an item of the domain's closed `mark` kind. */
export const STRIP = S.obj({
  editor: S.oneOf(['strip']),
  ...NAMED,
  icon: ICON,
  family: S.opt(S.ref('family')),
  mark: S.ref('mark', { about: t('这一块标出的是什么：领域给的一项') }),
})
/** The faces each editor reads: the circuit's a primitive (compute) or a built piece (inside), never both. */
export const EDITORS = { circuit: S.either(PRIMITIVE, BUILT), strip: STRIP }
/** A piece, by the editor it is made with: one of the editors' shapes. */
export const PART = S.either(...Object.values(EDITORS).flatMap((shape) => (shape.type === 'either' ? shape.of : [shape])))

/** A new piece of each editor, ready to fill in, where the domain's vocabulary gives what it is made of (null: not). */
export const BLANKS = {
  circuit: (vocabulary) => (vocabulary?.kinds.op ? { name: { en: 'New part' }, desc: { en: '' }, icon: 'Box', family: Object.keys(vocabulary.kinds.family ?? {})[0] ?? 'value', inputs: [{ name: 'a', type: 'circuit:number' }], outputType: 'circuit:number', compute: 'a' } : null),
  strip: (vocabulary) => (vocabulary?.kinds.mark ? { editor: 'strip', name: { en: 'New block' }, desc: { en: '' }, icon: 'Box', mark: Object.keys(vocabulary.kinds.mark)[0] } : null),
}
/** Whether a domain's games make pieces of some editor out of what its vocabulary gives: their content names them as parts. */
export const makesPieces = (vocabulary) => Object.values(BLANKS).some((blank) => blank(vocabulary))

/** Piece creation options read by authoring tools. A built piece needs a task before it has data. */
export function pieceCreationOptions(vocabulary, tasks = []) {
  const labels = { circuit: t('电路件', 'Circuit piece'), strip: t('词序条块', 'Strip piece') }
  const choices = Object.entries(BLANKS).flatMap(([value, blank]) => {
    const data = blank(vocabulary)
    return data ? [{ value, label: labels[value], data }] : []
  })
  if (tasks.length) choices.push({ value: 'task', label: t('用任务作品搭件', 'Build from a task') })
  return choices
}

export const builtPart = (reference, name) => ({ name: { en: name }, desc: { en: '' }, inside: [{ id: 'base', reference }] })

/** Assembled piece declarations, indexed by identity. */
export const PARTS_FILE = S.obj({
  parts: S.map(PART, { keys: NAME.pattern }),
})

/** Translate an assembled piece path into its per-object source filename. */
export function piecePath(path) {
  const match = /^\.parts\.([^.[\]]+)(.*)$/.exec(path)
  return match ? `pieces/${match[1]}.json${match[2]}` : `pieces${path}`
}
