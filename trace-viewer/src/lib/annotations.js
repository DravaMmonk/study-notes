import { observeHighlights } from './highlightGeometry'

const storageKey = 'fieldnotes.annotations.v1'

export const annotationColors = {
  amber: '#f0c95c',
  sage: '#8fbc9b',
  coral: '#ed9a7d',
  blue: '#8fb8cf',
}

function readStore() {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey)) ?? {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  window.localStorage.setItem(storageKey, JSON.stringify(store))
}

export function getAnnotations(documentPath) {
  return readStore()[documentPath] ?? []
}

export function addAnnotation(documentPath, value) {
  const store = readStore()
  const annotation = {
    id: window.crypto.randomUUID(),
    start: value.start,
    end: value.end,
    quote: value.quote,
    prefix: value.prefix,
    suffix: value.suffix,
    color: value.color,
    note: value.note,
    createdAt: new Date().toISOString(),
  }
  store[documentPath] = [...(store[documentPath] ?? []), annotation]
  writeStore(store)
  return annotation
}

export function updateAnnotation(documentPath, id, changes) {
  const store = readStore()
  store[documentPath] = (store[documentPath] ?? []).map((annotation) =>
    annotation.id === id ? { ...annotation, ...changes } : annotation,
  )
  writeStore(store)
}

export function deleteAnnotation(documentPath, id) {
  const store = readStore()
  store[documentPath] = (store[documentPath] ?? []).filter((annotation) => annotation.id !== id)
  writeStore(store)
}

export function applyAnnotations(container, annotations, activeId) {
  if (!annotations.length) return

  const containerText = container.textContent
  const resolvedAnnotations = annotations.map((annotation) => {
    if (containerText.slice(annotation.start, annotation.end) === annotation.quote) return annotation
    const matches = []
    let match = containerText.indexOf(annotation.quote)
    while (match !== -1) {
      matches.push(match)
      match = containerText.indexOf(annotation.quote, match + 1)
    }
    if (!matches.length) return annotation
    const contextualMatch = matches.find((start) => {
      const prefixMatches = !annotation.prefix || containerText.slice(Math.max(0, start - annotation.prefix.length), start) === annotation.prefix
      const suffixMatches = !annotation.suffix || containerText.slice(start + annotation.quote.length, start + annotation.quote.length + annotation.suffix.length) === annotation.suffix
      return prefixMatches && suffixMatches
    })
    const start = contextualMatch ?? matches[0]
    return { ...annotation, start, end: start + annotation.quote.length }
  })

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const textNodes = []
  let offset = 0
  let node = walker.nextNode()

  while (node) {
    const start = offset
    offset += node.nodeValue.length
    textNodes.push({ node, start, end: offset })
    node = walker.nextNode()
  }

  textNodes.forEach(({ node: textNode, start, end }) => {
    const overlaps = resolvedAnnotations
      .filter((annotation) => annotation.start < end && annotation.end > start)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    if (!overlaps.length) return

    const boundaries = new Set([0, textNode.nodeValue.length])
    overlaps.forEach((annotation) => {
      boundaries.add(Math.max(0, annotation.start - start))
      boundaries.add(Math.min(textNode.nodeValue.length, annotation.end - start))
    })

    const points = [...boundaries].sort((left, right) => left - right)
    const fragment = document.createDocumentFragment()
    for (let index = 0; index < points.length - 1; index += 1) {
      const from = points[index]
      const to = points[index + 1]
      const value = textNode.nodeValue.slice(from, to)
      const annotation = [...overlaps].reverse().find((item) => item.start <= start + from && item.end >= start + to)
      if (!annotation) {
        fragment.append(document.createTextNode(value))
        continue
      }
      const mark = document.createElement('mark')
      mark.dataset.annotationId = annotation.id
      mark.dataset.color = annotation.color
      mark.className = annotation.id === activeId ? 'annotation-mark is-active' : 'annotation-mark'
      mark.textContent = value
      fragment.append(mark)
    }
    textNode.replaceWith(fragment)
  })

  return observeHighlights(container)
}
