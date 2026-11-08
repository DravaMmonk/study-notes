// A height field matching the white bump in the image domain: height 3, radius 6, on a flat plate.
// The oblique view makes its slope visible; the lamp and camera face the plate along the z axis.
const height = (x, y) => {
  const d = (x * x + y * y) / 36
  return d < 1 ? 3 * (1 - d) ** 2 : 0
}
const project = (x, y, z) => [220 + (x - y) * 7, 163 + (x + y) * 3.1 - z * 13]
const point = (x, y, z) => project(x, y, z).map((v) => v.toFixed(1)).join(',')
const arrow = (x, y) => {
  const e = 0.01
  const dx = (height(x + e, y) - height(x - e, y)) / (2 * e)
  const dy = (height(x, y + e) - height(x, y - e)) / (2 * e)
  const len = Math.hypot(dx, dy, 1)
  const z = height(x, y)
  return `<line x1="${project(x, y, z)[0]}" y1="${project(x, y, z)[1]}" x2="${project(x - dx / len * 3.2, y - dy / len * 3.2, z + 3.2 / len)[0]}" y2="${project(x - dx / len * 3.2, y - dy / len * 3.2, z + 3.2 / len)[1]}" class="normal" marker-end="url(#normal-tip)"/>`
}
const contours = [2, 4, 6].map((r) => {
  const points = Array.from({ length: 65 }, (_, i) => {
    const angle = 2 * Math.PI * i / 64
    const x = r * Math.cos(angle), y = r * Math.sin(angle)
    return point(x, y, height(x, y))
  })
  return `<polyline points="${points.join(' ')}" fill="none" stroke="#9ba2a8" stroke-opacity=".55" stroke-width="1"/>`
}).join('')
const mesh = () => {
  const cells = []
  const n = 24
  const step = 16 / n
  for (let iy = 0; iy < n; iy++) for (let ix = 0; ix < n; ix++) {
    const x = -8 + ix * step, y = -8 + iy * step
    const points = [[x, y], [x + step, y], [x + step, y + step], [x, y + step]]
    const z = height(x + step / 2, y + step / 2)
    const shade = Math.round(215 + 25 * z / 3)
    cells.push({ depth: x + y, svg: `<polygon points="${points.map(([a, b]) => point(a, b, height(a, b))).join(' ')}" fill="rgb(${shade},${shade},${shade})"/>` })
  }
  return cells.sort((a, b) => a.depth - b.depth).map((cell) => cell.svg).join('')
}
export const meta = { id: 'surface-bump', title: '白色鼓包', titleEn: 'White bump' }
export const css = `.bump-svg{display:block;width:100%;height:auto;max-height:270px;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.bump-svg text{fill:var(--anatomy-text)}.bump-svg .normal{stroke:#c17d1e;stroke-width:2.5}.bump-svg .light{stroke:#d6a43e;stroke-width:2.4;stroke-dasharray:5 4}.bump-svg .callout{stroke:var(--anatomy-muted);stroke-width:1.2;fill:none}.bump-svg .outline{fill:none;stroke:#8b9298;stroke-width:1.4}.bump-svg .sub{font-size:12px;fill:var(--anatomy-muted)}`
export function render({ lang = 'zh' } = {}) {
  const zh = lang === 'zh'
  const label = (a, b) => zh ? a : b
  return `<svg class="bump-svg" viewBox="0 0 440 270" role="img" aria-label="${label('倾斜视角看到平板上的鼓包；灯和相机位于表面正前方，箭头表示法线。', 'An oblique view of a bump on a plate. The lamp and camera face the surface, and arrows show normals.')}" xmlns="http://www.w3.org/2000/svg">
    <defs><marker id="normal-tip" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#c17d1e"/></marker><marker id="light-tip" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#d6a43e"/></marker></defs>
    <path d="M108 163 L220 113 L332 163 L220 213 Z" fill="#aeb4ba" transform="translate(0 5)"/>
    ${mesh()}${contours}<path d="M108 163 L220 113 L332 163 L220 213 Z" class="outline"/>
    <line class="light" x1="${project(-6,1,9)[0]}" y1="${project(-6,1,9)[1]}" x2="${project(-6,1,height(-6,1)+0.4)[0]}" y2="${project(-6,1,height(-6,1)+0.4)[1]}" marker-end="url(#light-tip)"/>
    <line class="light" x1="${project(5,-3,9)[0]}" y1="${project(5,-3,9)[1]}" x2="${project(5,-3,height(5,-3)+0.4)[0]}" y2="${project(5,-3,height(5,-3)+0.4)[1]}" marker-end="url(#light-tip)"/>
    ${arrow(0,0)}${arrow(3,0)}
    <text x="18" y="35">${label('灯与相机在正面', 'Lamp and camera face the surface')}</text><path class="callout" d="M85 42 L135 55"/>
    <text x="291" y="90">${label('法线', 'Normals')}</text><path class="callout" d="M290 95 L248 116"/>
    <text x="26" y="237">${label('白色平板上的鼓包', 'A bump on a white plate')}</text><path class="callout" d="M175 225 L195 193"/>
    <text class="sub" x="220" y="255" text-anchor="middle">${label('斜着看，才能看清表面起伏', 'Oblique view reveals the surface shape')}</text>
  </svg>`
}
export function mount() {}
