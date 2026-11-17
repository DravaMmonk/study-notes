// Resolve the public kernel API before Node links package dependencies.
import { registerHooks } from 'node:module'
const entries = { kernel: new URL('./index.js', import.meta.url).href, 'kernel/view': new URL('../app/view.jsx', import.meta.url).href }
registerHooks({ resolve(specifier, context, next) { return next(entries[specifier] ?? specifier, context) } })
// Child check and contract processes inherit the same public import environment.
const preload = `--import=${new URL(import.meta.url).pathname}`
if (!(process.env.NODE_OPTIONS ?? '').includes(preload)) process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} ${preload}`.trim()
