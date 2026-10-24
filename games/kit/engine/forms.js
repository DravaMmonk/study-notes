// A part with several shapes (forms), switched by an option on its card: node.params.form names the form (the first
// when unset). Each form is a part of its own (inputs, params, eval…); the part with forms reads its ports and settings
// and computes as the chosen one does. Which forms a card offers is the game's to say: a form a part gains along the
// course comes as an upgrade (shell/index.js, revisions with `by` and `forms`).
import { portsOf } from './circuit.js'

/** A part's settings for a node: `params` as a list, or a function of the node. */
export const paramsOf = (part, node) => (typeof part?.params === 'function' ? part.params(node) : part?.params ?? [])

/** The form a node of a part with forms is in (null for a part without forms). */
export const formOf = (part, node) => (part?.forms ? (part.forms.includes(node?.params?.form) ? node.params.form : part.forms[0]) : null)

/** One part made of forms [{ key, …part }], the first the default. */
export function formed(forms) {
  const byKey = new Map(forms.map((f) => [f.key, f]))
  const pick = (node) => byKey.get(node?.params?.form) ?? forms[0]
  return {
    forms: forms.map((f) => f.key),
    inputs: (node) => portsOf(pick(node), node),
    params: (node) => paramsOf(pick(node), node),
    eval: (ins, node, ctx, key) => pick(node).eval(ins, node, ctx, key),
  }
}
