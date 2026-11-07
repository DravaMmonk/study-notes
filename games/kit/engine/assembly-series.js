// One assembled part may grow across a prerequisite chain. Revisions keep their own interface and passed board;
// a consumer sees only revisions on its path, and editing a board does not publish it until that task passes.
export function assemblySeries(revisions, { before, passed }) {
  const chains = new Map()
  for (const revision of revisions) {
    const type = revision.task.builds.type
    chains.set(type, [...(chains.get(type) ?? []), revision])
  }
  const availableAt = (revision, task) => !task || (revision.task.id === task.id
    ? revision.task.task <= task.task
    : before(revision.task.id, task.id))
  return {
    resolve(type, task = null, form = null) {
      const chain = chains.get(type)?.filter(r => (r.task.builds.form ?? null) === form)
      if (!chain?.length) return null
      const available = chain.filter(r => availableAt(r, task))
      const candidates = available.length ? available : chain.slice(0, 1)
      for (let k = candidates.length - 1; k >= 0; k--) if (passed(candidates[k].task)) return candidates[k]
      return candidates.at(-1)
    },
    forms(type, task = null) {
      return [...new Set((chains.get(type) ?? []).filter(r =>
        availableAt(r, task)).map(r => r.task.builds.form).filter(Boolean))]
    },
    problems() {
      return [...chains.values()].flatMap((chain) => chain.slice(1).flatMap((r, k) =>
        before(chain[k].task.id, r.task.id) ? [] : [`${r.task.id}: upgrades of ${r.task.builds.type} must form a prerequisite chain`]))
    },
  }
}
