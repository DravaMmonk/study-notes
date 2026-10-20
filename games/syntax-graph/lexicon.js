// 句法之图's words: the vocabulary of a computer science paper and its review. Only data: what each word is to the
// grammar (games/kit/domains/syntax/engine/lexicon.js says the shape). The grammar itself (frames, agreement, case) is
// the syntax domain's, the same for every level.

const np = (text, ent, number, sense) => ({ text, ent, number, sense })
const pron = (text, number, person, kase) => ({ text, number, person, case: kase })
const verb = (base, s, past, pp, ing, frame, sense, more = {}) => ({ forms: { base, s, past, pp, ing }, frame, sense, ...more })

export const nouns = {
  model: np('the model', 'model', 'sg', { zh: '模型', en: 'model' }),
  models: np('the models', 'model', 'pl', { zh: '模型', en: 'models' }),
  experiment: np('the experiment', 'experiment', 'sg', { zh: '实验', en: 'experiment' }),
  experiments: np('the experiments', 'experiment', 'pl', { zh: '实验', en: 'experiments' }),
  algorithm: np('the algorithm', 'algorithm', 'sg', { zh: '算法', en: 'algorithm' }),
  algorithms: np('the algorithms', 'algorithm', 'pl', { zh: '算法', en: 'algorithms' }),
  method: np('the method', 'method', 'sg', { zh: '方法', en: 'method' }),
  baseline: np('the baseline', 'baseline', 'sg', { zh: '基线', en: 'baseline' }),
  baselines: np('the baselines', 'baseline', 'pl', { zh: '基线', en: 'baselines' }),
  committee: np('the committee', 'committee', 'sg', { zh: '程序委员会', en: 'programme committee' }),
  committees: np('the committees', 'committee', 'pl', { zh: '程序委员会', en: 'committees' }),
  paper: np('the paper', 'paper', 'sg', { zh: '论文', en: 'paper' }),
  papers: np('the papers', 'paper', 'pl', { zh: '论文', en: 'papers' }),
  author: np('the author', 'author', 'sg', { zh: '作者', en: 'author' }),
  authors: np('the authors', 'author', 'pl', { zh: '作者', en: 'authors' }),
  reviewer: np('the reviewer', 'reviewer', 'sg', { zh: '审稿人', en: 'reviewer' }),
  reviewers: np('the reviewers', 'reviewer', 'pl', { zh: '审稿人', en: 'reviewers' }),
  proof: np('the proof', 'proof', 'sg', { zh: '证明', en: 'proof' }),
  proofs: np('the proofs', 'proof', 'pl', { zh: '证明', en: 'proofs' }),
  extension: np('an extension', 'extension', 'sg', { zh: '延期', en: 'extension' }),
  extensions: np('extensions', 'extension', 'pl', { zh: '延期', en: 'extensions' }),
  code: np('the code', 'code', 'sg', { zh: '代码', en: 'code' }),
  editor: np('the editor', 'editor', 'sg', { zh: '编辑', en: 'editor' }),
  rebuttal: np('a rebuttal', 'rebuttal', 'sg', { zh: '答辩意见', en: 'rebuttal' }),
  rebuttals: np('rebuttals', 'rebuttal', 'pl', { zh: '答辩意见', en: 'rebuttals' }),
  version: np('the final version', 'version', 'sg', { zh: '终稿', en: 'final version' }),
  versions: np('the final versions', 'version', 'pl', { zh: '终稿', en: 'final versions' }),
  // Pronouns name whatever the level's context makes them name (a level's `refer`).
  i: pron('I', 'sg', 1, 'nom'),
  me: pron('me', 'sg', 1, 'acc'),
  we: pron('we', 'pl', 1, 'nom'),
  us: pron('us', 'pl', 1, 'acc'),
  she: pron('she', 'sg', 3, 'nom'),
  her: pron('her', 'sg', 3, 'acc'),
  it: pron('it', 'sg', 3, null),
  they: pron('they', 'pl', 3, 'nom'),
  them: pron('them', 'pl', 3, 'acc'),
}

