import { baselineValue } from './baseline-value.js'

export async function taskReports(spec, providers = []) {
  for (const provider of providers) {
    const records = provider.baselineReports?.({ spec, value: baselineValue })
    if (records) return records.map(baselineValue)
  }
  if (spec.levels.some(level => level.tasks.length)) throw new Error('no registered baseline observer')
  return []
}
