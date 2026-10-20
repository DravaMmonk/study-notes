// A small, deterministic Unix for 《一切皆文件》. Everything lives in one Kernel: a file system of inodes, open file
// descriptions (shared by every fd that came from one open, so fork and dup2 share the offset, as on Linux), pipes
// with a capacity, and processes. A process is a generator that yields system calls:
//
//   const fd = yield sys.open('/tmp/a', 'w')        every call returns its result (or a negative errno, like the
//   yield sys.write(fd, 'hi\n')                     raw system call); a call that would block parks the process
//
// The scheduler runs one runnable process at a time, a step per system call, picking among them with a seeded random
// choice, so a test can run many interleavings. When nobody can run and someone is still waiting, the run is stuck:
// the report says who waits on what (a pipe's reader waiting for an end of file that an open write end prevents).
// Supported: open (r, w, a, with create and truncate), read, write, close, lseek, dup, dup2, pipe, fork, exec (of a
// program the kernel knows), exit, wait, getpid, unlink, link, rename, mkdir, readdir, stat, kill (SIGTERM, SIGKILL).

export const ERR = { ENOENT: -2, EBADF: -9, ECHILD: -10, EEXIST: -17, ENOTDIR: -20, EISDIR: -21, EINVAL: -22, EPIPE: -32 }
export const PIPE_CAPACITY = 64
const SIGNALS = { SIGKILL: 9, SIGTERM: 15, SIGPIPE: 13 }

/** System calls, as values a process yields. */
export const sys = new Proxy({}, { get: (_, name) => (...args) => ({ call: name, args }) })