export const verbs = {
  converge: verb('converge', 'converges', 'converged', 'converged', 'converging', 'intransitive', { zh: '收敛', en: 'converge' }, { subject: 'THEME' }),
  fail: verb('fail', 'fails', 'failed', 'failed', 'failing', 'intransitive', { zh: '失败', en: 'fail' }, { subject: 'THEME' }),
  terminate: verb('terminate', 'terminates', 'terminated', 'terminated', 'terminating', 'intransitive', { zh: '终止', en: 'terminate' }, { subject: 'THEME' }),
  outperform: verb('outperform', 'outperforms', 'outperformed', 'outperformed', 'outperforming', 'transitive', { zh: '优于', en: 'outperform' }),
  accept: verb('accept', 'accepts', 'accepted', 'accepted', 'accepting', 'transitive', { zh: '录用', en: 'accept' }),
  reject: verb('reject', 'rejects', 'rejected', 'rejected', 'rejecting', 'transitive', { zh: '拒稿', en: 'reject' }),
  evaluate: verb('evaluate', 'evaluates', 'evaluated', 'evaluated', 'evaluating', 'transitive', { zh: '评估', en: 'evaluate' }),
  submit: verb('submit', 'submits', 'submitted', 'submitted', 'submitting', 'transitive', { zh: '提交', en: 'submit' }),
  check: verb('check', 'checks', 'checked', 'checked', 'checking', 'transitive', { zh: '核查', en: 'check' }),
  withdraw: verb('withdraw', 'withdraws', 'withdrew', 'withdrawn', 'withdrawing', 'transitive', { zh: '撤稿', en: 'withdraw' }),
  read: verb('read', 'reads', 'read', 'read', 'reading', 'transitive', { zh: '读', en: 'read' }),
  grant: verb('grant', 'grants', 'granted', 'granted', 'granting', 'ditransitive', { zh: '给予', en: 'grant' }),
  'grant-to': verb('grant', 'grants', 'granted', 'granted', 'granting', 'dative', { zh: '给予', en: 'grant' }, { lemma: 'grant' }),
  send: verb('send', 'sends', 'sent', 'sent', 'sending', 'ditransitive', { zh: '发送', en: 'send' }),
  'send-to': verb('send', 'sends', 'sent', 'sent', 'sending', 'dative', { zh: '发送', en: 'send' }, { lemma: 'send' }),
}

// The heads of a clause: what each says before the verb, the verb form it asks for, and whom it agrees with.
const infl = (label, tense, aspect, agree, aux, form) => ({ label, tense, aspect, agree, aux, verb: form })

export const inflections = {
  s: infl('-s', 'present', 'simple', '3sg', [], 's'),
  zero: infl('∅', 'present', 'simple', 'non3sg', [], 'base'),
  ed: infl('-ed', 'past', 'simple', 'any', [], 'past'),
  will: infl('will', 'future', 'simple', 'any', ['will'], 'base'),
  has: infl('has + -en', 'present', 'perfect', '3sg', ['has'], 'pp'),
  have: infl('have + -en', 'present', 'perfect', 'non3sg', ['have'], 'pp'),
  had: infl('had + -en', 'past', 'perfect', 'any', ['had'], 'pp'),
  am: infl('am + -ing', 'present', 'progressive', '1sg', ['am'], 'ing'),
  is: infl('is + -ing', 'present', 'progressive', '3sg', ['is'], 'ing'),
  are: infl('are + -ing', 'present', 'progressive', 'other', ['are'], 'ing'),
  was: infl('was + -ing', 'past', 'progressive', 'was', ['was'], 'ing'),
  were: infl('were + -ing', 'past', 'progressive', 'other', ['were'], 'ing'),
}
