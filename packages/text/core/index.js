import { evaluatePlay, describeTask } from 'kernel'

export const answerPlay = {
  initial: () => '',
  read: value => typeof value === 'string' ? value : '',
  write: value => value,
  normalize: value => value,
  run(answer, { task }) {
    const rule = task.answerRule
    let pass
    switch (rule.type) {
      case 'exact': pass = answer === rule.answer; break
      case 'folded': {
        const fold = text => text.toLowerCase().replace(/\s/g, '')
        pass = fold(answer) === fold(rule.answer); break
      }
      case 'regex': pass = new RegExp(rule.pattern, rule.flags ?? '').test(answer); break
      case 'number': pass = answer.trim() !== '' && Number.isFinite(Number(answer)) && Math.abs(Number(answer) - rule.answer) <= rule.tolerance; break
      case 'oneOf': pass = rule.answers.includes(answer); break
      default: throw new Error(`unknown answer rule ${rule?.type}`)
    }
    return { answer, pass }
  },
  judge: report => ({ pass: report.pass, score: report.pass ? 1 : 0 }),
}

export function register(kernel) {
  kernel.play('text:answer', answerPlay)
  kernel.check('text:answers', ({ levels }) => levels.flatMap(level => level.tasks.filter(task => task.source.play === 'text:answer').map(({ source: task }) => {
    try {
      if (task.answerRule.type === 'number' && (!Number.isFinite(task.answerRule.tolerance) || task.answerRule.tolerance < 0)) throw new Error('tolerance must be nonnegative')
      if (task.answerRule.type === 'regex' && /[gy]/.test(task.answerRule.flags ?? '')) throw new Error('stateful regex flags are not allowed')
      const judge = work => answerPlay.judge(answerPlay.run(work, { task })).pass
      const pass = typeof task.referenceAnswer === 'string' && judge(task.referenceAnswer) && Array.isArray(task.wrongAnswers) && task.wrongAnswers.length > 0 && task.wrongAnswers.every(work => !judge(work))
      return { level: level.id, fail: !pass, text: `${task.taskId}: text answers ${pass ? 'PASS' : 'FAIL'}` }
    } catch (error) { return { level: level.id, fail: true, text: `${task.taskId}: ${error.message}` } }
  })))
  kernel.agent('text:answer', {
    observe: ({ task }) => ({ ...describeTask(task), choices: task.choices ?? null }),
    act: ({ task, kernel }, answer) => evaluatePlay(kernel, task, answer),
  })
}
