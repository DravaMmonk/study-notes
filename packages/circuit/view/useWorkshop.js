import { useEffect, useState } from 'react'
import { loadWorkshop, WORKSHOP_KEY } from "../core/workshop.js"

function read() {
  try { return loadWorkshop(window.localStorage) }
  catch { return loadWorkshop(null) }
}

export function useWorkshop() {
  const [library, setLibrary] = useState(read)
  useEffect(() => {
    const sync = (event) => {
      if (event.key === WORKSHOP_KEY || event.type === 'workshopchange') setLibrary(read())
    }
    window.addEventListener('storage', sync)
    window.addEventListener('workshopchange', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('workshopchange', sync)
    }
  }, [])
  function update(change) {
    try {
      const next = change(loadWorkshop(window.localStorage))
      window.localStorage.setItem(WORKSHOP_KEY, JSON.stringify(next))
      window.dispatchEvent(new Event('workshopchange'))
      return true
    } catch {
      return false
    }
  }
  return { library, update }
}
