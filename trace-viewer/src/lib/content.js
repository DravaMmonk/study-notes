import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import markedKatex from 'marked-katex-extension'

const markdownRenderer = new Marked(markedKatex({ throwOnError: false }))

const markdownModules = import.meta.glob('../../../docs/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const assetModules = import.meta.glob('../../../docs/**/*.{png,jpg,jpeg,gif,svg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})

function normalizePath(path) {
  const parts = []
  path.split('/').forEach((part) => {
    if (!part || part === '.') return
    if (part === '..') parts.pop()
    else parts.push(part)
  })
  return parts.join('/')
}

function getTitle(content, path) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]
  if (heading) return heading.replace(/[*_`]/g, '').trim()
  const filename = path.split('/').at(-1).replace(/\.md$/, '')
  if (filename.toLocaleLowerCase() === 'readme') return path.split('/').at(-2) ?? 'Overview'
  return filename
    .replace(/^\d+[-_]?/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase())
}

export const noteDocuments = Object.entries(markdownModules)
  .map(([sourcePath, content]) => {
    const path = sourcePath.replace('../../../docs/', '')
    return {
      content,
      path,
      slug: path.replace(/\.md$/, '').replaceAll('/', '-').toLocaleLowerCase(),
      sourcePath,
      title: getTitle(content, path),
    }
  })
  .sort((left, right) => left.path.localeCompare(right.path, undefined, { numeric: true }))

export function buildDocumentTree(documents) {
  const root = { name: 'root', path: '', children: [] }

  documents.forEach((document) => {
    const parts = document.path.split('/')
    let parent = root
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/')
      let node = parent.children.find((child) => child.path === path)
      if (!node) {
        node = index === parts.length - 1
          ? { name: part, path, document }
          : { name: part, path, children: [] }
        parent.children.push(node)
      }
      parent = node
    })
  })

  return root
}

function resolveAssetReferences(markdown, sourcePath) {
  const sourceDirectory = sourcePath.slice(0, sourcePath.lastIndexOf('/'))
  return markdown.replace(/(!\[[^\]]*\]\()([^\s)]+)([^)]*\))/g, (match, before, url, after) => {
    if (/^(https?:|data:|\/)/.test(url)) return match
    const resolvedPath = normalizePath(`${sourceDirectory}/${decodeURIComponent(url)}`)
    const moduleKey = Object.keys(assetModules).find((key) => normalizePath(key) === resolvedPath)
    return moduleKey ? `${before}${assetModules[moduleKey]}${after}` : match
  })
}

function slugify(value, seen) {
  const base = value
    .toLocaleLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-') || 'section'
  const count = seen.get(base) ?? 0
  seen.set(base, count + 1)
  return count ? `${base}-${count + 1}` : base
}

export function renderMarkdown(markdown, sourcePath) {
  const preparedMarkdown = resolveAssetReferences(markdown, sourcePath)
  const unsafeHtml = markdownRenderer.parse(preparedMarkdown, { breaks: false, gfm: true })
  const parser = new DOMParser()
  const document = parser.parseFromString(DOMPurify.sanitize(unsafeHtml), 'text/html')
  const seen = new Map()
  const headings = [...document.body.querySelectorAll('h1, h2, h3')].map((heading) => {
    const id = slugify(heading.textContent, seen)
    heading.id = id
    return { id, level: Number(heading.tagName.slice(1)), text: heading.textContent }
  })

  document.body.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href') ?? ''
    if (/^https?:/.test(href)) {
      link.target = '_blank'
      link.rel = 'noreferrer'
      return
    }
    if (!href.split('#')[0].toLocaleLowerCase().endsWith('.md')) return
    const sourceDocumentPath = sourcePath.replace('../../../docs/', '')
    const separatorIndex = sourceDocumentPath.lastIndexOf('/')
    const sourceDirectory = separatorIndex === -1 ? '' : sourceDocumentPath.slice(0, separatorIndex)
    const [relativePath, heading] = href.split('#')
    const notePath = normalizePath(`${sourceDirectory}/${decodeURIComponent(relativePath)}`)
    link.dataset.notePath = notePath
    link.setAttribute('href', `?note=${encodeURIComponent(notePath)}${heading ? `#${heading}` : ''}`)
  })

  return { headings, html: document.body.innerHTML }
}

export function renderAnnotationMarkdown(markdown) {
  if (!markdown) return ''
  const unsafeHtml = markdownRenderer.parse(markdown, { breaks: true, gfm: true })
  return DOMPurify.sanitize(unsafeHtml)
}
