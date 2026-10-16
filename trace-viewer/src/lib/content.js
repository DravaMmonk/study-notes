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

// YAML front matter (`---` … `---` at the top) is for MkDocs; the reader drops it and only reads its title.
const frontMatterPattern = /^---\n([\s\S]*?)\n---\n/

function getTitle(content, path) {
  const heading = content.match(frontMatterPattern)?.[1].match(/^title:\s*(.+)$/m)?.[1] ?? content.match(/^#\s+(.+)$/m)?.[1]
  if (heading) return heading.replace(/[*_`]/g, '').trim()
  const filename = path.split('/').at(-1).replace(/\.md$/, '')
  if (filename.toLocaleLowerCase() === 'readme') return path.split('/').at(-2) ?? 'Overview'
  return filename
    .replace(/^\d+[-_]?/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase())
}

// Every note is bilingual: X.md is the original, in whichever language it was written, and its translation sits
// beside it as X.zh.md (an English original) or X.en.md (a Chinese original). basePath ties the two together.
const translationPattern = /\.(zh|en)\.md$/

export const noteDocuments = Object.entries(markdownModules)
  .map(([sourcePath, content]) => {
    const path = sourcePath.replace('../../../docs/', '')
    const suffix = path.match(translationPattern)?.[1]
    return {
      content: content.replace(frontMatterPattern, ''),
      path,
      basePath: suffix ? path.replace(translationPattern, '.md') : path,
      lang: suffix ?? null,
      slug: path.replace(/\.md$/, '').replaceAll('/', '-').toLocaleLowerCase(),
      sourcePath,
      title: getTitle(content, path),
    }
  })
  .sort((left, right) => left.path.localeCompare(right.path, undefined, { numeric: true }))

const versionsByBase = new Map()
noteDocuments.forEach((document) => {
  if (!versionsByBase.has(document.basePath)) versionsByBase.set(document.basePath, {})
})
noteDocuments.forEach((document) => {
  const versions = versionsByBase.get(document.basePath)
  if (document.lang) versions[document.lang] = document
})
// An original's language is the one its translation is not; a note without a translation stays lang null.
noteDocuments.forEach((document) => {
  if (document.lang) return
  const versions = versionsByBase.get(document.basePath)
  if (versions.zh) document.lang = 'en'
  else if (versions.en) document.lang = 'zh'
  if (document.lang) versions[document.lang] = document
})

/** The version of a note in a language, or the note itself when it has no translation. */
export function versionOf(document, lang) {
  return versionsByBase.get(document.basePath)?.[lang] ?? document
}

/** One entry per note for the library: the originals. */
export const libraryDocuments = noteDocuments.filter((document) => document.path === document.basePath)

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

  sortTree(root)
  return root
}

// The same order as the notes site's nav: home, the courses (newest semester first), self-study, then the rest.
const topOrder = ['index.md', 'Unimelb', 'Other']
function sortTree(node) {
  if (!node.children) return
  const rank = (child) => (node.path === '' ? (topOrder.indexOf(child.path) + 1 || topOrder.length + 1) : 0)
  const newestFirst = node.path === 'Unimelb'
  node.children.sort((left, right) => rank(left) - rank(right)
    || (newestFirst ? right.name.localeCompare(left.name) : 0))
  node.children.forEach(sortTree)
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

// The games are published with the notes site; the reader only serves Vision Complete (game.html) itself.
const publishedSite = 'https://dravammonk.github.io/study-notes/'

// An HTML comment on its own line, <!-- figure: name -->, marks where an interactive figure goes.
// Obsidian and MkDocs hide the comment; here it becomes an empty slot the app fills.
const figurePattern = /^[ \t]*<!--\s*figure:\s*([a-z0-9-]+)\s*-->[ \t]*$/gm

export function renderMarkdown(markdown, sourcePath) {
  const withFigures = markdown.replace(figurePattern, (_, name) => `<div class="figure-slot" data-figure="${name}"></div>`)
  const preparedMarkdown = resolveAssetReferences(withFigures, sourcePath)
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
    if (/^game\//.test(href)) {
      const local = href.startsWith('game/vision-complete/')
      link.setAttribute('href', local ? 'game.html' : `${publishedSite}${href}`)
      if (!local) { link.target = '_blank'; link.rel = 'noreferrer' }
      return
    }
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
