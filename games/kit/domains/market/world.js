// The market a board sets prices in: a street of shops, each taking in the same stock every tick and facing a demand
// that falls as its price rises. A shop's buyers at price p are top − slope × p, to the nearest whole one and never
// fewer than none; `shifts` move `top` from a tick on (a fashion, a rival opening). What is not sold by the end of a
// tick is gone. The board never sees the demand: only, the tick after, how much was left and how many went without.
//
//   shop    { stock, top, slope, shifts?: [{ at, top }] }
//   trade(shop, tick, price) → { price, sold, left, short, earned }   one tick of one shop

/** How many would buy at no price at tick `tick`: the shop's `top`, or the last shift's by then. */
export const topAt = (shop, tick) => (shop.shifts ?? []).filter((s) => s.at <= tick).at(-1)?.top ?? shop.top

/** How many would buy at `price` at tick `tick`. */
export function demand(shop, tick, price) {
  return Math.max(0, topAt(shop, tick) - shop.slope * price)
}

/** One tick of a shop at `price`; no price (「—」, or none above 0) keeps it shut: nothing sold, nobody turned away. */
export function trade(shop, tick, price) {
  if (typeof price !== 'number' || !(price > 0)) return { price: null, sold: 0, left: shop.stock, short: 0, earned: 0 }
  const wanted = demand(shop, tick, price)
  const sold = Math.min(shop.stock, wanted)
  return { price, sold, left: shop.stock - sold, short: wanted - sold, earned: price * sold }
}

/** What a street's cards are called: one shop's are was (its price the tick before), left, short and price; several
 * number theirs from 1. */
export const portsOf = (count) => Array.from({ length: count }, (_, k) => {
  const n = count === 1 ? '' : String(k + 1)
  return { was: `was${n}`, left: `left${n}`, short: `short${n}`, price: `price${n}` }
})
