// Bind the headless play declarations to the browser's renderers and icons.
export function bindPlays(plays, renderers, icons) {
  return Object.fromEntries(Object.entries(plays).map(([name, play]) => {
    const Screen = Object.hasOwn(renderers, play.view) && renderers[play.view]
    if (typeof Screen !== 'function') throw new Error(`Play "${name}" has no renderer for "${play.view}"`)
    const icon = Object.hasOwn(icons, play.icon) && icons[play.icon]
    if (!icon) throw new Error(`Play "${name}" has no icon for "${play.icon}"`)
    return [name, { ...play, Screen, icon }]
  }))
}
