// The conformance cases (cases.json) on the simulated kernel. Each runs a small scenario and reports the same outcome
// the real-Linux runner (real.py) reports, so the two can be compared with the expected outcome.
import { ERR, Kernel, sys } from '../kernel.js'
import { readAll, writeAll } from '../programs.js'

const errName = (n) => Object.keys(ERR).find((k) => ERR[k] === n) ?? n
const kernel = () => new Kernel({ seed: 7 })
const start = (k, program) => k.spawn(program, { name: 'main' })

export const SIM = {
  'fork-shares-offset'() {
    const k = kernel()
    start(k, function* () {
      const fd = yield sys.open('/f', 'w')
      yield sys.fork(function* () { yield* writeAll(fd, 'child\n') })
      yield sys.wait()
      yield* writeAll(fd, 'parent\n')
    })
    k.run()
    return { file: k.files()['/f'] }
  },
  'dup-shares-offset'() {
    const k = kernel()
    start(k, function* () {
      const fd = yield sys.open('/f', 'w')
      const fd2 = yield sys.dup(fd)
      yield sys.write(fd, 'ab')
      yield sys.write(fd2, 'cd')
    })
    k.run()
    return { file: k.files()['/f'] }
  },
  'unlink-while-open'() {
    const k = kernel()
    k.seed({ '/f': 'hello' })
    let read, stat
    start(k, function* () {
      const fd = yield sys.open('/f', 'r')
      yield sys.unlink('/f')
      read = yield sys.read(fd, 100)
      stat = errName(yield sys.stat('/f'))
    })
    k.run()
    return { read, stat }
  },
  'hard-link'() {
    const k = kernel()
    k.seed({ '/a': '' })
    let links, through, after
    start(k, function* () {
      yield sys.link('/a', '/b')
      links = (yield sys.stat('/a')).links
      const fd = yield sys.open('/b', 'w')
      yield sys.write(fd, 'data')
      yield sys.close(fd)
      const r = yield sys.open('/a', 'r')
      through = yield sys.read(r, 100)
      yield sys.close(r)
      yield sys.unlink('/a')
      const r2 = yield sys.open('/b', 'r')
      after = yield sys.read(r2, 100)
    })
    k.run()
    return { links, through, after }
  },
  'rename-replaces'() {
    const k = kernel()
    k.seed({ '/a': 'new', '/b': 'old' })
    let a
    start(k, function* () {
      yield sys.rename('/a', '/b')
      a = errName(yield sys.stat('/a'))
    })
    k.run()
    return { b: k.files()['/b'], a }
  },
  'pipe-eof-after-close'() {
    const k = kernel()
    let child
    start(k, function* () {
      const [r, w] = yield sys.pipe()
      yield sys.fork(function* () {
        yield sys.close(w)
        child = yield* readAll(r)
      })
      yield sys.close(r)
      yield* writeAll(w, 'hi')
      yield sys.close(w)
      yield sys.wait()
    })
    const { stuck } = k.run()
    return { child, stuck }
  },
  'pipe-open-write-end'() {
    const k = kernel()
    start(k, function* () {
      const [r, w] = yield sys.pipe()
      yield sys.fork(function* () {
        yield sys.close(w)
        yield* readAll(r)
      })
      yield* writeAll(w, 'hi')
      yield sys.wait()
    })
    return { stuck: k.run().stuck }
  },
  'redirect-then-dup'() { return redirect(['file', 'dup']) },
  'dup-then-redirect'() { return redirect(['dup', 'file']) },
  sigpipe() {
    const k = kernel()
    let status
    start(k, function* () {
      const [r, w] = yield sys.pipe()
      yield sys.close(r)
      yield sys.fork(function* () { yield sys.write(w, 'x') })
      yield sys.close(w)
      ;[, status] = yield sys.wait()
    })
    k.run()
    return { killedBySigpipe: status === 128 + 13 }
  },
  'wait-status'() {
    const k = kernel()
    let status
    start(k, function* () {
      yield sys.fork(function* () { return 3 })
      ;[, status] = yield sys.wait()
    })
    k.run()
    return { status }
  },
}

// A child writes 'out' to fd 1 and 'err' to fd 2, after the parent's redirections in the given order.
function redirect(order) {
  const k = kernel()
  const terminal = k.terminal()
  const fds = new Map([[1, terminal], [2, terminal]])
  terminal.refs = 2
  k.spawn(function* () {
    for (const step of order) {
      if (step === 'file') {
        const fd = yield sys.open('/f', 'w')
        yield sys.dup2(fd, 1)
        yield sys.close(fd)
      } else yield sys.dup2(1, 2)
    }
    yield* writeAll(1, 'out\n')
    yield* writeAll(2, 'err\n')
  }, { fds, name: 'sh' })
  k.run()
  return { file: k.files()['/f'], terminal: terminal.out }
}
