import { hidden } from './judge.js'
import { S, validate } from './schema.js'

export const TASK_BOARD_SECTIONS = ['title', 'brief', 'tip', 'hints', 'statement', 'readouts', 'extras']
const taskBoard = S.opt(S.list(S.oneOf(TASK_BOARD_SECTIONS)))
const fields = {
  checks: S.oneOf(['shown', 'hidden']),
  resources: S.str(),
  stage: S.str(),
  layout: S.str(),
  gives: S.opt(S.oneOf(['reference'])),
  taskBoard,
}
const label = S.obj({ zh: S.str(), en: S.str() })
const circuit = (judge, options = {}) => S.obj({
  editor: S.oneOf(['circuit']),
  judge: S.oneOf([judge]),
  resources: S.str(),
  label: S.opt(label),
  layout: S.opt(S.str()),
  results: S.opt(S.oneOf(['hidden'])),
  output: S.opt(S.oneOf(['target'])),
  tileSettings: S.opt(S.oneOf(['hidden'])),
  taskBoard,
  ...options,
})

export const PLAY = S.by('editor', {
  board: S.obj({
    editor: S.oneOf(['board']),
    judge: S.oneOf(['hand']),
    resources: S.str(),
    label,
    taskBoard,
    layout: S.obj({
      boardLabel: label,
      cardClass: S.str(),
      noteClass: S.str(),
      afterClass: S.str(),
      phoneClass: S.str(),
      desktopClass: S.str(),
      panelClass: S.str(),
    }),
  }),
  circuit: S.by('judge', {
    once: circuit('once'),
    steps: circuit('steps'),
    simulation: circuit('simulation'),
    cases: circuit('cases', { target: S.oneOf(['shown', 'hidden']) }),
    outputs: circuit('outputs', { checks: S.oneOf(['afterPass']) }),
  }),
  workshop: S.obj({
    editor: S.oneOf(['workshop']), judge: S.oneOf(['parameters', 'gridProbe']),
    resources: S.str(), layout: S.str(), pinOnPhone: S.bool(), taskBoard,
  }),
  tree: S.obj({ ...fields, editor: S.oneOf(['tree']), judge: S.oneOf(['once', 'check']) }),
  values: S.obj({ ...fields, editor: S.oneOf(['values']), judge: S.oneOf(['table']) }),
  fields: S.obj({ ...fields, editor: S.oneOf(['fields']), judge: S.oneOf(['rows']) }),
  scenario: S.obj({ ...fields, editor: S.oneOf(['scenario']), judge: S.oneOf(['steps']) }),
  checks: S.obj({ ...fields, editor: S.oneOf(['checks']), judge: S.oneOf(['boards']) }),
})

/** A play selects kernel components and names the domain resources they use. */
export function definePlays(plays) {
  for (const [name, play] of Object.entries(plays)) {
    const wrong = validate(PLAY, play)
    if (wrong.length) throw new Error(`play ${name}: ${wrong.map((issue) => issue.says).join('; ')}`)
  }
  return plays
}

export const playId = ({ kind, play }) => play ?? kind
export const playFor = (plays, task) => plays[playId(task)]

export const judgeFor = (play, judge) => play.checks === 'hidden' ? hidden(judge) : judge
