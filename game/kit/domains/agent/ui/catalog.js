// What the agent domain's cards are called and what they do, for the boards, the tray and the components box. A part's
// description says only what it does (games/DESIGN.md 4); the model's grows with the course (`revisions`): what it
// does in a loop is written in once the loop is there.
import { Brain, CircleStop, CornerDownLeft, Database, FileCode, FileText, FlaskConical, FolderTree, History, Layers, Ticket } from 'lucide-react'

const T = (zh, en) => ({ zh, en })

export const CARDS = {
  model: {
    name: T('模型', 'Model'), icon: Brain, family: 'model',
    desc: T(
      '读入上下文，给出一个动作：写修改，或者说「做完了」。它只知道上下文里的内容：看得到要改的函数，就照 issue 修改；看不到，就编造一个不存在的函数。上下文超出窗口时，从最早的部分开始丢弃，它不知道丢了什么。容易写错的地方，它第一次会写错，看到这一处失败的测试报告后才改对。写完它认为该写的内容，它就说「做完了」。',
      'Reads a context and returns one action: a write, or done. It knows only what is in its context. If it can see the function to change, it changes it as the issue asks; if not, it invents a call to a function that does not exist. When the context exceeds the window, the oldest entries are dropped first, and the model cannot tell what is missing. It gets a tricky change wrong the first time and fixes it once a failing test report on it is in view. When it has written everything it thinks it should, it says it is done.',
    ),
    revisions: [{
      at: '2-1',
      desc: T(
        '读入上下文，给出一个动作：写修改、读文件、请求目录、请求运行测试，或者说「做完了」。它只知道上下文里的内容：看得到要改的函数，就照 issue 修改；知道函数在哪个文件，就请求读那个文件；不知道在哪，就请求目录；issue 只描述了症状，就先请求运行测试。没有得到回应的请求，它不会再提，而是换下一种办法，最后编造一个不存在的函数。上下文超出窗口时，从最早的部分开始丢弃，它不知道丢了什么。容易写错的地方，它第一次会写错，看到这一处失败的测试报告后才改对。写完它认为该写的内容，它就说「做完了」。',
        'Reads a context and returns one action: a write, a read, a request for the file list, a request for a test run, or done. It knows only what is in its context. If it can see the function to change, it changes it as the issue asks; if it knows which file holds the function, it asks to read that file; if not, it asks for the file list; if the issue describes only a symptom, it asks for a test run first. It does not repeat a request that went unanswered; it tries the next option, and in the end invents a call to a function that does not exist. When the context exceeds the window, the oldest entries are dropped first, and the model cannot tell what is missing. It gets a tricky change wrong the first time and fixes it once a failing test report on it is in view. When it has written everything it thinks it should, it says it is done.',
      ),
    }],
  },
  concat: { name: T('拼接', 'Concat'), icon: Layers, family: 'context', desc: T('把至多三段上下文按 1、2、3 的顺序拼成一段，跳过未接线的接口。', 'Joins up to three contexts into one, in the order 1, 2, 3, skipping unconnected ports.') },
  read: {
    name: T('读文件', 'Read'), icon: FileText, family: 'tool',
    desc: T('读取仓库中设置里选定的文件，作为一段上下文。', 'Reads the file chosen in its setting from the repository, as a context.'),
    revisions: [{ at: '2-1', desc: T('读取仓库中的一个文件，作为一段上下文。输入口未接线时，读取设置里选定的文件；接入模型的动作时，读取模型请求的文件，遇到其他动作则不输出。', 'Reads a file from the repository, as a context. With its input unconnected, it reads the file chosen in its setting; with the model’s action wired in, it reads the file the model requests and outputs nothing for any other action.') }],
  },
  list: { name: T('目录', 'File list'), icon: FolderTree, family: 'tool', desc: T('模型请求目录时，列出仓库中的每个文件及文件中的函数；遇到其他动作则不输出。', 'When the model requests the file list, lists every file in the repository with its functions; outputs nothing for any other action.') },
  test: { name: T('运行测试', 'Run tests'), icon: FlaskConical, family: 'test', desc: T('模型说「做完了」或请求运行测试时，运行一遍测试：「报告」列出每一处失败，「通过」表示是否全部通过。遇到其他动作时，报告为空，「通过」显示「未运行」。', 'When the model says it is done or requests a test run, runs the tests: Report lists every failure, and Pass shows whether they all pass. For any other action, Report is empty and Pass reads “Not run”.') },
  issue: { name: T('Issue', 'Issue'), icon: Ticket, family: 'given', desc: T('要修复的问题，即这次的任务。', 'The problem to fix: the task.') },
  history: { name: T('历史', 'History'), icon: History, family: 'given', desc: T('之前各轮的记录：模型每一轮的动作（由机器自动记录），以及接到「留到下一轮」的内容。', 'A record of earlier turns: the model’s action in each (recorded by the machine) and whatever was wired into Keep.') },
  code: { name: T('代码', 'Code'), icon: FileCode, family: 'given', desc: T('和 issue 一起给的代码。', 'The code that comes with the issue.') },
  repo: { name: T('仓库', 'Repository'), icon: Database, family: 'end', desc: T('收到写修改的动作时，把修改写入仓库。', 'On a write action, applies the changes to the repository.') },
  out: { name: T('留到下一轮', 'Keep'), icon: CornerDownLeft, family: 'end', desc: T('接到这里的上下文，下一轮出现在历史里。', 'A context wired here shows up in the history next turn.') },
  stop: { name: T('停', 'Stop'), icon: CircleStop, family: 'end', desc: T('收到「做完了」的动作，或「通过」为是时，机器停止。', 'Stops the machine on a done action, or when Pass is yes.') },
}

export const PORT_LABELS = {
  concat: { a: '1', b: '2', c: '3' },
  read: { ask: T('请求', 'request') },
  list: { ask: T('请求', 'request') },
  test: { when: T('动作', 'action') },
}
export const OUT_LABELS = { test: { out: T('报告', 'Report'), green: T('通过', 'Pass') } }
