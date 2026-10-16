import { cameraOf, depthOf } from './kit/iso-kit.js'

// Shared live behaviour for every figure: one rAF loop that sleeps when settled or offscreen,
// exponential follow, springs, and pointer → floor-plane mapping.

export const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

export function follow(value, target, dt, tau, calm) {
  if (calm) return target
  const next = value + (target - value) * (1 - Math.exp(-dt / tau))
  return Math.abs(target - next) < 0.01 ? target : next
}

// Sub-stepped spring on { at, rate }. Returns true while still moving.
export function spring(state, target, dt, stiff, drag, calm) {
  if (calm) {
    state.at = target
    state.rate = 0
    return false
  }
  for (let step = 0; step < 4; step++) {
    state.rate += ((target - state.at) * stiff - state.rate * drag) * (dt / 4)
    state.at += state.rate * (dt / 4)
  }
  if (Math.abs(target - state.at) < 0.005 && Math.abs(state.rate) < 0.005) {
    state.at = target
    state.rate = 0
    return false
  }
  return true
}

export const byDepth = (P) => (points) => [...points].sort((a, b) => depthOf([a[0], a[1], a[2] ?? 0], P) - depthOf([b[0], b[1], b[2] ?? 0], P))

// Screen (viewBox) point → world point on the horizontal plane at height z.
export function floorPoint([sx, sy], z, P) {
  const { sinA, cosA, sinE, cosE, k } = cameraOf(P)
  const a = (sx - P.origin[0]) / k
  const c = ((sy - P.origin[1]) / k + z * cosE) / sinE
  return [a * sinA + c * cosA, -a * cosA + c * sinA]
}

export function viewBoxPoint(svg, event) {
  const matrix = svg.getScreenCTM()
  if (!matrix) return [0, 0]
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
  return [point.x, point.y]
}

// The loop: tick(dt, calm) returns true while anything still moves.
export function createLoop(stage, tick) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0
  let last = 0
  let visible = false
  let stopped = false
  const step = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60
    last = now
    const moving = tick(dt, still.matches)
    frame = visible && moving && !stopped ? requestAnimationFrame(step) : 0
  }
  const run = () => {
    if (!frame && visible && !stopped) {
      last = 0
      frame = requestAnimationFrame(step)
    }
  }
  const observer = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting
    if (visible) run()
  }, { rootMargin: '120px 0px' })
  observer.observe(stage)
  return {
    run,
    still,
    stop() {
      stopped = true
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    },
  }
}

// Idle tour: resumes a while after the last interaction.
export function createIdle(onResume, delay = 3600) {
  let timer = 0
  return {
    touch() {
      window.clearTimeout(timer)
      timer = window.setTimeout(onResume, delay)
    },
    clear() {
      window.clearTimeout(timer)
    },
  }
}

// Re-append DOM nodes into `parent` only when their order changed.
export function applyOrder(parent, nodes) {
  const current = parent.children
  let same = current.length === nodes.length
  for (let index = 0; same && index < nodes.length; index++) same = current[index] === nodes[index]
  if (same) return
  const fragment = document.createDocumentFragment()
  nodes.forEach((node) => fragment.append(node))
  parent.append(fragment)
}

export const svgNode = (markup) => {
  const template = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  template.innerHTML = markup
  return template
}

// The reading language the host passes in ('zh' | 'en'): t(lang, '中文', 'English').
// Figures render once per language; the host rebuilds a figure to switch it.
export const t = (lang, zh, en) => (lang === 'en' ? en : zh)
