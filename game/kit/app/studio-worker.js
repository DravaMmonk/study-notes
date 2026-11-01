// The studio bridge's second lane (studio.js): the same tools (../engine/ops/tools.js) in a worker thread, for the
// slow reads — a whole check, a run of a level's tests — so the dev server answers quick previews meanwhile.
//   message in:  { id, name, args }      message out: { id, result } | { id, error }
import { parentPort } from 'node:worker_threads'

const { TOOLS } = await import('../engine/ops/tools.js')
parentPort.on('message', async ({ id, name, args }) => {
  try {
    parentPort.postMessage({ id, result: await TOOLS[name].run(args) })
  } catch (error) {
    parentPort.postMessage({ id, error: error.message })
  }
})
