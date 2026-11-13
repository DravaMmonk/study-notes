// A bit travelling along a point-to-point link on the games hub.
const SVG = `<svg viewBox="0 0 320 180" width="100%" aria-hidden="true">
  <path d="M32 55h32V35h32v20h32V35h64v20h32V35h32v20h32" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
  <g fill="var(--paper)" stroke="var(--ink)" stroke-width="1.6">
    <rect x="32" y="102" width="76" height="50" rx="8"/>
    <rect x="212" y="102" width="76" height="50" rx="8"/>
    <path d="M108 127h104"/>
    <path d="M61 133v-12h18v12zM241 133v-12h18v12z"/>
  </g>
  <path d="m167 121 6 6-6 6" fill="none" stroke="var(--accent)" stroke-width="2"/>
</svg>`

export function mountWire(host) {
  host.innerHTML = SVG
  const figure = host.firstElementChild
  return () => figure.remove()
}
