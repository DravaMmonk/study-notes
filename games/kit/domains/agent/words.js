// What the agent domain's cards are called and what they do, and an action, a context entry and a test failure in
// words: for the boards, the tray and the components box (ui/catalog.js adds how each card looks) and for a blind
// session (play.js). A part's description says only what it does (games/DESIGN.md 4); the model's grows with the course
// (`revisions`): what it does in a loop is written in once the loop is there.
import { L, T } from '../../shell/i18n.js'
import { segOf } from './world.js'


export const WORDS = {
  model: {
    name: T('模型', 'Model'),
    desc: T(
      '读入上下文，给出一个动作：写修改，或者说「做完了」。它只知道上下文里的内容：看得到要改的函数，就照 issue 修改；看不到，就编造一个不存在的函数。上下文超出窗口时，从最早的部分开始丢弃，它不知道丢了什么。容易写错的地方，它第一次会写错，看到这一处失败的测试报告后才改对。写完它认为该写的内容，它就说「做完了」。',
    ),
    revisions: [{
      at: '2-1',
      desc: T(
        '读入上下文，给出一个动作：写修改、读文件、请求目录、请求运行测试，或者说「做完了」。它只知道上下文里的内容：看得到要改的函数，就照 issue 修改；知道函数在哪个文件，就请求读那个文件；不知道在哪，就请求目录；issue 只描述了症状，就先请求运行测试。没有得到回应的请求，它不会再提，而是换下一种办法，最后编造一个不存在的函数。上下文超出窗口时，从最早的部分开始丢弃，它不知道丢了什么。容易写错的地方，它第一次会写错，看到这一处失败的测试报告后才改对。写完它认为该写的内容，它就说「做完了」。',
      ),
    }],
  },
  concat: { name: T('拼接', 'Concat'), desc: T('把至多三段上下文按 1、2、3 的顺序拼成一段，跳过未接线的接口。') },
  read: {
    name: T('读文件'),
    desc: T('读取仓库中设置里选定的文件，作为一段上下文。'),
    revisions: [{ at: '2-1', desc: T('读取仓库中的一个文件，作为一段上下文。输入口未接线时，读取设置里选定的文件；接入模型的动作时，读取模型请求的文件，遇到其他动作则不输出。') }],
  },
  list: { name: T('目录'), desc: T('模型请求目录时，列出仓库中的每个文件及文件中的函数；遇到其他动作则不输出。') },
  test: { name: T('运行测试', 'Run tests'), desc: T('模型说「做完了」或请求运行测试时，运行一遍测试：「报告」列出每一处失败，「通过」表示是否全部通过。遇到其他动作时，报告为空，「通过」显示「未运行」。') },
  issue: { name: T('Issue'), desc: T('要修复的问题，即这次的任务。') },
  history: { name: T('历史'), desc: T('之前各轮的记录：模型每一轮的动作（由机器自动记录），以及接到「留到下一轮」的内容。') },
  code: { name: T('代码'), desc: T('和 issue 一起给的代码。') },
  repo: { name: T('仓库'), desc: T('收到写修改的动作时，把修改写入仓库。') },
  out: { name: T('留到下一轮'), desc: T('接到这里的上下文，下一轮出现在历史里。') },
  stop: { name: T('停'), desc: T('收到「做完了」的动作，或「通过」为是时，机器停止。') },
}

export const PORT_LABELS = {
  concat: { a: '1', b: '2', c: '3' },
  read: { ask: T('请求') },
  list: { ask: T('请求') },
  test: { when: T('动作', 'action') },
}
export const OUT_LABELS = { test: { out: T('报告'), green: T('通过', 'Pass') } }

/** An action in words. */
export function actionText(action) {
  if (!action) return T('—')
  if (action.type === 'read') return T(`读 ${action.file}`, `Read ${action.file}`)
  if (action.type === 'list') return T('请求目录')
  if (action.type === 'test') return T('请求运行测试')
  if (action.type === 'done') return action.why === 'no-issue' ? T('做完了（上下文中没有任务）') : T('做完了')
  const madeup = action.edits.filter((e) => e.how === 'madeup').length
  const names = action.edits.map((e) => segOf(e.at)).join(', ')
  return madeup ? T(`写 ${names}（编了 ${madeup} 处）`, `Write ${names} (${madeup} made up)`) : T(`写 ${names}`, `Write ${names}`)
}

/** An entry of a context in a few words. */
export function entryText(entry) {
  if (entry.kind === 'issue') return T(`issue：${L(entry.issue.title)}`, `issue: ${L(entry.issue.title)}`)
  if (entry.kind === 'file') return entry.missing ? T(`${entry.file}（不存在）`, `${entry.file} (no such file)`) : T(entry.file, entry.file)
  if (entry.kind === 'list') return T(`目录（${entry.files.length} 个文件）`, `File list (${entry.files.length} files)`)
  if (entry.kind === 'report') return entry.green ? T('测试：全部通过') : T(`测试：${entry.fails.length} 处失败`, `Tests: ${entry.fails.length} failing`)
  return actionText(entry.action)
}

const WHY = { missing: T('未修改'), wrong: T('改错了'), madeup: T('调用了不存在的函数') }
export const whyText = (why) => WHY[why]
