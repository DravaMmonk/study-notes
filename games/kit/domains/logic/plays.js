import { T } from '../../shell/i18n.js'

const ruleBoard = { icon: 'rules', label: { zh: '规则板', en: 'Rule board' } }

export const plays = {
  proof: { view: 'circuit', judge: 'proof', run: 'check', icon: 'proof', label: { zh: '证明', en: 'Proof' } },
  machine: { view: 'circuit', judge: 'machine', run: 'trace', icon: 'machine', label: { zh: '证明助手', en: 'Proof assistant' } },
  truth: { view: 'truthTable', icon: 'truth', label: { zh: '真值表', en: 'Truth table' }, className: 'lg-truth-level' },
  gates: { view: 'truthCircuit', judge: 'gates', icon: 'gates', label: { zh: '真值电路', en: 'Truth circuit' } },
  iso: {
    view: 'rows', editor: 'declaration', judge: 'declaration', ...ruleBoard,
    sections: ['editor', 'preview'], stageClass: 'fo-stage', className: 'fo-level lg-level',
    passed: T('这份声明符合需求。'),
  },
  audit: {
    view: 'boardCases', judge: 'declarationAudit', ...ruleBoard,
    sections: ['declaration', 'preview', 'checks'], stageClass: 'fo-stage', className: 'fo-level lg-level',
    runLabel: T('运行检验条例'), done: T('已找出错误'), doneByWant: { agree: T('结果全部相符') },
  },
  define: {
    view: 'rows', editor: 'definition', judge: 'definition', icon: 'function', label: { zh: '定义', en: 'Definition' },
    sections: ['editor'], stageClass: 'lg-define', className: 'lg-define-level',
    passed: T('每个值都正确，每次递归调用的参数都更小，因此这条定义必定终止。'),
  },
  translate: { view: 'formula', icon: 'translate', label: { zh: '翻译', en: 'Translate' }, className: 'fo-level' },
  query: { view: 'formula', icon: 'query', label: { zh: '查询', en: 'Query' }, className: 'fo-level' },
  model: { view: 'world', icon: 'rules', label: { zh: '造世界', en: 'Build a world' }, className: 'fo-level' },
  term: { view: 'term', icon: 'term', label: { zh: '写证明项', en: 'Write a proof term' }, className: 'fo-level tm-level' },
  script: { view: 'script', icon: 'script', label: { zh: '写脚本', en: 'Write a script' }, className: 'fo-level sc-level' },
}

export const playIdOf = (task) => (task.kind === 'iso' && task.play === 'audit' ? 'audit' : task.kind)
