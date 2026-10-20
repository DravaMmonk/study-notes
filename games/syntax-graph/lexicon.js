// 句法之图's words. Only data: what each word is to the grammar (games/kit/domains/syntax/engine/lexicon.js says
// the shape). The grammar itself (frames, agreement, case) is the syntax domain's, the same for every level.

const np = (text, ent, number, sense) => ({ text, ent, number, sense })
const pron = (text, number, person, kase) => ({ text, number, person, case: kase })
const verb = (base, s, past, pp, ing, frame, sense, more = {}) => ({ forms: { base, s, past, pp, ing }, frame, sense, ...more })

export const nouns = {
  proposal: np('the proposal', 'proposal', 'sg', { zh: '提案', en: 'proposal' }),
  proposals: np('the proposals', 'proposal', 'pl', { zh: '提案', en: 'proposals' }),
  chair: np('the chair', 'chair', 'sg', { zh: '主席', en: 'chair' }),
  chairs: np('the chairs', 'chair', 'pl', { zh: '主席', en: 'chairs' }),
  committee: np('the committee', 'committee', 'sg', { zh: '委员会', en: 'committee' }),
  committees: np('the committees', 'committee', 'pl', { zh: '委员会', en: 'committees' }),
  budget: np('the budget', 'budget', 'sg', { zh: '预算', en: 'budget' }),
  budgets: np('the budgets', 'budget', 'pl', { zh: '预算', en: 'budgets' }),
  auditor: np('the auditor', 'auditor', 'sg', { zh: '审计师', en: 'auditor' }),
  auditors: np('the auditors', 'auditor', 'pl', { zh: '审计师', en: 'auditors' }),
  claim: np('the claim', 'claim', 'sg', { zh: '索赔申请', en: 'claim' }),
  claims: np('the claims', 'claim', 'pl', { zh: '索赔申请', en: 'claims' }),
  firm: np('the firm', 'firm', 'sg', { zh: '公司', en: 'firm' }),
  client: np('the client', 'client', 'sg', { zh: '客户', en: 'client' }),
  clients: np('the clients', 'client', 'pl', { zh: '客户', en: 'clients' }),
  invoice: np('the invoice', 'invoice', 'sg', { zh: '发票', en: 'invoice' }),
  invoices: np('the invoices', 'invoice', 'pl', { zh: '发票', en: 'invoices' }),
  reminder: np('a reminder', 'reminder', 'sg', { zh: '催款提醒', en: 'reminder' }),
  reminders: np('reminders', 'reminder', 'pl', { zh: '催款提醒', en: 'reminders' }),
  notice: np('a final notice', 'notice', 'sg', { zh: '最后通知', en: 'final notice' }),
  notices: np('final notices', 'notice', 'pl', { zh: '最后通知', en: 'final notices' }),
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
  fail: verb('fail', 'fails', 'failed', 'failed', 'failing', 'intransitive', { zh: '失败', en: 'fail' }, { subject: 'THEME' }),
  resign: verb('resign', 'resigns', 'resigned', 'resigned', 'resigning', 'intransitive', { zh: '辞职', en: 'resign' }),
  meet: verb('meet', 'meets', 'met', 'met', 'meeting', 'intransitive', { zh: '开会', en: 'meet' }),
  approve: verb('approve', 'approves', 'approved', 'approved', 'approving', 'transitive', { zh: '批准', en: 'approve' }),
  reject: verb('reject', 'rejects', 'rejected', 'rejected', 'rejecting', 'transitive', { zh: '驳回', en: 'reject' }),
  review: verb('review', 'reviews', 'reviewed', 'reviewed', 'reviewing', 'transitive', { zh: '审阅', en: 'review' }),
  submit: verb('submit', 'submits', 'submitted', 'submitted', 'submitting', 'transitive', { zh: '提交', en: 'submit' }),
  receive: verb('receive', 'receives', 'received', 'received', 'receiving', 'transitive', { zh: '收到', en: 'receive' }),
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
