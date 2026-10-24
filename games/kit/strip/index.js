// The strip (React): what is being built, written out as it reads, with a framed box for each empty place, filled by
// tapping chips (natural display, as a calculator writes a formula). For levels that build a sequence or a small tree
// (a sentence, a formula, a command line) rather than a data flow, where a circuit's wires would be heavier than the
// idea. A game brings its line, chips and the rule for what goes where (useStrip `put`).
export { Chips, Strip } from './Strip.jsx'
export { useStrip } from './useStrip.js'
export { holeTree } from './tree.js'
