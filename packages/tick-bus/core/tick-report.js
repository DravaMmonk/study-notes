import { ticks, valueText } from 'kernel'

export function tickJudge({ show = valueText, ...options }) {
  return ticks({
    ...options,
    why: (port) => ({ relation: 'output', subject: port.label, show }),
  })
}

export function tickReport(steps, fail) {
  if (!fail) return { ticks: steps }
  return { ticks: steps.map((step) => step.tick === fail.at.tick ? { ...step, failed: fail } : step), fail }
}
