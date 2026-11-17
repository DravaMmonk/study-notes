import { T } from 'kernel'

/** The line, as the card that hears it and the results name it. */
export const LINE = T('线')

/** The line made of what the nodes said this tick ([0 | 1 | undefined]). */
export const lineOf = (said) => (said.some((v) => v === 1) ? 1 : 0)

/** A test's line as content writes it ("0110", one character a tick: 0, 1, or . for nothing said) as values. */
export const bitsOf = (text) => [...text].map((c) => (c === '.' ? undefined : Number(c)))

/** A node of the world saying a run of bits, one a tick (nothing once they run out). */
export const sayer = (id, bits) => ({ id, say: (tick) => bits[tick], hear: () => null })
