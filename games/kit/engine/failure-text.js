import { T, sideOf } from '../shell/i18n.js'

/** Format the first failure, with its values when the relation gives them meaning. */
export function failureText(failure) {
  if (!failure) return null
  const { why, want, got, at } = failure
  if (why?.relation === 'evaluates') return T(
    `${sideOf(why.subject, 'zh')} 应当算出 ${sideOf(why.show(want), 'zh')}，现在算出 ${sideOf(why.show(got), 'zh')}`,
    `${sideOf(why.subject, 'en')} should work out to ${sideOf(why.show(want), 'en')}, but works out to ${sideOf(why.show(got), 'en')}`,
  )
  if (why?.relation === 'derives') {
    const { given, subject } = why
    const start = given.en.charAt(0).toUpperCase() + given.en.slice(1)
    return want
      ? T(`${given.zh}时，「${subject.zh}」应当可推导，这份声明却推导不出。`, `${start}, “${subject.en}” should be derivable, but this declaration does not derive it.`)
      : T(`${given.zh}时，「${subject.zh}」不应当可推导，这份声明却推导出了它。`, `${start}, “${subject.en}” should not be derivable, but this declaration derives it.`)
  }
  if (why?.relation === 'order') return T(
    `「${sideOf(why.subject, 'zh')}」：${why.words.zh}应当是 ${why.show(want, 'zh')}，这块板给出 ${why.show(got, 'zh')}。`,
    `“${sideOf(why.subject, 'en')}”: ${why.words.en} should be ${why.show(want, 'en')}; the board gives ${why.show(got, 'en')}.`,
  )
  if (why?.relation === 'output') {
    const given = why.show(want)
    const actual = why.show(got)
    const zh = `「${sideOf(why.subject, 'zh')}」应当是 ${sideOf(given, 'zh')}，这块板给出 ${sideOf(actual, 'zh')}。`
    const en = `“${sideOf(why.subject, 'en')}” should be ${sideOf(given, 'en')}; the board gives ${sideOf(actual, 'en')}.`
    return at?.tick === undefined ? T(zh, en) : T(`第 ${at.tick} 拍，${zh}`, `At tick ${at.tick}, ${en}`)
  }
  return why
}
