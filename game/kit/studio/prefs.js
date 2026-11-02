// What a viewer's studio remembers in their own browser (localStorage, 'studio.<key>'): the panels' widths and which
// are open, the folded eras and sections. A convenience only: storage that throws or comes back empty (a private
// window, blocked site data) leaves the defaults.
import { useCallback, useState } from 'react'

const KEY = (key) => `studio.${key}`
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

export function readPref(key, fallback) {
  try {
    const raw = window.localStorage.getItem(KEY(key))
    const value = raw === null ? fallback : JSON.parse(raw)
    // An object kept by an older page gains the fields added since.
    return isObj(fallback) && isObj(value) ? { ...fallback, ...value } : value
  } catch {
    return fallback
  }
}

export function writePref(key, value) {
  try {
    window.localStorage.setItem(KEY(key), JSON.stringify(value))
  } catch {
    // Not kept: the page goes on with what it has.
  }
}

/** A state kept under `key`: [value, set] like useState's, written through on every set. */
export function usePref(key, fallback) {
  const [value, setValue] = useState(() => readPref(key, fallback))
  const set = useCallback((next) => setValue((old) => {
    const v = typeof next === 'function' ? next(old) : next
    writePref(key, v)
    return v
  }), [key])
  return [value, set]
}
