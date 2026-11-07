// Worker for contract.test.js: one game's contract problems, posted back as plain data for the test to assert on.
import { parentPort, workerData as id } from 'node:worker_threads'
import { readContent } from './content-node.js'
import { gameProblems, specProblems, validateProblems } from './contract.js'
import { closeGames, gameOf } from './games.mjs'

const content = readContent(id)
const domain = (await import(`../domains/${content.domain}/domain.js`)).default
const spec = domain.spec(content)
parentPort.postMessage({
  domain: content.domain,
  spec: specProblems(domain, content, spec),
  validate: (await validateProblems(domain, content, spec)).problems,
  game: gameProblems(content, spec, await gameOf(content)),
})
await closeGames()
