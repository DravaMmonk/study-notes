// A line diff of two texts, printed as a unified diff (as git prints one), for previewing a changeset.

/** The lines of `a` and `b` as [[' ' | '-' | '+', line]], the longest common run of lines kept. */
export function lineDiff(a, b) {
  const x = a.split('\n')
  const y = b.split('\n')
  let head = 0
  while (head < x.length && head < y.length && x[head] === y[head]) head++
  let tail = 0
  while (tail < x.length - head && tail < y.length - head && x[x.length - 1 - tail] === y[y.length - 1 - tail]) tail++
  const p = x.slice(head, x.length - tail)
  const q = y.slice(head, y.length - tail)
  // Longest common subsequence of the middle, from the end.
  const w = q.length + 1
  const best = new Uint32Array((p.length + 1) * w)
  for (let i = p.length - 1; i >= 0; i--) for (let j = q.length - 1; j >= 0; j--) best[i * w + j] = p[i] === q[j] ? best[(i + 1) * w + j + 1] + 1 : Math.max(best[(i + 1) * w + j], best[i * w + j + 1])
  const mid = []
  let i = 0
  let j = 0
  while (i < p.length || j < q.length) {
    if (i < p.length && j < q.length && p[i] === q[j]) { mid.push([' ', p[i]]); i++; j++ }
    else if (i < p.length && (j === q.length || best[(i + 1) * w + j] >= best[i * w + j + 1])) mid.push(['-', p[i++]])
    else mid.push(['+', q[j++]])
  }
  return [...x.slice(0, head).map((l) => [' ', l]), ...mid, ...x.slice(x.length - tail).map((l) => [' ', l])]
}

/** `a` → `b` as a unified diff of `file` with `context` lines around each change; '' when they are the same. */
export function unified(file, a, b, context = 3) {
  if (a === b) return ''
  const lines = lineDiff(a ?? '', b ?? '')
  const hunks = []
  let oldLine = 1
  let newLine = 1
  let hunk = null
  let quiet = 0
  lines.forEach(([kind, line], k) => {
    const near = lines.slice(k + 1, k + 1 + context).some(([c]) => c !== ' ')
    if (kind !== ' ' || near || (hunk && quiet < context)) {
      if (!hunk) {
        hunk = { a: oldLine, b: newLine, lines: [] }
        hunks.push(hunk)
      }
      hunk.lines.push(`${kind}${line}`)
      quiet = kind === ' ' ? quiet + 1 : 0
    } else hunk = null
    if (kind !== '+') oldLine++
    if (kind !== '-') newLine++
  })
  const count = (h, sign) => h.lines.filter((l) => l[0] === ' ' || l[0] === sign).length
  return [`--- ${a === null ? '/dev/null' : `a/${file}`}`, `+++ ${b === null ? '/dev/null' : `b/${file}`}`, ...hunks.flatMap((h) => [`@@ -${h.a},${count(h, '-')} +${h.b},${count(h, '+')} @@`, ...h.lines])].join('\n')
}
