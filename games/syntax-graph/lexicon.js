// 句法之图's words: the vocabulary of a computer science paper and its review. Only data: what each word is to the
// grammar (games/kit/domains/syntax/engine/lexicon.js says the shape). The grammar itself (frames, the times and the
// questions that set them, the forms each time asks for, agreement, case) is the syntax domain's, the same for every
// level, and the machine works the forms out for the player.

const T = (zh, en) => ({ zh, en })
const np = (text, ent, number, sense) => ({ text, ent, number, sense })
const pron = (nom, acc, number, person) => ({ nom, acc, number, person })
const verb = (base, s, past, pp, ing, frame, sense, more = {}) => ({ forms: { base, s, past, pp, ing }, frame, sense, ...more })

export const nouns = {
  model: np('the model', 'model', 'sg', T('模型', 'model')),
  models: np('the models', 'model', 'pl', T('模型', 'models')),
  algorithm: np('the algorithm', 'algorithm', 'sg', T('算法', 'algorithm')),
  algorithms: np('the algorithms', 'algorithm', 'pl', T('算法', 'algorithms')),
  method: np('the method', 'method', 'sg', T('方法', 'method')),
  baseline: np('the baseline', 'baseline', 'sg', T('基线', 'baseline')),
  baselines: np('the baselines', 'baseline', 'pl', T('基线', 'baselines')),
  ablation: np('the ablation', 'ablation', 'sg', T('消融实验', 'ablation')),
  committee: np('the committee', 'committee', 'sg', T('程序委员会', 'programme committee')),
  paper: np('the paper', 'paper', 'sg', T('论文', 'paper')),
  papers: np('the papers', 'paper', 'pl', T('论文', 'papers')),
  authors: np('the authors', 'author', 'pl', T('作者', 'authors')),
  author: np('the author', 'author', 'sg', T('作者', 'author')),
  reviewers: np('the reviewers', 'reviewer', 'pl', T('审稿人', 'reviewers')),
  reviewer: np('the reviewer', 'reviewer', 'sg', T('审稿人', 'reviewer')),
  proof: np('the proof', 'proof', 'sg', T('证明', 'proof')),
  code: np('the code', 'code', 'sg', T('代码', 'code')),
  editor: np('the editor', 'editor', 'sg', T('编辑', 'editor')),
  rebuttal: np('a rebuttal', 'rebuttal', 'sg', T('答辩意见', 'rebuttal')),
  rebuttals: np('rebuttals', 'rebuttal', 'pl', T('答辩意见', 'rebuttals')),
  version: np('the final version', 'version', 'sg', T('终稿', 'final version')),
  versions: np('the final versions', 'version', 'pl', T('终稿', 'final versions')),
  results: np('the results', 'result', 'pl', T('结果', 'results')),
  decision: np('the decision', 'decision', 'sg', T('决定', 'decision')),
  typo: np('the typo', 'typo', 'sg', T('笔误', 'typo')),
  discussion: np('the discussion', 'discussion', 'sg', T('讨论', 'discussion')),
  data: np('the data', 'data', 'sg', T('数据', 'data')),
  dataset: np('the old dataset', 'dataset', 'sg', T('旧数据集', 'old dataset')),
  labels: np('labels', 'label', 'pl', T('标注', 'labels')),
  bug: np('the bug', 'bug', 'sg', T('程序错误', 'bug')),
  claim: np('the claim', 'claim', 'sg', T('主张', 'claim')),
  experiment: np('the experiment', 'experiment', 'sg', T('实验', 'experiment')),
  experiments: np('the experiments', 'experiment', 'pl', T('实验', 'experiments')),
  // Pronouns name whatever the level's context makes them name (a level's `refer`), in the case their place asks for.
  we: pron('we', 'us', 'pl', 1),
  they: pron('they', 'them', 'pl', 3),
  it: pron('it', 'it', 'sg', 3),
}

