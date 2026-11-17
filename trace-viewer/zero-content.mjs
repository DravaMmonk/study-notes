// Exercise the installed platform against an isolated content workspace.
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'
import { chromium } from 'playwright'

const app = import.meta.dirname
const kit = resolve(app, '../games/kit')
const root = mkdtempSync(resolve(tmpdir(), 'kit-zero-'))
const env = { ...process.env, GAMES_ROOT: root }
const run = promisify(execFile)
const command = async args => {
  const { stdout, stderr } = await run(process.execPath, args, { cwd: app, env, maxBuffer: 32 << 20 })
  process.stdout.write(stdout)
  process.stderr.write(stderr)
}
const put = (path, value) => {
  const file = resolve(root, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
}
let server
let browser
try {
  mkdirSync(resolve(root, 'packages'))
  mkdirSync(resolve(root, 'games'))
  const tests = readdirSync(kit, { recursive: true }).filter(file => file.endsWith('.test.js')).map(file => resolve(kit, file))
  await command(['--import', resolve(kit, 'engine/package-imports.mjs'), '--test', '--test-reporter=dot', ...tests])
  console.log(`Empty workspace: ${tests.length} kernel test files passed`)
  await command([resolve(kit, 'engine/check.js')])

  process.env.GAMES_ROOT = root
  const { createServer } = await import('vite')
  browser = await chromium.launch()
  const errors = []
  const page = await browser.newPage()
  await page.addInitScript(() => { if (location.protocol === 'http:') localStorage.setItem('fieldnotes.lang', 'en') })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  const openServer = async () => {
    server = await createServer({ root: app, mode: 'studio', configFile: resolve(app, 'vite.config.js'),
      cacheDir: resolve(root, '.vite'), server: { host: '127.0.0.1', port: 0, open: false }, logLevel: 'error',
    })
    await server.listen()
    return `http://127.0.0.1:${server.httpServer.address().port}`
  }
  let base = await openServer()
  await page.goto(`${base}/studio.html`)
  await page.getByText(/^(没有内容|No content)$/).waitFor().catch(async error => { console.error(await page.locator('body').innerText(), errors); throw error })
  assert.deepEqual(errors, [])
  await page.goto('about:blank')
  await server.close()
  server = null
  console.log('Empty Studio opened without browser errors')

  // Install only the text mechanism, with one freshly authored level and no circuit provider.
  for (const side of ['core', 'view', 'kinds']) cpSync(resolve(app, '../packages/text', side), resolve(root, 'packages/text', side), { recursive: true })
  put('packages/text/package.json', { version: '0.0.0', kernel: '^0.0.0', uses: {} })
  put('packages/text/levels/hello.json', { title: 'Hello', after: 'Correct.', tasks: [{ id: 'hello', play: 'text:answer', brief: 'Type hello.', answerRule: { type: 'exact', answer: 'hello' }, referenceAnswer: 'hello', wrongAnswers: ['no'] }] })
  await command([resolve(kit, 'engine/deps.js'), 'lock', '--package', 'text'])
  await command([resolve(kit, 'engine/check.js'), '--package', 'text'])
  base = await openServer()
  await page.goto(`${base}/studio.html?package=text`)
  await page.locator('.studio-loading').waitFor({ state: 'detached' })
  await page.getByText('Hello', { exact: true }).first().waitFor()
  assert.deepEqual(errors, [])
  await page.goto('about:blank')
  await server.close()
  server = null
  console.log('Package-only Studio opened without a game')

  put('games/minimal/game.json', { kernel: '^0.0.0', packages: { text: '^0.0.0' }, title: 'Minimal', kicker: 'Text', lede: 'One answer.', chapters: ['@minimal/main'] })
  put('games/minimal/course.json', {})
  put('games/minimal/chapters/main.json', { chapter: { title: 'Main' }, levels: ['text/hello'] })
  await command([resolve(kit, 'engine/deps.js'), 'lock', '--game', 'minimal'])
  await command([resolve(kit, 'engine/check.js'), '--game', 'minimal'])
  base = await openServer()
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto(`${base}/game/minimal/index.html?level=text/hello&lang=en`)
    const answer = page.getByRole('textbox', { name: 'Answer', exact: true })
    await answer.fill('hello').catch(async error => { console.error(await page.locator('body').innerText(), errors); throw error })
    await answer.press('Enter')
    await page.getByText('Passed', { exact: true }).first().waitFor()
    assert.deepEqual(errors, [])
  }
  console.log('Text-only game opened and passed on desktop and phone without browser errors')
} finally {
  await browser?.close()
  await server?.close()
  rmSync(root, { recursive: true, force: true })
}
