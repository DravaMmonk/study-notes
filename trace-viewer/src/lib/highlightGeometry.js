const blockSelector = 'p, li, td, th, pre, h1, h2, h3, h4, h5, h6, .katex-display'

function bounds(rects) {
  return {
    left: Math.min(...rects.map((rect) => rect.left)),
    right: Math.max(...rects.map((rect) => rect.right)),
    top: Math.min(...rects.map((rect) => rect.top)),
    bottom: Math.max(...rects.map((rect) => rect.bottom)),
  }
}

// Merge overlapping vertical bands, preserving separate text lines and blocks.
export function mergeHighlightRects(rects) {
  const lines = []
  for (const rect of rects) {
    let merged = rect
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index]
      if (Math.min(line.bottom, merged.bottom) - Math.max(line.top, merged.top) > 1) {
        merged = bounds([line, merged])
        lines.splice(index, 1)
      }
    }
    lines.push(merged)
  }
  return lines.sort((a, b) => a.top - b.top || a.left - b.left)
}

function visibleRects(mark, container) {
  if (mark.closest('.katex-mathml, [hidden]')) return []
  const rects = [...mark.getClientRects()].filter((rect) => rect.width > .5 && rect.height > .5)
  return rects.map((rect) => {
    const clipped = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
    for (let parent = mark.parentElement; parent && parent !== container; parent = parent.parentElement) {
      const style = getComputedStyle(parent)
      const box = parent.getBoundingClientRect()
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
        clipped.left = Math.max(clipped.left, box.left)
        clipped.right = Math.min(clipped.right, box.right)
      }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
        clipped.top = Math.max(clipped.top, box.top)
        clipped.bottom = Math.min(clipped.bottom, box.bottom)
      }
    }
    return clipped
  }).filter((rect) => rect.right > rect.left && rect.bottom > rect.top)
}

export function observeHighlights(container) {
  let frame = 0
  let disposed = false
  const paint = () => {
    frame = 0
    container.querySelectorAll('.annotation-highlight').forEach((element) => element.remove())
    const origin = container.getBoundingClientRect()
    const annotations = new Map()
    container.querySelectorAll('.annotation-mark').forEach((mark) => {
      const rects = visibleRects(mark, container)
      if (!rects.length) return
      const id = mark.dataset.annotationId
      if (!annotations.has(id)) annotations.set(id, { mark, blocks: new Map() })
      const { blocks } = annotations.get(id)
      const block = mark.closest(blockSelector) ?? container
      if (!blocks.has(block)) blocks.set(block, { rects: [], math: new Map() })
      const group = blocks.get(block)
      // A KaTeX base is unbreakable; unify its selected fractions and scripts first.
      const mathBase = mark.closest('.katex-html .katex-base')
      if (mathBase) {
        if (!group.math.has(mathBase)) group.math.set(mathBase, [])
        group.math.get(mathBase).push(...rects)
      } else {
        group.rects.push(...rects)
      }
    })
    const fragment = document.createDocumentFragment()
    for (const [id, { mark, blocks }] of annotations) {
      for (const { rects, math } of blocks.values()) {
        const lines = mergeHighlightRects([...rects, ...[...math.values()].map(bounds)])
        for (const line of lines) {
          const highlight = document.createElement('span')
          highlight.className = `annotation-highlight${mark.classList.contains('is-active') ? ' is-active' : ''}`
          highlight.dataset.highlightId = id
          highlight.dataset.color = mark.dataset.color
          highlight.setAttribute('aria-hidden', 'true')
          Object.assign(highlight.style, {
            left: `${line.left - origin.left}px`,
            top: `${line.top - origin.top - 1}px`,
            width: `${line.right - line.left}px`,
            height: `${line.bottom - line.top + 2}px`,
          })
          fragment.append(highlight)
        }
      }
    }
    container.append(fragment)
  }
  const schedule = () => {
    if (!disposed && !frame) frame = requestAnimationFrame(paint)
  }
  const observer = new ResizeObserver(schedule)
  observer.observe(container)
  container.addEventListener('load', schedule, true)
  container.addEventListener('scroll', schedule, true)
  document.fonts.addEventListener('loadingdone', schedule)
  paint()
  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    observer.disconnect()
    container.removeEventListener('load', schedule, true)
    container.removeEventListener('scroll', schedule, true)
    document.fonts.removeEventListener('loadingdone', schedule)
    container.querySelectorAll('.annotation-highlight').forEach((element) => element.remove())
  }
}

export function annotationAtPoint(container, x, y) {
  return [...container.querySelectorAll('.annotation-highlight')].reverse().find((element) => {
    const rect = element.getBoundingClientRect()
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  })?.dataset.highlightId
}
