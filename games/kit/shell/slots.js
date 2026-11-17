// A task's saved works: the player may keep several boards for one task (a level's, for a level of one) and switch
// between them. `id` is the task's key (progress.js taskKey). The one being played is its data (progress.data[id]), as
// always; the others wait in progress.slots[id]:
//
//   { at: index of the one played, lastNo: last number assigned, list: [{ no, name, data? }] }
//
// `no` is unique among a task's current slots: it names an unnamed slot ("电路 2") and tells the shell when the board
// on screen must start over. Numbers are not reused while the task's slots are kept. A slot waiting holds its data; the one
// played holds none (its data is the task's). A task with no record has one slot, its data.

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

/** Save to the board the editor opened, even if another page selected a different slot. */
export function saveSlot(progress, id, index, data) {
  const slots = slotsOf(progress, id)
  const { at, list } = slots
  if (index === at) return { ...progress, data: { ...progress.data, [id]: data } }
  const slot = { ...list[index], data }
  return { ...progress, slots: { ...progress.slots, [id]: { ...slots, list: replaced(list, index, slot) } } }
}

// Play slot k of the list: its data becomes the level's, and it keeps none of its own.
const play = (progress, id, slots, list, k) => {
  const { data, ...slot } = list[k]
  return put(progress, id, { ...slots, at: k, list: replaced(list, k, slot) }, data)
}

/** Play slot k, keeping the one played so far. */
export function openSlot(progress, id, k) {
  const slots = slotsOf(progress, id)
  if (k === slots.at) return progress
  return play(progress, id, slots, stashed(progress, id), k)
}

/** A new slot, played at once: a fresh board, or with `copy` the board played so far. */
export function addSlot(progress, id, { copy = false, from } = {}) {
  const slots = slotsOf(progress, id)
  const list = stashed(progress, id)
  const no = (slots.lastNo ?? Math.max(...list.map((s) => s.no))) + 1
  const original = from === undefined ? list[slots.at] : list.find((slot) => slot.no === from)
  if (copy && !original) return progress
  return play(progress, id, { ...slots, lastNo: no }, [...list, { no, name: '', data: copy ? clone(original.data) : undefined }], list.length)
}

export function renameSlot(progress, id, k, name) {
  const slots = slotsOf(progress, id)
  return { ...progress, slots: { ...progress.slots, [id]: { ...slots, list: replaced(slots.list, k, { ...slots.list[k], name: name.trim() }) } } }
}

/** Slot k gone (never the last one); if it was played, the one before it (or after, for the first) is played instead. */
export function dropSlot(progress, id, k) {
  const slots = slotsOf(progress, id)
  const { at, list } = slots
  if (list.length < 2) return progress
  const remaining = { ...slots, lastNo: slots.lastNo ?? Math.max(...list.map((s) => s.no)) }
  if (k !== at) return { ...progress, slots: { ...progress.slots, [id]: { ...remaining, at: at - (k < at ? 1 : 0), list: without(list, k) } } }
  return play(progress, id, remaining, without(list, k), Math.max(0, k - 1))
}
