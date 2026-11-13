import { hidden } from './judge.js'
import { S, validate } from './schema.js'

const fields = {
  checks: S.oneOf(['shown', 'hidden']),
  resources: S.str(),
  stage: S.str(),
  layout: S.str(),
  gives: S.opt(S.oneOf(['reference'])),
}
export const PLAY = S.by('editor', {
  tree: S.obj({ ...fields, editor: S.oneOf(['tree']), judge: S.oneOf(['once']) }),
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

export function playFor(plays, { kind, play }) {
  return plays[play ?? kind]
}

export const judgeFor = (play, judge) => play.checks === 'hidden' ? hidden(judge) : judge
