// The paper exercises use the same dominant-bit rule and binary conventions as the bus model.
import { bitsOf } from './bus.js'

export function paperAnswers(task) {
  return task.cases.map((entry) => {
    if (task.mode === 'line') {
      if (!entry.a || !entry.b || entry.a.length !== entry.b.length) throw new Error('line cases need equally long bit sequences')
      return entry.a.map((bit, index) => bit & entry.b[index]).join('')
    }
    if (task.mode === 'binary') {
      if (!Number.isInteger(entry.value) || entry.value < 0 || entry.value > 255) throw new Error('binary cases need a byte')
      return `${bitsOf(entry.value, 8).join('')} ${entry.value.toString(16).toUpperCase().padStart(2, '0')}`
    }
    if (task.mode === 'start') {
      if (!entry.bits) throw new Error('start cases need bits')
      let recessive = 0
      const starts = []
      entry.bits.forEach((bit, index) => { if (bit === 0) { if (recessive >= 11) starts.push(index); recessive = 0 } else recessive++ })
      return starts.length ? starts.join(',') : '-'
    }
    throw new Error('unknown paper exercise')
  })
}

export const paperMatches = (task, answers) => {
  const wanted = paperAnswers(task)
  return wanted.map((answer, index) => String(answers[index] ?? '').replace(/\s+/g, '').toUpperCase() === answer.replace(/\s+/g, '').toUpperCase())
}

export function paperProblems(task) {
  try {
    return task.solution.length === task.cases.length && paperMatches(task, task.solution).every(Boolean) ? [] : ['paper reference answers do not match the cases']
  } catch (error) { return [error.message] }
}

export function paperCase(task, entry) {
  if (task.mode === 'line') return { zh: `节点 A：${entry.a.join(' ')}　节点 B：${entry.b.join(' ')}`, en: `Node A: ${entry.a.join(' ')}   Node B: ${entry.b.join(' ')}` }
  if (task.mode === 'binary') return { zh: `十进制 ${entry.value}`, en: `Decimal ${entry.value}` }
  return { zh: `位序列（从 0 编号）：${entry.bits.join(' ')}`, en: `Bits (indexed from 0): ${entry.bits.join(' ')}` }
}
