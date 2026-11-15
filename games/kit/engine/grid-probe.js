import { keyOf } from '../shell/i18n.js'
import { isGrid } from './grid.js'

function readable(value) {
  if (!isGrid(value) || value.w < 1 || value.h < 1) return false
  const channels = value.c ?? 1
  if ((channels !== 1 && channels !== 3) || value.data.length !== value.w * value.h * channels) return false
  for (const channel of value.data) if (!Number.isFinite(channel)) return false
  return true
}

/** A black box and its answer key, used by the screen and the content checker. */
export function gridProbe({ examples, run, question, answers, answer, wrong }) {
  const judge = (choice) => keyOf(choice) === answer
  const verify = () => {
    if (examples.length === 0) return 'Needs a sample image'
    if (new Set(examples.map(({ label }) => keyOf(label))).size !== examples.length) return 'Sample labels must be distinct'
    if (answers.length < 2 || new Set(answers.map(keyOf)).size !== answers.length) return 'Needs at least two distinct choices'
    if (!answers.some(judge)) return 'The correct answer is missing from the choices'
    for (const { label, input } of examples) {
      const name = keyOf(label)
      if (!readable(input)) return `${name}: input must be a readable grid`
      try {
        if (!readable(run(input))) return `${name}: output must be a readable grid`
      } catch (error) {
        return `${name}: the black box could not run (${error instanceof Error ? error.message : String(error)})`
      }
    }
    return ''
  }
  return { examples, run, question, answers, judge, wrong, verify }
}
