import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assetSignature, cleanRefreshURL, recoveryURL, refreshURL, releaseChanged } from './release.js'

const base = 'https://example.test/games/vision/index.html?level=3-6'
const doc = (paths) => ({ querySelectorAll: () => paths.map(([tagName, value]) => ({ tagName, getAttribute: () => value })) })
const assets = assetSignature(doc([['SCRIPT', './assets/game-old.js'], ['LINK', './assets/game-old.css']]), base)
const parse = (html) => doc(JSON.parse(html))
const fetcher = (html, content, ok = true) => async (url, options) => {
  assert.equal(options.cache, 'no-store')
  return { ok, text: async () => url.pathname.endsWith('index.html') ? JSON.stringify(html) : content }
}

test('detects changed code or content, and ignores network and invalid responses', async () => {
  const old = [['SCRIPT', './assets/game-old.js'], ['LINK', './assets/game-old.css']]
  const changed = [['SCRIPT', './assets/game-new.js'], ['LINK', './assets/game-old.css']]
  const check = (fetch) => releaseChanged({ base, assets, content: '{"v":1}', fetcher: fetch, parse })
  assert.equal(await check(fetcher(old, '{"v":1}')), false)
  assert.equal(await check(fetcher(changed, '{"v":1}')), true)
  assert.equal(await check(fetcher(old, '{"v":2}')), true)
  assert.equal(await check(fetcher(old, '<html>error</html>')), false)
  assert.equal(await check(fetcher(changed, '{"v":1}', false)), false)
  assert.equal(await check(async () => { throw new Error('offline') }), false)
})

test('refresh returns to the map and keeps other URL parameters', () => {
  const url = refreshURL(`${base}&lang=zh#x`, 42)
  assert.equal(url, 'https://example.test/games/vision/index.html?lang=zh&_refresh=42#x')
  assert.equal(cleanRefreshURL(url), 'https://example.test/games/vision/index.html?lang=zh#x')
})

test('an embedded level refreshes onto the same level', () => {
  assert.equal(refreshURL('https://example.test/games/notes/index.html?embed=&level=separable&lang=zh', 42), 'https://example.test/games/notes/index.html?embed=&level=separable&lang=zh&_refresh=42')
})

test('startup recovery preserves the link, retries a newer build once, and ignores unrelated failures', async () => {
  const link = `${base}&lang=zh#x`
  const retry = 'https://example.test/games/vision/index.html?level=3-6&lang=zh&_refresh=42#x'
  const original = [['SCRIPT', './assets/game-old.js'], ['LINK', './assets/game-old.css']]
  const newer = [['SCRIPT', './assets/game-new.js'], ['LINK', './assets/game-old.css']]
  const recover = (options) => recoveryURL({ base: link, assets, parse, now: 42, ...options })
  const serve = (paths) => async (url, options) => {
    assert.equal(url.href, retry)
    assert.equal(options.cache, 'no-store')
    return { ok: true, text: async () => JSON.stringify(paths) }
  }
  assert.equal(await recover({ fetcher: serve(newer) }), retry)
  assert.equal(await recover({ fetcher: serve(original) }), null)
  assert.equal(await recover({ fetcher: serve([]) }), null)
  assert.equal(await recover({ fetcher: async () => { throw new Error('offline') } }), null)
  let requested = false
  assert.equal(await recover({ base: retry, fetcher: () => { requested = true } }), null)
  assert.equal(requested, false)
})
