// What the agent domain's cards are called and what they do, for the boards, the tray and the components box. A part's
// description says only what it does (games/DESIGN.md 4); the model's grows with the course (`revisions`): what it
// does in a loop is written in once the loop is there.
import { Brain, CircleStop, CornerDownLeft, Database, FileCode, FileText, FlaskConical, FolderTree, History, Layers, Ticket } from 'lucide-react'

const T = (zh, en) => ({ zh, en })

export const CARDS = {
  model: {
    name: T('模型', 'Model'), icon: Brain, family: 'model',
    desc: T(
      '读进一段上下文，给出一个动作：写修改，或者说做完了。它只知道上下文里的东西：要改的函数它看到了，就照 issue 写；没看到，就编一个不存在的函数。上下文超出窗口时，从最早的部分丢起，它不知道丢了什么。容易写错的地方，它第一次会写错，看到这一处失败的测试报告才改对。写完它认为该写的，它就说做完了。',
      'Reads a context and gives one action: a write, or done. It knows only what is in its context: a function it can see, it changes as the issue asks; one it cannot, it makes up a call to a function that does not exist. Past its window, a context is dropped from the oldest end, and it cannot tell what is gone. A tricky change it first gets wrong, and gets right once a failing test report of it is in view. Once it has written what it thinks it should, it says it is done.',
    ),
    revisions: [{
      at: '2-1',
      desc: T(
        '读进一段上下文，给出一个动作：写修改、读文件、要目录、跑测试，或者说做完了。它只知道上下文里的东西：要改的函数它看到了，就照 issue 写；知道在哪个文件，就要读那个文件；不知道在哪，就要目录；issue 只说了症状，就先要跑测试。没人回应的要求它不会再提，换下一种办法，最后编一个不存在的函数。上下文超出窗口时，从最早的部分丢起，它不知道丢了什么。容易写错的地方，它第一次会写错，看到这一处失败的测试报告才改对。写完它认为该写的，它就说做完了。',
        'Reads a context and gives one action: a write, a read, the file list, the tests, or done. It knows only what is in its context: a function it can see, it changes as the issue asks; one whose file it knows, it asks to read; one it cannot place, it asks for the file list; an issue that only tells a symptom, it asks for the tests first. An ask nobody answered it does not repeat: it tries the next way, and in the end makes up a call to a function that does not exist. Past its window, a context is dropped from the oldest end, and it cannot tell what is gone. A tricky change it first gets wrong, and gets right once a failing test report of it is in view. Once it has written what it thinks it should, it says it is done.',
      ),
    }],
  },
  concat: { name: T('拼接', 'Concat'), icon: Layers, family: 'context', desc: T('把至多三段上下文按 1、2、3 的顺序接成一段。没接的口跳过。', 'Joins up to three contexts into one, in the order 1, 2, 3. A port left open is skipped.') },
  read: {
    name: T('读文件', 'Read'), icon: FileText, family: 'tool',
    desc: T('读出仓库里的一个文件，作为一段上下文：读设置里选的那个文件。', 'Reads a file of the repository, as a context: the one picked in its setting.'),
    revisions: [{ at: '2-1', desc: T('读出仓库里的一个文件，作为一段上下文。输入口没接时，读设置里选的那个文件；接上模型的动作时，模型要读文件就读它要的那个，别的动作什么也不给。', 'Reads a file of the repository, as a context. With its input open, it reads the file picked in its setting; with the model’s action wired in, it reads the file the model asks for, and gives nothing on any other action.') }],
  },
  list: { name: T('目录', 'File list'), icon: FolderTree, family: 'tool', desc: T('模型要目录时，给出仓库里的每个文件和其中的函数；别的动作什么也不给。', 'When the model asks for the file list, gives every file of the repository and the functions in it; nothing on any other action.') },
  test: { name: T('跑测试', 'Run tests'), icon: FlaskConical, family: 'test', desc: T('模型说做完了或要求跑测试时，跑一遍测试：「报告」给出每一处失败，「通过」给出是否全部通过。别的动作时，报告是空的，通过是「没跑」。', 'When the model says it is done or asks for the tests, runs them: Report gives every failure, Pass whether they all pass. On any other action the report is empty and Pass reads “not run”.') },
  issue: { name: T('Issue', 'Issue'), icon: Ticket, family: 'given', desc: T('要修的问题：这一轮的任务。', 'The problem to fix: the task.') },
  history: { name: T('历史', 'History'), icon: History, family: 'given', desc: T('之前每一轮发生的事：模型每一轮的动作（机器自己记下），和接到「留到下一轮」的东西。', 'What happened in every turn before: the model’s action each turn (the machine records it), and whatever went into Keep.') },
  code: { name: T('代码', 'Code'), icon: FileCode, family: 'given', desc: T('和 issue 一起给的代码。', 'The code that comes with the issue.') },
  repo: { name: T('仓库', 'Repository'), icon: Database, family: 'end', desc: T('收到写修改的动作时，把修改写进仓库。', 'On a write action, puts the changes into the repository.') },
  out: { name: T('留到下一轮', 'Keep'), icon: CornerDownLeft, family: 'end', desc: T('接到这里的上下文，下一轮出现在历史里。', 'A context wired here shows up in the history next turn.') },
  stop: { name: T('停', 'Stop'), icon: CircleStop, family: 'end', desc: T('收到「做完了」的动作，或者「通过」为是时，机器停下。', 'The machine stops on a done action, or when Pass is yes.') },
}

export const PORT_LABELS = {
  concat: { a: '1', b: '2', c: '3' },
  read: { ask: T('要', 'ask') },
  list: { ask: T('要', 'ask') },
  test: { when: T('动作', 'action') },
}
export const OUT_LABELS = { test: { out: T('报告', 'Report'), green: T('通过', 'Pass') } }
