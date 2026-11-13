/** A level's tests followed by its hidden ones, each marked hidden. */
export const withHidden = (level) => (level.hidden?.length ? { ...level, tests: [...level.tests, ...level.hidden.map((t) => ({ ...t, hidden: true }))] } : level)
