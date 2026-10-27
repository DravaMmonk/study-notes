// 软件工厂's illustration, for the games hub and the game's map: the agent loop as a line drawing. A context goes into
// the model, its action goes out to a tool, the tool's result comes back round into the context; a dot keeps going
// round. Plain SVG drawn with the page's tokens, so it follows the theme.

const SVG = `
<svg viewBox="0 0 320 180" width="100%" style="display:block;height:auto" role="img" aria-label="agent loop">
  <defs>
    <marker id="loop-head" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M1 1 L7 4 L1 7" fill="none" stroke="var(--ink)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <path id="loop-path" d="M 160 38 C 250 38, 282 70, 282 96 C 282 128, 246 150, 160 150 C 74 150, 38 128, 38 96 C 38 70, 70 38, 160 38 Z"
        fill="none" stroke="none"/>
  <circle r="4.5" fill="var(--accent)">
    <animateMotion dur="6s" repeatCount="indefinite" rotate="auto"><mpath href="#loop-path"/></animateMotion>
  </circle>
  <g stroke="var(--ink)" stroke-width="1.6" fill="var(--paper)">
    <rect x="122" y="18" width="76" height="40" rx="9"/>
    <rect x="244" y="78" width="76" height="36" rx="8"/>
    <rect x="122" y="132" width="76" height="36" rx="8"/>
    <rect x="0" y="78" width="76" height="36" rx="8"/>
  </g>
  <g stroke="var(--ink)" stroke-width="1.4" fill="none" marker-end="url(#loop-head)">
    <path d="M 204 44 C 236 48, 262 60, 274 74"/>
    <path d="M 276 118 C 262 134, 236 146, 204 148"/>
    <path d="M 116 150 C 84 146, 58 134, 46 118"/>
    <path d="M 44 74 C 58 60, 84 48, 116 42"/>
  </g>
  <g font-family="var(--mono)" font-size="11" fill="var(--ink)" text-anchor="middle">
    <text x="160" y="42">model</text>
    <text x="282" y="100">read</text>
    <text x="160" y="154">test</text>
    <text x="38" y="100">context</text>
  </g>
</svg>`

/** Draws the figure into `host`; returns a function that takes it away. */
export function mountLoop(host) {
  const box = document.createElement('div')
  box.className = 'loop-host'
  box.style.width = '100%'
  box.innerHTML = SVG
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) box.querySelector('animateMotion')?.remove()
  host.appendChild(box)
  return () => box.remove()
}
