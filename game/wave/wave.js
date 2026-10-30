// 车在说话's illustration, for the games hub and the game's map: three controllers hanging on one bus, and the bits on
// it going by as a waveform. Plain SVG drawn with the page's tokens, so it follows the theme.

// One frame's worth of bits, drawn twice so the wave scrolls without a seam.
const BITS = [1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]
const CELL = 16
const wave = (bits) => bits.map((b, k) => `${k ? 'L' : 'M'}${k * CELL},${b ? 0 : 18}L${(k + 1) * CELL},${b ? 0 : 18}`).join('')
const WIDTH = BITS.length * CELL

const SVG = `
<svg viewBox="0 0 320 180" width="100%" style="display:block;height:auto" role="img" aria-label="CAN bus">
  <defs><clipPath id="wave-clip"><rect x="20" y="20" width="280" height="40"/></clipPath></defs>
  <g clip-path="url(#wave-clip)">
    <path transform="translate(20,30)" d="${wave([...BITS, ...BITS])}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round">
      <animateTransform attributeName="transform" type="translate" from="20 30" to="${20 - WIDTH} 30" dur="8s" repeatCount="indefinite"/>
    </path>
  </g>
  <g stroke="var(--ink)" stroke-width="1.6" fill="none">
    <path d="M10 92 H310"/>
    <path d="M10 100 H310"/>
    <path d="M60 100 V122 M96 100 V122"/>
    <path d="M142 100 V122 M178 100 V122"/>
    <path d="M224 100 V122 M260 100 V122"/>
  </g>
  <g stroke="var(--ink)" stroke-width="1.6" fill="var(--paper)">
    <rect x="40" y="122" width="76" height="40" rx="8"/>
    <rect x="122" y="122" width="76" height="40" rx="8"/>
    <rect x="204" y="122" width="76" height="40" rx="8"/>
  </g>
</svg>`

/** Draws the figure into `host`; returns a function that takes it away. */
export function mountWave(host) {
  const box = document.createElement('div')
  box.className = 'wave-host'
  box.style.width = '100%'
  box.innerHTML = SVG
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) box.querySelector('animateTransform')?.remove()
  host.appendChild(box)
  return () => box.remove()
}
