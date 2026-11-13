// A judge reads a work and returns null or its first failure: { at?, check?, want?, got?, why }.
// Case indexes are zero-based. For a board, at is a card id or { tick, id? }.
const equal = (want, got) => want === got

export function cases(checks, inspect) {
  const judge = (work) => {
    for (const [check, example] of checks.entries()) {
      const fail = inspect(work, example, check)
      if (fail) return { ...fail, check }
    }
    return null
  }
  return Object.assign(judge, { checks })
}

export function ticks({ checked, want, got = (tick, id) => tick.outputs[id] ?? null, same = equal, why }) {
  return (steps) => {
    for (const step of steps) {
      for (const port of checked) {
        const expected = want(port.name)?.[step.tick]
        if (expected === undefined) continue
        const actual = got(step, port.name)
        if (!same(expected, actual)) {
          return { at: { tick: step.tick, id: port.name }, want: expected, got: actual, why: why(port, expected, actual, step.tick) }
        }
      }
    }
    return null
  }
}

export const property = (holds, failure) => (work) => holds(work) ? null : failure(work)

export function sameAs(want, { got = (work) => work, same = equal, at, why }) {
  return (work) => {
    const actual = got(work)
    return same(want, actual) ? null : { ...(at === undefined ? {} : { at }), want, got: actual, why: why(want, actual) }
  }
}

export function inOrder(...judges) {
  const judge = (work) => {
    for (const inspect of judges) {
      const fail = inspect(work)
      if (fail) return fail
    }
    return null
  }
  return Object.assign(judge, { checks: judges.flatMap((inspect) => inspect.checks ?? []) })
}

// Hide the examples from the presentation while still judging them and reporting the first failure.
export const hidden = (judge) => Object.assign((work) => judge(work), { checks: [] })
