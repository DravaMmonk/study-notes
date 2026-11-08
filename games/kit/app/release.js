// The document's entry script and initial stylesheet identify its built code, including lazy-loaded chunks.
export function assetSignature(document, base) {
  const assets = [...document.querySelectorAll('script[type="module"][src], link[rel="stylesheet"][href]')]
    .map((node) => new URL(node.getAttribute(node.tagName === 'SCRIPT' ? 'src' : 'href'), base).href)
  return assets.length ? assets.join('\n') : null
}

// An update returns to the map, preserving unrelated parameters and bypassing a cached HTML response once.
export function refreshURL(href, now = Date.now()) {
  const url = new URL(href)
  url.searchParams.delete('level')
  url.searchParams.set('_refresh', String(now))
  return url.href
}

export function cleanRefreshURL(href) {
  const url = new URL(href)
  url.searchParams.delete('_refresh')
  return url.href
}

// Check both the built page and content-only publications. An unavailable or malformed response is not an update.
export async function releaseChanged({ base, assets, content, fetcher = fetch, parse = (html) => new DOMParser().parseFromString(html, 'text/html') }) {
  try {
    const [page, data] = await Promise.all([
      fetcher(new URL('index.html', base), { cache: 'no-store' }),
      fetcher(new URL('content.json', base), { cache: 'no-store' }),
    ])
    if (!page.ok || !data.ok) return false
    const [html, text] = await Promise.all([page.text(), data.text()])
    const next = assetSignature(parse(html), base)
    if (!assets || !next) return false
    // Never treat an error page served with a 200 status as new content.
    JSON.parse(text)
    return next !== assets || (content !== null && text !== content)
  } catch {
    return false
  }
}
