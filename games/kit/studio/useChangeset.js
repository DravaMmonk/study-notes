// A studio workspace's pending changeset (games/DESIGN.md 6.7), the same in both workspaces: every edit is an operation
// added to it; the server runs it without writing (the preview tool) and answers with the content it leaves, every line
// of the check and each file it changes. A preview comes in two steps, so editing stays quick on a big game: at once the
// content the changeset leaves, checked against the vocabulary only; then, a moment after the last edit and one at a
// time, the whole check (the domain's own: every reference run). Applying writes the changeset (modify); undo runs the
// change log's. `scope` is the workspace's side ('package' or 'game'): the server runs only its operations.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tr } from '../shell/i18n.js'
import { call } from './api.js'
import { pushOp } from './form.js'

const QUICK = 120 // ms after an edit before its content is previewed
const SETTLE = 700 // ms after the last edit before the whole check starts

export function useChangeset(game, scope) {
  const [ops, setOps] = useState([])
  const [redo, setRedo] = useState([]) // operations taken back, the last first to come back
  const [why, setWhy] = useState('')
  const [shown, setShown] = useState(null) // the last quick preview that left a content
  const [last, setLast] = useState(null) // the last quick preview (an operation may have failed)
  const [checked, setChecked] = useState(null) // the last whole check: { key, ok, lines, problems }
  const [base, setBase] = useState(null) // the content as written, before the pending changes
  // The seq of the change log's last entry when the game was loaded: a change is written only onto it.
  const [head, setHead] = useState(null)
  const [busy, setBusy] = useState(false)
  const [rev, setRev] = useState(0) // bumped when the files change (apply, undo)
  const [saving, setSaving] = useState(false)
  const [said, setSaid] = useState(null) // what the last apply or undo said

  // A game opened: nothing pending.
  useEffect(() => {
    setShown(null)
    setLast(null)
    setChecked(null)
    setOps([])
    setRedo([])
  }, [game, scope])
  useEffect(() => {
    if (!game) return
    call('preview', { game, scope, check: false }).then((r) => { setBase(r.content); setHead(r.head) }).catch(() => setBase(null))
  }, [game, scope, rev])

  const changeset = useMemo(() => ({ ...(why && { why }), ops }), [why, ops])
  const key = `${game}|${scope}|${rev}|${JSON.stringify(changeset)}`

  // The quick preview of every change of the pending changeset.
  const seq = useRef(0)
  useEffect(() => {
    if (!game) return undefined
    const no = ++seq.current
    setBusy(true)
    const timer = window.setTimeout(async () => {
      const r = await call('preview', { game, scope, changeset, check: false }).catch((error) => ({ ok: false, problems: [error.message], content: null, failed: null }))
      if (no !== seq.current) return
      setLast(r)
      if (r.content) setShown({ ...r, ops: changeset.ops })
      setBusy(false)
    }, ops.length ? QUICK : 0)
    return () => window.clearTimeout(timer)
  }, [game, scope, changeset, rev, ops.length])

  // The whole check: one at a time, always of the latest changeset once edits settle.
  const wanted = useRef(null)
  const checking = useRef(false)
  const runCheck = useCallback(async () => {
    if (checking.current) return
    checking.current = true
    for (;;) {
      const job = wanted.current
      const r = await call('preview', { game: job.game, scope: job.scope, changeset: job.changeset }).catch((error) => ({ ok: false, lines: [], problems: [error.message], failed: null }))
      if (wanted.current === job) {
        setChecked({ key: job.key, ok: r.ok, lines: r.lines ?? [], problems: r.problems ?? [], failed: r.failed, order: r.order ?? [] })
        break
      }
    }
    checking.current = false
  }, [])
  // The slow calls wait for the first content, so a game opens on its quick preview.
  const loaded = Boolean(shown)
  useEffect(() => {
    if (!loaded) return undefined
    wanted.current = { game, scope, changeset, key }
    const timer = window.setTimeout(runCheck, changeset.ops.length ? SETTLE : 0)
    return () => window.clearTimeout(timer)
  }, [game, scope, changeset, key, runCheck, loaded])

  const savingRef = useRef(false)
  const opsNow = useRef(ops)
  opsNow.current = ops
  const redoNow = useRef(redo)
  redoNow.current = redo
  // An edit (standing for the last when it edits the same thing), several operations at once, the last taken back and put again.
  const edit = useCallback((op) => { if (!savingRef.current) { setOps((list) => pushOp(list, op)); setRedo([]) } }, [])
  const addOps = useCallback((list, reason = null) => {
    if (savingRef.current) return
    setOps((now) => [...now, ...list])
    setRedo([])
    if (reason) setWhy((w) => w || reason)
  }, [])
  const back = useCallback((k) => {
    const now = opsNow.current
    if (k >= now.length) return
    setRedo((r) => [...r, ...now.slice(k).reverse()])
    setOps(now.slice(0, k))
  }, [])
  const again = useCallback(() => {
    const r = redoNow.current
    if (!r.length) return
    setOps((now) => [...now, r.at(-1)])
    setRedo(r.slice(0, -1))
  }, [])
  const remove = (k) => { setOps((list) => list.filter((_, i) => i !== k)); setRedo([]) }
  const discard = () => {
    if (!window.confirm(tr('确定放弃所有待定操作吗？', 'Discard all pending operations?'))) return
    setOps([])
    setRedo([])
  }
  const open = (cs) => { setOps(cs.ops); setRedo([]); setWhy(cs.why ?? '') }
  const apply = async () => {
    if (savingRef.current) return false
    savingRef.current = true
    setSaving(true)
    try {
      const r = await call('modify', { game, scope, changeset: { ...changeset, by: 'studio' }, base: head })
      setSaid(r.ok ? { ok: true, text: r.says.join('; ') } : { ok: false, text: r.problems.join('\n') })
      if (r.ok) {
        setOps([])
        setRedo([])
        setWhy('')
        setRev((n) => n + 1)
      }
      return r.ok
    } catch (error) {
      setSaid({ ok: false, text: error.message })
      return false
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  const undo = async (no) => {
    const r = await call('undo', { game, seq: no })
    setSaid(r.ok ? { ok: true, text: r.says.join('; ') } : { ok: false, text: r.problems.join('\n') })
    if (r.ok) setRev((n) => n + 1)
  }

  const fresh = checked?.key === key
  // The check's lines: the whole check's when it is of these changes, else the quick one's (the content against its
  // vocabulary) over the last whole check's other lines.
  const lines = useMemo(() => {
    if (!checked) return shown?.lines ?? []
    if (fresh) return checked.lines
    return [...(shown?.lines ?? []), ...checked.lines.filter((l) => !l.text.startsWith('content: '))]
  }, [checked, fresh, shown])
  const result = { ok: fresh && checked.ok, problems: last && !last.content ? last.problems : fresh ? checked.problems : [], failed: last?.failed ?? null, says: last?.says ?? shown?.says, fresh }
  return {
    ops, setOps, redo, why, setWhy, shown, last, checked, base, busy, rev, saving, said, savingRef, changeset, key, fresh, lines, result,
    content: shown?.content ?? null, edit, addOps, back, again, remove, discard, open, apply, undo,
  }
}
