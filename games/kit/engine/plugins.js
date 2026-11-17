import { registerMeaning } from './kind-meanings.js'
import { tagKey, kernelTags } from './tag-identity.js'
// Environment-neutral package registration. Each assembly owns its registry.
const CORE = ['play', 'kind', 'state', 'check', 'agent']
const VIEW = ['play', 'editor', 'display']
const REQUIRED = { play: ['initial', 'read', 'write', 'normalize', 'run', 'judge'], agent: ['observe', 'act'], kind: ['read'] }

export function createPluginKernel() {
  const tables = Object.fromEntries([...new Set([...CORE, ...VIEW]), 'playView', 'tag'].map(key => [key, new Map()]))
  const add = (table, name, value) => {
    if (tables[table].has(name)) throw new Error(`duplicate ${table} ${name}`)
    tables[table].set(name, value)
  }
  // These names are consumed by Studio, including in headless author checks.
  for (const [key, reader] of kernelTags) add('tag', key, reader)
  const objects = []
  return {
    tables, objects,
    forPackage(id, side) {
      const api = Object.fromEntries((side === 'core' ? CORE : VIEW).map(type => [type, (name, value) => {
        if (!name.startsWith(`${id}:`) || !/^[a-z][a-z0-9-]*:[A-Za-z][A-Za-z0-9_-]*$/.test(name)) throw new Error(`${id}: invalid ${type} name ${name}`)
        const required = side === 'core' ? REQUIRED[type] ?? [] : type === 'play' ? ['component', 'preview'] : []
        for (const key of required) if (typeof value?.[key] !== 'function') throw new Error(`${name}: ${type} needs ${key}()`)
        if (['kind', 'editor'].includes(type) && typeof value?.type !== 'string') throw new Error(`${name}: ${type} needs an object type`)
        if (['check', 'state'].includes(type) && typeof value !== 'function') throw new Error(`${name}: ${type} needs a function`)
        if (type === 'kind') registerMeaning(value)
        add(type === 'play' && side === 'view' ? 'playView' : type, name, value)
      }]))
      api.object = (kind, name, value = {}) => {
        if (side !== 'core' || !name.startsWith(`${id}/`)) throw new Error(`${id}: objects register their own full name in core`)
        if (objects.some(object => object.kind === kind && object.name === name && object.value.kind === value.kind)) throw new Error(`duplicate ${kind} ${name}`)
        objects.push({ kind, name, value })
      }
      api.tag = (name, member) => {
        if (side !== 'core') throw new Error('tag readers register in core')
        if (!name.startsWith(`${id}/`) || !/^[a-z][a-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name)) throw new Error(`${id}: tag reader needs its own full name`)
        if (typeof member !== 'string' || !member) throw new Error(`${name}: tag reader needs a member type`)
        add('tag', tagKey(member, name), { name, member, reader: id })
        api.object('tag', name, { kind: member, values: [] })
      }
      return Object.freeze(api)
    },
    pair(tasks = [], view = false) {
      for (const name of tables.playView.keys()) if (!tables.play.has(name)) throw new Error(`${name}: view has no core play`)
      for (const task of tasks) if (task.play && (!task.kind || tables.play.has(task.play))) {
        if (!tables.play.has(task.play)) throw new Error(`unknown play ${task.play}`)
        if (view && !tables.playView.has(task.play)) throw new Error(`${task.play}: core has no view play`)
      }
    },
    meanings(type, value, context) { return Object.fromEntries([...tables.kind].filter(([, meaning]) => meaning.type === type).map(([name, meaning]) => [name, meaning.read(value, context)])) },
    state(context) { return Object.fromEntries([...tables.state].map(([name, derive]) => [name, derive(context)])) },
    async checks(context) { return (await Promise.all([...tables.check].filter(([name, check]) => (context.phase ? check.phase === context.phase : !check.phase) && (!context.package || name.startsWith(`${context.package}:`)) && !context.excludePackages?.includes(name.split(':')[0])).map(async ([name, check]) => (await check(context)).map(line => ({ ...line, plugin: name }))))).flat() },
  }
}

export async function registerPlugins(entries, { view = false, tasks = [] } = {}) {
  const kernel = createPluginKernel()
  for (const { id, core, view: display } of entries) {
    if (core) {
      if (typeof core.register !== 'function') throw new Error(`${id}/core: missing register(kernel)`)
      await core.register(kernel.forPackage(id, 'core'))
    }
    if (view && display) {
      if (typeof display.register !== 'function') throw new Error(`${id}/view: missing register(kernel)`)
      await display.register(kernel.forPackage(id, 'view'))
    }
  }
  kernel.pair(tasks, view)
  return kernel
}
