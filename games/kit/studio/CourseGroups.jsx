import { useEffect, useState } from 'react'
import { ChevronRight, Plus, Save, Trash2 } from 'lucide-react'
import { getLang, L, tr } from '../shell/i18n.js'
import { call } from './api.js'
import { Chips } from './Picker.jsx'

const EMPTY = []

export function useCourseGroups(game) {
  const [state, setState] = useState({})
  const current = state[game]
  const update = (fields) => setState((old) => ({ ...old, [game]: { ...old[game], ...fields } }))

  useEffect(() => {
    let active = true
    const settle = (fields) => {
      if (active) setState((old) => ({ ...old, [game]: old[game]?.base ? old[game] : fields }))
    }
    call('studio_groups', { game }).then(
      (base) => settle({ base, draft: base }),
      (error) => settle({ error: error.message }),
    )
    return () => { active = false }
  }, [game])

  const save = async () => {
    if (!current?.base || current.saving || current.base === current.draft) return
    update({ saving: true, error: null, saved: false })
    try {
      const base = await call('studio_groups', { game, groups: current.draft, base: current.base })
      update({ base, draft: base, saving: false, saved: true })
    } catch (error) {
      update({ error: error.message, saving: false })
    }
  }
  return {
    groups: current?.base ?? EMPTY,
    draft: current?.draft ?? EMPTY,
    ready: Boolean(current?.base),
    changed: current?.base !== current?.draft,
    saving: current?.saving,
    error: current?.error,
    saved: current?.saved,
    save,
    edit: (draft) => update({ draft, saved: false, error: null }),
  }
}

export default function CourseGroups({ model, options }) {
  const [open, setOpen] = useState({})
  const { draft, ready, changed, saving, saved, error, save, edit } = model
  const members = new Set(draft.flatMap((group) => group.levels))
  const change = (id, fields) => edit(draft.map((group) => group.id === id ? { ...group, ...fields } : group))
  const add = () => {
    const id = crypto.randomUUID()
    edit([...draft, { id, title: '', levels: [] }])
    setOpen((old) => ({ ...old, [id]: true }))
  }

  return (
    <article className="arrange studio-groups">
      <header className="arrange-bar">
        <button type="button" className="kit-btn is-label" disabled={!ready || saving} onClick={add}>
          <Plus size={14} aria-hidden="true" />{tr('新增分组', 'Add group')}
        </button>
        <span className="kit-spacer" />
        <button type="button" className="kit-btn is-label arrange-save" disabled={!ready || !changed || saving} onClick={save}>
          <Save size={14} aria-hidden="true" />{saving ? tr('正在保存', 'Saving') : tr('保存分组', 'Save groups')}
        </button>
      </header>
      {(error || saved) && <p className={`arrange-saved ${error ? 'is-error' : ''}`} role="status">
        {error || tr('已保存分组。', 'Groups saved.')}
      </p>}
      {ready && !draft.length && <p className="studio-loading">{tr('还没有分组。', 'No groups yet.')}</p>}
      {draft.map(({ id, title, code, levels }) => {
        const name = L(title) || tr('未命名分组', 'Untitled group')
        return (
          <section className={`tree-era studio-group ${open[id] ? '' : 'is-folded'}`} key={id}>
            <button type="button" className="tree-group-head" aria-expanded={Boolean(open[id])}
              onClick={() => setOpen((old) => ({ ...old, [id]: !old[id] }))}>
              <span className="tree-fold"><ChevronRight size={12} aria-hidden="true" /></span>
              {code && <code>{code}</code>}{name}
            </button>
            {open[id] && <fieldset className="studio-group-fields" disabled={saving}>
              <label>{tr('组名', 'Group name')}
                <input value={L(title) ?? ''} onChange={(e) => change(id, { title: typeof title === 'string' ? e.target.value : { ...title, [getLang()]: e.target.value } })} />
              </label>
              <label>{tr('组代码', 'Group code')}
                <input value={code ?? ''} onChange={(e) => change(id, { code: e.target.value.trim() || undefined })} />
              </label>
              <div>
                <span>{tr('关卡', 'Levels')}</span>
                <Chips label={tr('添加关卡', 'Add level')} options={options.filter(({ value }) => levels.includes(value) || !members.has(value))}
                  values={levels} onSet={(next) => change(id, { levels: next })} />
              </div>
              <button type="button" className="kit-btn is-label" onClick={() => edit(draft.filter((group) => group.id !== id))}>
                <Trash2 size={13} aria-hidden="true" />{tr('删除分组', 'Delete group')}
              </button>
            </fieldset>}
          </section>
        )
      })}
    </article>
  )
}
