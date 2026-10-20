// 《证明完毕》's course by era (games/DESIGN.md): one proof machine per era. Era 0 has none: a proposition is checked
// by its truth table. Mark I proves everything from Detach and two axioms, slowly; its topic rewrites a proof under a
// hypothesis into one without it (the deduction theorem), which Mark II then has built in as the assumption box.
const T = (zh, en) => ({ zh, en })

export const ERAS = [
  {
    id: 'paper', machine: null,
    foundation: ['table', 'always', 'onerow'],
    chapter: { title: T('纸笔', 'Pen and paper'), question: T('一句话什么时候永远成立？', 'When does a statement always hold?') },
  },
  {
    id: 'mk1', machine: 'mk1',
    foundation: ['copy', 'mp', 'k', 's', 'chain', 'self', 'identity'],
    practice: ['long'],
    topics: [{ id: 'deduction', code: 'D', after: 'identity', levels: ['dt-mp', 'dt-whole'], title: T('演绎定理', 'The deduction theorem') }],
    challenges: [{ level: 'twice', after: 'identity' }],
    chapter: { title: T('初号', 'Mark I'), question: T('只靠一条规则和两条公理，能证出什么？', 'What can one rule and two axioms prove?') },
  },
  {
    id: 'mk2', machine: 'mk2',
    foundation: ['box', 'and', 'or', 'cases', 'bot'],
    practice: ['swap', 'contra', 'demorgan', 'raa'],
    topics: [{ id: 'knights', code: 'K', after: 'raa', levels: ['kk-one', 'kk-two', 'kk-three'], title: T('骑士与无赖', 'Knights and knaves') }],
    challenges: [{ level: 'notnotlem', after: 'bot' }],
    chapter: { title: T('二号', 'Mark II'), question: T('先假设，再证明：框里的推理怎样变成框外的定理？', 'Assume, then prove: how does reasoning inside a box become a theorem outside it?') },
  },
]