function random(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export class Kernel {
  constructor({ seed = 1, programs = {} } = {}) {
    this.next = random(seed)
    this.programs = programs // name → (args, env) => generator, run by exec
    this.inodes = new Map() // ino → { ino, type: 'file' | 'dir', data: string, links, entries?: Map(name → ino) }
    this.lastIno = 0
    this.root = this.inode('dir').ino
    this.lastPid = 0
    this.procs = new Map()
    this.trace = [] // [{ pid, call, args, result }] every system call, in order
    this.pipes = 0
  }

  /* ---------- the file system ---------- */

  inode(type, data = '') {
    const node = { ino: ++this.lastIno, type, data, links: 0, ...(type === 'dir' ? { entries: new Map() } : {}) }
    this.inodes.set(node.ino, node)
    return node
  }
  /** [the directory inode, the last name] for a path, or an errno. */
  parent(path) {
    const parts = path.split('/').filter(Boolean)
    let dir = this.inodes.get(this.root)
    for (const name of parts.slice(0, -1)) {
      const ino = dir.entries.get(name)
      if (ino === undefined) return ERR.ENOENT
      dir = this.inodes.get(ino)
      if (dir.type !== 'dir') return ERR.ENOTDIR
    }
    return [dir, parts.at(-1)]
  }
  lookup(path) {
    if (path === '/') return this.inodes.get(this.root)
    const p = this.parent(path)
    if (typeof p === 'number') return p
    const ino = p[0].entries.get(p[1])
    return ino === undefined ? ERR.ENOENT : this.inodes.get(ino)
  }
  /** Put files in place before a run: { '/path': 'contents' }, making directories on the way. */
  seed(files) {
    for (const [path, data] of Object.entries(files)) {
      const parts = path.split('/').filter(Boolean)
      let dir = this.inodes.get(this.root)
      for (const name of parts.slice(0, -1)) {
        if (!dir.entries.has(name)) { const d = this.inode('dir'); d.links++; dir.entries.set(name, d.ino) }
        dir = this.inodes.get(dir.entries.get(name))
      }
      const f = this.inode('file', data)
      f.links++
      dir.entries.set(parts.at(-1), f.ino)
    }
  }
  /** The file system as { path: contents } (files only), for comparing outcomes. */
  files(dir = this.inodes.get(this.root), at = '') {
    const out = {}
    for (const [name, ino] of [...dir.entries].sort()) {
      const node = this.inodes.get(ino)
      if (node.type === 'dir') Object.assign(out, this.files(node, `${at}/${name}`))
      else out[`${at}/${name}`] = node.data
    }
    return out
  }
  release(node) {
    if (node.links === 0 && ![...this.procs.values()].some((p) => [...p.fds.values()].some((d) => d.inode === node))) this.inodes.delete(node.ino)
  }

  /* ---------- processes ---------- */

  /** Start a process running `program` (a generator function of (args, env)), with fds 0, 1, 2 from `fds`. */
  spawn(program, { args = [], fds = new Map(), parent = 0, name = 'proc' } = {}) {
    const pid = ++this.lastPid
    const proc = { pid, parent, name, fds: new Map(fds), gen: program(args, { pid }), state: 'ready', input: undefined, waitingOn: null, exit: null, children: new Set() }
    this.procs.get(parent)?.children.add(pid)
    this.procs.set(pid, proc)
    return pid
  }
  /** A terminal-like pair: an open description that collects writes (stdout / stderr) or gives `text` to reads. */
  terminal(text = null) {
    return { kind: 'tty', text: text ?? '', offset: 0, out: '', refs: 0, readable: text !== null }
  }
  description(props) {
    return { refs: 0, offset: 0, ...props }
  }
  hold(proc, fd, desc) {
    this.dropFd(proc, fd)
    desc.refs++
    if (desc.kind === 'pipe') desc.pipe[desc.end === 'r' ? 'readers' : 'writers']++
    proc.fds.set(fd, desc)
  }
  dropFd(proc, fd) {
    const desc = proc.fds.get(fd)
    if (!desc) return false
    proc.fds.delete(fd)
    desc.refs--
    if (desc.kind === 'pipe') desc.pipe[desc.end === 'r' ? 'readers' : 'writers']--
    if (desc.kind === 'file' && desc.refs === 0) this.release(desc.inode)
    return true
  }
  lowestFd(proc) {
    let fd = 0
    while (proc.fds.has(fd)) fd++
    return fd
  }

  /* ---------- system calls: each returns a result, or BLOCK to wait ---------- */

  call(proc, { call, args }) {
    const handler = CALLS[call]
    if (!handler) return ERR.EINVAL
    return handler.call(this, proc, ...args)
  }

  /**
   * Run until every process has exited, or nobody can run. Returns { stuck, waiting: [{ pid, name, on }] , steps }.
   * `limit` bounds the steps (a program that loops forever).
   */
  run({ limit = 100000 } = {}) {
    let steps = 0
    for (; steps < limit; steps++) {
      const ready = [...this.procs.values()].filter((p) => p.state === 'ready' || (p.state === 'blocked' && this.wake(p)))
      if (!ready.length) break
      const proc = ready[Math.floor(this.next() * ready.length)]
      this.step(proc)
    }
    const waiting = [...this.procs.values()].filter((p) => p.state === 'blocked').map((p) => ({ pid: p.pid, name: p.name, on: p.waitingOn.why }))
    return { stuck: waiting.length > 0, waiting, steps, limited: steps >= limit }
  }
  // Can a blocked process go on now? Re-try its call.
  wake(proc) {
    const result = this.call(proc, proc.waitingOn.request)
    if (result === BLOCK) return false
    proc.state = 'ready'
    proc.input = result
    proc.waitingOn = null
    this.trace.push({ pid: proc.pid, ...proc.lastCall, result, woke: true })
    return true
  }
  step(proc) {
    let r
    try {
      r = proc.gen.next(proc.input)
    } catch (error) {
      this.exit(proc, 1, String(error))
      return
    }
    proc.input = undefined
    if (r.done) {
      this.exit(proc, r.value ?? 0)
      return
    }
    const request = r.value
    const result = this.call(proc, request)
    if (proc.state === 'zombie') return
    proc.lastCall = { call: request.call, args: request.args.map((a) => (typeof a === 'function' ? a.name : a)) }
    if (result === BLOCK) {
      proc.state = 'blocked'
      proc.waitingOn = { request, why: blockedWhy(this, proc, request) }
      return
    }
    if (result && result.exec) return
    proc.input = result
    this.trace.push({ pid: proc.pid, ...proc.lastCall, result })
  }
  exit(proc, status, error = null) {
    for (const fd of [...proc.fds.keys()]) this.dropFd(proc, fd)
    proc.state = 'zombie'
    proc.exit = status
    proc.error = error
    this.trace.push({ pid: proc.pid, call: 'exit', args: [status], result: 0 })
  }
}

const BLOCK = Symbol('block')
export { BLOCK }

function blockedWhy(kernel, proc, { call, args }) {
  const desc = proc.fds.get(args[0])
  if (call === 'read' && desc?.kind === 'pipe') {
    const holders = [...kernel.procs.values()].filter((p) => p.state !== 'zombie' && [...p.fds.values()].some((d) => d.pipe === desc.pipe && d.end === 'w')).map((p) => p.pid)
    return { zh: `读管道，等写端关闭；还开着写端的进程：${holders.join('、')}`, en: `reading a pipe, waiting for its write end to close; still holding it: ${holders.join(', ')}`, holders }
  }
  if (call === 'write' && desc?.kind === 'pipe') return { zh: '写管道，管道满了，等有人读', en: 'writing a full pipe, waiting for a reader' }
  if (call === 'wait') return { zh: '等子进程结束', en: 'waiting for a child to exit' }
  return { zh: call, en: call }
}

const isDir = (k, path) => {
  const n = k.lookup(path)
  return typeof n !== 'number' && n.type === 'dir'
}

const CALLS = {
  getpid(proc) { return proc.pid },
  open(proc, path, mode = 'r') {
    let node = this.lookup(path)
    if (typeof node === 'number') {
      if (mode === 'r') return node
      const p = this.parent(path)
      if (typeof p === 'number') return p
      node = this.inode('file')
      node.links++
      p[0].entries.set(p[1], node.ino)
    } else if (node.type === 'dir' && mode !== 'r') return ERR.EISDIR
    if (mode === 'w') node.data = ''
    const desc = this.description({ kind: 'file', inode: node, mode, offset: 0 })
    const fd = this.lowestFd(proc)
    this.hold(proc, fd, desc)
    return fd
  },
  close(proc, fd) { return this.dropFd(proc, fd) ? 0 : ERR.EBADF },
  read(proc, fd, count = Infinity) {
    const desc = proc.fds.get(fd)
    if (!desc) return ERR.EBADF
    if (desc.kind === 'tty') {
      const out = desc.text.slice(desc.offset, desc.offset + count)
      desc.offset += out.length
      return out
    }
    if (desc.kind === 'pipe') {
      if (desc.end !== 'r') return ERR.EBADF
      const p = desc.pipe
      if (!p.buffer.length) return p.writers > 0 ? BLOCK : ''
      const out = p.buffer.slice(0, count)
      p.buffer = p.buffer.slice(out.length)
      return out
    }
    if (desc.inode.type === 'dir') return ERR.EISDIR
    const out = desc.inode.data.slice(desc.offset, desc.offset + count)
    desc.offset += out.length
    return out
  },
  write(proc, fd, text) {
    const desc = proc.fds.get(fd)
    if (!desc) return ERR.EBADF
    if (desc.kind === 'tty') { desc.out += text; return text.length }
    if (desc.kind === 'pipe') {
      if (desc.end !== 'w') return ERR.EBADF
      const p = desc.pipe
      if (p.readers === 0) { this.exit(proc, 128 + SIGNALS.SIGPIPE); return ERR.EPIPE }
      const room = PIPE_CAPACITY - p.buffer.length
      if (room <= 0) return BLOCK
      const part = text.slice(0, room)
      p.buffer += part
      // A short write: the process writes the rest itself (as write(2) may return less than asked).
      return part.length
    }
    if (desc.mode === 'r') return ERR.EBADF
    const node = desc.inode
    if (desc.mode === 'a') desc.offset = node.data.length
    node.data = node.data.slice(0, desc.offset).padEnd(desc.offset, '\0') + text + node.data.slice(desc.offset + text.length)
    desc.offset += text.length
    return text.length
  },
  lseek(proc, fd, offset, whence = 'set') {
    const desc = proc.fds.get(fd)
    if (!desc || desc.kind !== 'file') return ERR.EBADF
    desc.offset = whence === 'end' ? desc.inode.data.length + offset : whence === 'cur' ? desc.offset + offset : offset
    return desc.offset
  },
  dup(proc, fd) {
    const desc = proc.fds.get(fd)
    if (!desc) return ERR.EBADF
    const to = this.lowestFd(proc)
    this.hold(proc, to, desc)
    return to
  },
  dup2(proc, fd, to) {
    const desc = proc.fds.get(fd)
    if (!desc) return ERR.EBADF
    if (fd !== to) this.hold(proc, to, desc)
    return to
  },
  pipe(proc) {
    const p = { id: ++this.pipes, buffer: '', readers: 0, writers: 0 }
    const r = this.lowestFd(proc)
    this.hold(proc, r, this.description({ kind: 'pipe', pipe: p, end: 'r' }))
    const w = this.lowestFd(proc)
    this.hold(proc, w, this.description({ kind: 'pipe', pipe: p, end: 'w' }))
    return [r, w]
  },
  // fork(child): the child runs the generator function `child` (a JS process cannot copy its own stack), with a
  // copy of the fd table sharing every open description.
  fork(proc, child, name = `${proc.name}'`) {
    const pid = this.spawn(child, { fds: new Map(), parent: proc.pid, name })
    const kid = this.procs.get(pid)
    for (const [fd, desc] of proc.fds) this.hold(kid, fd, desc)
    return pid
  },
  // exec(name, args): the process becomes the named program; its fds stay.
  exec(proc, name, args = []) {
    const program = this.programs[name]
    if (!program) return ERR.ENOENT
    proc.gen = program(args, { pid: proc.pid })
    proc.name = name
    proc.input = undefined
    this.trace.push({ pid: proc.pid, call: 'exec', args: [name, ...args], result: 0 })
    return { exec: true }
  },
  exit(proc, status = 0) { this.exit(proc, status); return 0 },
  // wait(): reap a child that has exited: [pid, status]; block while a child still runs; ECHILD with no children.
  wait(proc) {
    const kids = [...proc.children].map((pid) => this.procs.get(pid))
    if (!kids.length) return ERR.ECHILD
    const done = kids.find((k) => k.state === 'zombie')
    if (!done) return BLOCK
    proc.children.delete(done.pid)
    this.procs.delete(done.pid)
    return [done.pid, done.exit]
  },
  kill(proc, pid, signal = 'SIGTERM') {
    const target = this.procs.get(pid)
    if (!target || target.state === 'zombie') return ERR.EINVAL
    this.exit(target, 128 + SIGNALS[signal])
    return 0
  },
  unlink(proc, path) {
    const p = this.parent(path)
    if (typeof p === 'number') return p
    const ino = p[0].entries.get(p[1])
    if (ino === undefined) return ERR.ENOENT
    const node = this.inodes.get(ino)
    if (node.type === 'dir') return ERR.EISDIR
    p[0].entries.delete(p[1])
    node.links--
    this.release(node)
    return 0
  },
  link(proc, from, to) {
    const node = this.lookup(from)
    if (typeof node === 'number') return node
    if (typeof this.lookup(to) !== 'number') return ERR.EEXIST
    const p = this.parent(to)
    if (typeof p === 'number') return p
    p[0].entries.set(p[1], node.ino)
    node.links++
    return 0
  },
  // rename replaces the target in one step: no moment where neither name exists.
  rename(proc, from, to) {
    const a = this.parent(from)
    const node = this.lookup(from)
    if (typeof node === 'number') return node
    const b = this.parent(to)
    if (typeof b === 'number') return b
    const old = b[0].entries.get(b[1])
    if (old !== undefined && old !== node.ino) { const o = this.inodes.get(old); o.links--; this.release(o) }
    a[0].entries.delete(a[1])
    b[0].entries.set(b[1], node.ino)
    return 0
  },
  mkdir(proc, path) {
    if (typeof this.lookup(path) !== 'number') return ERR.EEXIST
    const p = this.parent(path)
    if (typeof p === 'number') return p
    const d = this.inode('dir')
    d.links++
    p[0].entries.set(p[1], d.ino)
    return 0
  },
  readdir(proc, path) {
    if (!isDir(this, path)) return ERR.ENOTDIR
    return [...this.lookup(path).entries.keys()].sort()
  },
  stat(proc, path) {
    const node = this.lookup(path)
    if (typeof node === 'number') return node
    return { ino: node.ino, type: node.type, size: node.data.length, links: node.links }
  },
}
