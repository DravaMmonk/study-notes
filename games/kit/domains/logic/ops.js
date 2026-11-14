// The logic domain's engine resources (games/DESIGN.md 6.8): what a game's parts.json calls, each with what it is and
// its arguments. The proof rules and the lemmas' run are proof.js's, with the options a proof card's settings offer.
import { LEMMA, OPTIONS, RULES, lemmaPieces } from './proof.js'
import { defineParts } from '../../engine/parts/define.js'

/** The resources by name: { about, args, run(args, named, ctx) }. */
export const OPS = { ...RULES, ...OPTIONS, lemma: LEMMA }
/** The same, as the vocabulary's items (what each is, without running it). */
export const OP_ITEMS = Object.fromEntries(Object.entries(OPS).map(([name, { run: _, ...item }]) => [name, item]))

/** A game's parts (../../engine/parts/define.js defineParts): its parts.json's, and those its lemmas make. */
export const partsOf = (partDefs, lemmas = {}) => defineParts({ ...partDefs, parts: { ...partDefs?.parts, ...lemmaPieces(lemmas) } }, OPS)
