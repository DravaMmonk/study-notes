// A level's saved circuits: the player may keep several boards for one level and switch between them. The one being
// played is the level's data (progress.data[id]), as always; the others wait in progress.slots[id]:
//
//   { at: index of the one played, list: [{ no, name, data? }] }
//
// `no` is a slot's own number, never reused within a level: it names an unnamed slot ("电路 2") and tells the shell
// when the board on screen must start over. A slot waiting holds its data; the one played holds none (its data is the
// level's). A level with no record has one slot, the level's data.

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)))

/** The level's slots, as stored or the single one every level starts with. */
export const slotsOf = (progress, id) => progress.slots?.[id] ?? { at: 0, list: [{ no: 1, name: '' }] }

// The slots after a change, and the data played after it (undefined: the level starts its board afresh).
function put(progress, id, slots, data) {
  const out = { ...progress, slots: { ...progress.slots, [id]: slots }, data: { ...progress.data } }
  if (data === undefined) delete out.data[id]
  else out.data[id] = data
  return out
}

// The list with the slot played holding the level's data, ready for another to be played.
const stashed = (progress, id) => {
  const { at, list } = slotsOf(progress, id)
  return list.map((slot, k) => (k === at ? { ...slot, data: progress.data[id] } : slot))
}
// (Plain array methods only: Array.prototype.with and toSpliced break older iOS Safari.)
const replaced = (list, k, slot) => list.map((s, j) => (j === k ? slot : s))
const without = (list, k) => list.filter((_, j) => j !== k)
// Play slot k of the list: its data becomes the level's, and it keeps none of its own.
const play = (progress, id, list, k) => {
  const { data, ...slot } = list[k]
  return put(progress, id, { at: k, list: replaced(list, k, slot) }, data)
}

/** Play slot k, keeping the one played so far. */
export function openSlot(progress, id, k) {
  if (k === slotsOf(progress, id).at) return progress
  return play(progress, id, stashed(progress, id), k)
}

/** A new slot, played at once: a fresh board, or with `copy` the board played so far. */
export function addSlot(progress, id, { copy = false } = {}) {
  const list = stashed(progress, id)
  const no = Math.max(...list.map((s) => s.no)) + 1
  return play(progress, id, [...list, { no, name: '', data: copy ? clone(progress.data[id]) : undefined }], list.length)
}

export function renameSlot(progress, id, k, name) {
  const slots = slotsOf(progress, id)
  return { ...progress, slots: { ...progress.slots, [id]: { ...slots, list: replaced(slots.list, k, { ...slots.list[k], name: name.trim() }) } } }
}

/** The key a board's last run is kept under in progress.runs[id]: the task it is on and its slot's number. */
export const runKey = (task, no) => `${task}#${no}`

// The level's kept runs without those of slot number `no`.
const runsWithout = (progress, id, no) => {
  const kept = progress.runs?.[id]
  if (!kept) return progress.runs
  return { ...progress.runs, [id]: Object.fromEntries(Object.entries(kept).filter(([key]) => !key.endsWith(`#${no}`))) }
}

/** Slot k gone (never the last one), with its kept runs; if it was played, the one before it (or after, for the
 *  first) is played instead. */
export function dropSlot(progress, id, k) {
  const { at, list } = slotsOf(progress, id)
  if (list.length < 2) return progress
  const out = { ...progress, runs: runsWithout(progress, id, list[k].no) }
  if (k !== at) return { ...out, slots: { ...progress.slots, [id]: { at: at - (k < at ? 1 : 0), list: without(list, k) } } }
  return play(out, id, without(list, k), Math.max(0, k - 1))
}
