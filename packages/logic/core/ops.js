// The logic domain's engine resources (games/DESIGN.md 6.8): what a game's parts.json calls, each with what it is and
// its arguments. The proof rules and the lemmas' run are proof.js's, with the options a proof card's settings offer;
// the machine board's parts and the rules a rule part offers are machine.js's.
import { signatures } from './signatures.js'
import { qualifyItems } from 'kernel'
import { LEMMA, OPTIONS, RULES, lemmaParts } from './proof.js'
import { MACHINE_PARTS, RULE_CHOICES } from './machine.js'
import { compileParts, defineParts } from 'circuit'

/** The resources by name: { about, args, run(args, named, ctx) }. */
const choiceResources = Object.fromEntries(Object.entries(signatures({ ...OPTIONS, ruleChoices: RULE_CHOICES }, 'logic:options')).map(([name, item]) => [name, {
  ...item,
  args: item.args.map((arg) => ({ ...arg, type: 'logic:judgment' })),
}]))

export const OPS = qualifyItems('logic', 'op', {
  ...signatures(RULES, 'logic:judgment'),
  ...signatures({ lemma: LEMMA }, 'logic:judgment'),
  ...signatures(MACHINE_PARTS, 'logic:machine-value'),
  ...choiceResources,
})
/** The same, as the vocabulary's items (what each is, without running it). */
export const OP_ITEMS = Object.fromEntries(Object.entries(OPS).map(([name, { run: _, ...item }]) => [name, item]))

/** A game's parts (../../engine/parts/define.js defineParts): its parts.json's, and those its lemmas make. */
export function partsOf(partDefs, lemmas = {}) {
  const authored = defineParts(partDefs, OPS)
  const generated = compileParts(lemmaParts(lemmas), OPS)
  const PARTS = { ...authored.PARTS, ...generated.PARTS }
  return {
    PARTS,
    defs: { ...authored.defs, ...generated.defs },
    defaultsOf: (type) => ({ ...(PARTS[type]?.defaults ?? {}) }),
  }
}
