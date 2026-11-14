// The schema of a game's parts.json (games/DESIGN.md 6.8): the parts a game's course starts from, as data — their
// ports, their settings (one of the kernel controls), what they compute (an expression over the domain's engine
// resources, expr.js) and their three views — and setting presets several parts share. The schema is the kernel's, the
// same in every domain whose vocabulary has engine resources (the `op` kind); what it names (resources, families,
// widgets) the domain's vocabulary gives.
import { S } from '../schema.js'
import { TASK_ID } from '../tasks.js'
import { T as t } from '../../shell/i18n.js'


export const NAME = S.str({ pattern: '^[A-Za-z_][A-Za-z0-9_]*$', about: t('ASCII 名字：字母或下划线开头') })
const WORD = S.str({ pattern: '^[A-Za-z0-9_][A-Za-z0-9_.-]*$', about: t('ASCII 值：写进蓝图文本') })
export const EXPR = S.str({ view: 'expr', about: t('一行式子：调用领域的引擎资源') })
export const ICON = S.str({ view: 'icon', about: t('内核图标表里的一个名字') })

/** The controls a setting is edited with (../../shell/parts/SettingField.jsx). */
export const CONTROLS = ['select', 'buttons', 'number', 'slider', 'toggle', 'list', 'tree', 'custom']
/** The layouts of a group of small buttons. */
export const LAYOUTS = ['row', 'column', 'grid', 'pad']

const OPTION = S.obj({ value: WORD, label: S.opt(S.text()), icon: S.opt(ICON), about: S.opt(S.text({ about: t('这个选项做什么，一句完整的话：选项开放后接在元件说明后面') })) })
const OPTIONS = S.list(OPTION, { min: 1 })
const COMMON = {
  label: S.opt(S.textKind('settingLabel')),
  about: S.opt(S.text({ about: t('悬停和详情里的一行说明') })),
  default: S.opt(S.any({ about: t('新元件的值') })),
  when: S.opt(S.str({ view: 'expr', about: t('式子：为真时才出现（只读设置）') })),
  fixed: S.opt(S.bool({ about: t('只显示，玩家不能改') })),
}
const RANGE = { min: S.opt(S.num()), max: S.opt(S.num()), step: S.opt(S.num({ min: 0 })), unit: S.opt(S.text()) }
// Options are written out, or worked out by an expression on the card's inputs (`from`: a resource giving [{ value, label }]).
const FROM = S.opt(S.str({ view: 'expr', about: t('式子：由元件的输入算出选项') }))
const CONTROL = {
  select: { options: S.opt(OPTIONS), from: FROM },
  list: { options: S.opt(OPTIONS), from: FROM },
  tree: { optional: S.opt(S.bool({ about: t('可以不填') })) },
  buttons: { options: S.opt(OPTIONS), from: FROM, layout: S.opt(S.oneOf(LAYOUTS, { about: t('row 一行，column 一列，grid 两两一行，pad 上下左右四向（选项 up、left、right、down）') })) },
  number: { ...RANGE, integer: S.opt(S.bool()), stepper: S.opt(S.bool({ about: t('两边加 − / + 按钮') })) },
  slider: { ...RANGE, min: S.num(), max: S.num(), marks: S.opt(S.list(S.num(), { about: t('刻度') })) },
  toggle: { on: S.opt(S.text()), off: S.opt(S.text()) },
  custom: { widget: S.ref('widget'), params: S.opt(S.any()) },
}
const controlled = (fields) => S.by('control', Object.fromEntries(CONTROLS.map((c) => [c, S.obj({ ...fields, control: S.oneOf([c]), ...COMMON, ...CONTROL[c] })])))

/** A preset: a whole setting but for its key, which each part using it gives. */
export const PRESET = controlled({})
/** A part's setting: a whole one, or a preset (`use`) with some of its fields written over. */
export const SETTING = S.either(
  controlled({ key: NAME }),
  S.obj({ key: NAME, use: NAME, ...COMMON, options: S.opt(OPTIONS), ...RANGE }, { about: t('取一份预设，再覆盖几项') }),
)

const leaf = {
  value: S.obj({ show: S.oneOf(['value']), output: S.opt(NAME) }, { about: t('输出上的值') }),
  settings: S.obj({ show: S.oneOf(['settings']), keys: S.opt(S.list(NAME)) }, { about: t('设置的控件') }),
  setting: S.obj({ show: S.oneOf(['setting']), key: NAME, as: S.opt(S.oneOf(['control', 'label'])) }, { about: t('一个设置：控件，或此刻的值的字') }),
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
const RULE = S.obj({ on: S.opt(NAME), when: S.opt(EXPR), set: S.map(EXPR, { about: t('设置 → 新值的式子') }) })
/** A check: the settings must make `holds` true; else the card says `say`. */
const CHECK = S.obj({ holds: EXPR, say: S.text() })
const PORT = S.obj({ name: NAME, label: S.opt(S.textKind('portLabel')), about: S.opt(S.text()), optional: S.opt(S.bool({ about: t('可以不接：不接时运算在这里读到「—」') })) })
const REGION = S.obj({ name: NAME, label: S.opt(S.textKind('regionLabel')), opens: S.opt(S.bool()), closes: S.opt(S.bool()), gives: S.opt(S.list(NAME)), when: S.opt(EXPR) })
const HOLES = { inputs: S.list(PORT), outputs: S.opt(S.list(PORT, { min: 2, about: t('几个输出时才写') })) }
const SETTINGS = {
  settings: S.opt(S.list(SETTING)),
  rules: S.opt(S.list(RULE, { about: t('交互：一个设置改了，另几个跟着改') })),
  checks: S.opt(S.list(CHECK, { about: t('设置必须满足的条件：不满足时卡片上说出原因，元件不计算') })),
}
const PAINT = {
  icon: ICON,
  family: S.ref('family'),
  views: S.opt(S.obj({ card: S.opt(VIEW), tile: S.opt(VIEW), detail: S.opt(VIEW) }, { about: t('桌面卡片、手机格位、详情；不写用默认') })),
}

export const PART = S.obj({
  name: S.textKind('partName'),
  desc: S.textKind('partDescription', { about: t('只写功能：读哪些口、给出什么、碰到「—」怎么办') }),
  ...HOLES,
  ...SETTINGS,
  regions: S.opt(S.list(REGION)),
  inside: S.opt(S.obj({ task: S.str({ pattern: TASK_ID }) })),
  ...PAINT,
  keeps: S.opt(S.list(NAME)),
  compute: S.either(EXPR, S.map(EXPR, { about: t('每个输出一个式子') })),
  nulls: S.opt(S.oneOf(['give', 'pass'], { about: t('give：任何输入是「—」就给「—」（默认）；pass：交给运算') })),
})

/** parts.json. */
export const PARTS_FILE = S.obj({
  presets: S.opt(S.map(PRESET, { keys: '^[A-Za-z_][A-Za-z0-9_]*$', about: t('几个元件共用的设置') })),
  parts: S.map(PART, { keys: '^[A-Za-z_][A-Za-z0-9_]*$' }),
})
