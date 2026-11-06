// The __name__ world: one line shared by the nodes, a bit a tick (../../engine/ticks.js). The line is 1 when any node
// says 1 and 0 when every node says 0 or nothing: a line nobody drives reads 0. The world's own node says the bits a
// test writes for it; the player's board is one more node on the line, saying what reaches its `say` card.
//
// Replace the rule (lineOf) and the world (the test's `line`) with the topic's own: a CAN bus is dominant when anyone
// says dominant (../domains/can/bus.js); a wire carries one sender's bits to the far end after a delay.

import { T } from '../../shell/i18n.js'

/** The line, as the card that hears it and the results name it. */
export const LINE = T('线', 'Line')

/** The line made of what the nodes said this tick ([0 | 1 | undefined]). */
export const lineOf = (said) => (said.some((v) => v === 1) ? 1 : 0)

/** A test's line as content writes it ("0110", one character a tick: 0, 1, or . for nothing said) as values. */
export const bitsOf = (text) => [...text].map((c) => (c === '.' ? undefined : Number(c)))

/** A node of the world saying a run of bits, one a tick (nothing once they run out). */
export const sayer = (id, bits) => ({ id, say: (tick) => bits[tick], hear: () => null })
