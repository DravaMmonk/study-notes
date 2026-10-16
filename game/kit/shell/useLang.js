import { useSyncExternalStore } from 'react'
import { getLang } from './i18n.js'

const subscribe = (onChange) => {
  window.addEventListener('langchange', onChange)
  return () => window.removeEventListener('langchange', onChange)
}

/** The current language as React state, for components that must react to a switch themselves (a figure host that
 * has to be rebuilt in the new language). Everything else just re-renders with GameShell. */
export const useLang = () => useSyncExternalStore(subscribe, getLang, getLang)