export const verbs = {
  converge: verb('converge', 'converges', 'converged', 'converged', 'converging', 'intransitive', T('收敛', 'converge'), { subject: 'THEME' }),
  fail: verb('fail', 'fails', 'failed', 'failed', 'failing', 'intransitive', T('失败', 'fail'), { subject: 'THEME' }),
  terminate: verb('terminate', 'terminates', 'terminated', 'terminated', 'terminating', 'intransitive', T('终止', 'terminate'), { subject: 'THEME' }),
  outperform: verb('outperform', 'outperforms', 'outperformed', 'outperformed', 'outperforming', 'transitive', T('优于', 'outperform')),
  accept: verb('accept', 'accepts', 'accepted', 'accepted', 'accepting', 'transitive', T('录用', 'accept')),
  reject: verb('reject', 'rejects', 'rejected', 'rejected', 'rejecting', 'transitive', T('拒稿', 'reject')),
  evaluate: verb('evaluate', 'evaluates', 'evaluated', 'evaluated', 'evaluating', 'transitive', T('评估', 'evaluate')),
  add: verb('add', 'adds', 'added', 'added', 'adding', 'transitive', T('补上', 'add')),
  release: verb('release', 'releases', 'released', 'released', 'releasing', 'transitive', T('发布', 'release')),
  update: verb('update', 'updates', 'updated', 'updated', 'updating', 'transitive', T('更新', 'update')),
  check: verb('check', 'checks', 'checked', 'checked', 'checking', 'transitive', T('核查', 'check')),
  withdraw: verb('withdraw', 'withdraws', 'withdrew', 'withdrawn', 'withdrawing', 'transitive', T('撤稿', 'withdraw')),
  read: verb('read', 'reads', 'read', 'read', 'reading', 'transitive', T('读', 'read')),
  send: verb('send', 'sends', 'sent', 'sent', 'sending', 'ditransitive', T('发送', 'send')),
  'send-to': verb('send', 'sends', 'sent', 'sent', 'sending', 'dative', T('发送', 'send'), { lemma: 'send' }),
  submit: verb('submit', 'submits', 'submitted', 'submitted', 'submitting', 'transitive', T('提交', 'submit')),
  show: verb('show', 'shows', 'showed', 'shown', 'showing', 'transitive', T('展示', 'show')),
  announce: verb('announce', 'announces', 'announced', 'announced', 'announcing', 'transitive', T('公布', 'announce')),
  fix: verb('fix', 'fixes', 'fixed', 'fixed', 'fixing', 'transitive', T('改正', 'fix')),
  revise: verb('revise', 'revises', 'revised', 'revised', 'revising', 'transitive', T('修改', 'revise')),
  run: verb('run', 'runs', 'ran', 'run', 'running', 'transitive', T('运行', 'run')),
  extend: verb('extend', 'extends', 'extended', 'extended', 'extending', 'transitive', T('扩展', 'extend')),
  train: verb('train', 'trains', 'trained', 'trained', 'training', 'transitive', T('训练', 'train')),
  collect: verb('collect', 'collects', 'collected', 'collected', 'collecting', 'transitive', T('收集', 'collect')),
  test: verb('test', 'tests', 'tested', 'tested', 'testing', 'transitive', T('测试', 'test')),
  support: verb('support', 'supports', 'supported', 'supported', 'supporting', 'transitive', T('支持', 'support')),
  propose: verb('propose', 'proposes', 'proposed', 'proposed', 'proposing', 'transitive', T('提出', 'propose')),
  require: verb('require', 'requires', 'required', 'required', 'requiring', 'transitive', T('需要', 'require')),
  overfit: verb('overfit', 'overfits', 'overfitted', 'overfitted', 'overfitting', 'intransitive', T('过拟合', 'overfit'), { subject: 'THEME' }),
  use: verb('use', 'uses', 'used', 'used', 'using', 'transitive', T('使用', 'use')),
}
