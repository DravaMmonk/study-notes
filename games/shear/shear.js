// 线性之格's illustration, for the games hub and the game's map: the grid of the plane with its two unit arrows,
// pushed aslant by a shear and back again. Plain SVG drawn with the page's tokens, so it follows the theme.

const STEP = 30
const lines = []
for (let k = -5; k <= 5; k += 1) {
  lines.push(`<path d="M${k * STEP} ${-3 * STEP} V${3 * STEP}"/>`)
  if (Math.abs(k) <= 3) lines.push(`<path d="M${-5 * STEP} ${k * STEP} H${5 * STEP}"/>`)
}
const arrow = (x, y, colour) => `<g stroke="${colour}" fill="${colour}" stroke-width="2.6" stroke-linecap="round"><path d="M0 0 L${x * 0.82} ${y * 0.82}"/><path stroke="none" d="M${x} ${y} L${x * 0.78 - y * 0.12} ${y * 0.78 + x * 0.12} L${x * 0.78 + y * 0.12} ${y * 0.78 - x * 0.12} Z"/></g>`

const SVG = `
<svg viewBox="0 0 320 180" width="100%" style="display:block;height:auto" role="img" aria-label="A sheared grid">
  <defs><clipPath id="shear-clip"><rect x="10" y="10" width="300" height="160" rx="10"/></clipPath></defs>
  <g clip-path="url(#shear-clip)">
    <g transform="translate(160 90) scale(1 -1)">
      <g stroke="var(--line)" stroke-width="1" fill="none">${lines.join('')}</g>
      <g>
        <animateTransform attributeName="transform" type="skewX" values="0;-32;0;24;0" keyTimes="0;0.3;0.5;0.8;1" dur="9s" repeatCount="indefinite"/>
        <g stroke="var(--w0)" stroke-width="1.3" fill="none" opacity="0.55">${lines.join('')}</g>
        <path d="M0 0 H${STEP * 2} V${STEP * 2} H0 Z" fill="var(--w0)" opacity="0.14"/>
        ${arrow(STEP * 2, 0, 'var(--w3)')}
        ${arrow(0, STEP * 2, 'var(--w1)')}
      </g>
    </g>
  </g>
  <rect x="10" y="10" width="300" height="160" rx="10" fill="none" stroke="var(--ink)" stroke-width="1.6"/>
</svg>`

/** Draws the figure into `host`; returns a function that takes it away. */
export function mountShear(host) {
  const box = document.createElement('div')
  box.className = 'shear-host'
  box.style.width = '100%'
  box.innerHTML = SVG
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) box.querySelector('animateTransform')?.remove()
  host.appendChild(box)
  return () => box.remove()
}
