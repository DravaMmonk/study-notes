// The levels of 《车在说话》 chapter 1 so far (games/bus/DESIGN.md 4): the listen-only probe, from following the bus
// to reading who is talking. Only specs: the bus, the parts and the tick-by-tick machine are the can domain's.
// A level's `want` is what its outputs must be, tick by tick (undefined: anything will do); `solution` its reference
// board, written with the domain's board().

const T = (zh, en) => ({ zh, en })

// The tests' buses: a frame or two after the bus has been quiet, identifiers with no five equal bits in a row (so no
// stuff bit lands in them before the chapter gets to stuffing).
const ONE = { frames: [{ id: 0x123, data: [0x01] }] }
const OTHER = { idle: 14, frames: [{ id: 0x2a5, data: [] }] }
const QUIET = (n) => ({ idle: n, frames: [], tail: 0 })

const bitsOf = (test) => test.bus.bits
const at = (test, f) => bitsOf(test).map((_, t) => f(t))
// How many recessive bits ran on `bits` up to tick t (not counting t).
const runBefore = (bits, t) => {
  let n = 0
  for (let k = t - 1; k >= 0 && bits[k] === 1; k--) n++
  return n
}
// The same for any run of ones on an input.
const onesBefore = runBefore
// The start-of-frame rule: dominant after at least 11 recessive bits.
const sofAt = (bits, t) => bits[t] === 0 && runBefore(bits, t) >= 11

export const levels = [
  {
    id: '1-1',
    title: T('跟着总线', 'Follow the bus'),
    listens: true,
    outputs: [{ name: 'bit', label: T('位', 'Bit') }],
    brief: T('每一拍，把总线上的那一位原样交出去。', 'Every tick, give out the bit on the bus as it is.'),
    intro: [
      { t: T('车上的控制器共用一根<wiki-ref to="bus"></wiki-ref>。这一章你造的是一个只听不说的探针：插上总线，弄清楚上面在说什么。', 'The controllers in a car share one <wiki-ref to="bus"></wiki-ref>. In this chapter you build a probe that only listens: plug it into the bus and work out what is being said on it.') },
      { t: T('探针每一拍跑一遍你的板。板左边的总线元件给出这一拍线上的那一位：0 是<wiki-ref to="dominant"></wiki-ref>，1 是<wiki-ref to="recessive"></wiki-ref>。运行就是时间：下面的波形一拍一格往前走。', 'The probe runs your board once a tick. The bus part on its left gives this tick’s bit on the line: 0 is <wiki-ref to="dominant"></wiki-ref>, 1 is <wiki-ref to="recessive"></wiki-ref>. Running is time: the waveform below moves on one tick a cell.') },
    ],
    hint: [T('把左边的总线元件接到右边的输出上。', 'Wire the bus part on the left into the output on the right.')],
    tests: [{ bus: ONE }, { bus: OTHER }],
    want: (test) => ({ bit: bitsOf(test) }),
    solution: (board) => board({}, ['line>bit']),
    after: T('板每一拍从头跑一遍，只看得到这一拍。没人说话时线一直是隐性；一帧开始，线上才有了显性。', 'The board runs afresh each tick and sees only that tick. With nobody talking the line stays recessive; once a frame starts, dominant bits appear.'),
  },
  {
    id: '1-2',
    title: T('晚一拍', 'One tick late'),
    listens: true,
    adds: ['reg', 'keep'],
    outputs: [{ name: 'bit', label: T('位', 'Bit') }],
    brief: T('每一拍交出总线上一拍的那一位；第一拍交出 1。', 'Every tick, give out the bit the bus had the tick before; 1 on the first tick.'),
    intro: [
      { t: T('板每一拍从头跑，上一拍的东西它一样也记不住。可总线上的一位只有和前后连起来看才有意思。', 'The board starts afresh each tick and remembers nothing of the last one. Yet a bit on the bus only means something next to the bits around it.') },
      { t: T('探针多了一种能力：<wiki-ref to="register"></wiki-ref>。<part-ref to="part:keep"></part-ref>把这一拍接到它上面的值存起来，下一拍<part-ref to="part:reg"></part-ref>把它读出来；名字相同的两个元件说的是同一张寄存卡。读的那个可以设一个初值：还没存过东西时读出它。', 'The probe gains one ability: <wiki-ref to="register"></wiki-ref>s. <part-ref to="part:keep"></part-ref> stores the value wired into it this tick, and <part-ref to="part:reg"></part-ref> reads it back on the next one; two parts with the same name are the same register. The reading one has a start value: what it reads before anything is kept.') },
    ],
    hint: [T('这一拍的总线存起来，下一拍读出来交出去。', 'Keep the bus this tick, and give out what you read next tick.')],
    tests: [{ bus: ONE }, { bus: OTHER }],
    want: (test) => ({ bit: at(test, (t) => (t ? bitsOf(test)[t - 1] : 1)) }),
    solution: (board) => board({ r: ['reg', { reg: 'A', start: 1 }], k: ['keep', { reg: 'A' }] }, ['line>k', 'r>bit']),
    after: T('寄存卡把一拍和下一拍连了起来：从现在起，板能记事了。', 'A register ties one tick to the next: from now on the board can remember.'),
  },
  {
    id: '1-3',
    title: T('和上一拍一样吗', 'Same as last tick?'),
    listens: true,
    adds: ['compare'],
    outputs: [{ name: 'same', label: T('一样', 'Same') }],
    brief: T('每一拍回答：总线这一拍的位和上一拍一样吗？第一拍拿它和 1 比。', 'Every tick, answer: is the bit on the bus the same as the tick before? On the first tick, compare it with 1.'),
    intro: [
      { t: T('能记住上一拍以后，就能看出线什么时候变了。新元件<part-ref to="part:compare"></part-ref>：两个值相等时给出「是」，不相等给出「否」；它还有一种形状「小于」。', 'Remembering the last tick, the board can tell when the line changes. A new part, <part-ref to="part:compare"></part-ref>: yes when its two values are equal, no when they are not; it has a second form, Less than.') },
    ],
    tests: [{ bus: ONE }, { bus: OTHER }],
    want: (test) => ({ same: at(test, (t) => bitsOf(test)[t] === (t ? bitsOf(test)[t - 1] : 1)) }),
    solution: (board) => board({ r: ['reg', { reg: 'A', start: 1 }], k: ['keep', { reg: 'A' }], c: ['compare', { form: 'eq' }] }, ['line>k', 'line>c.a', 'r>c.b', 'c>same']),
    after: T('一张寄存卡加一个比较，板就看得出线在哪一拍变了。', 'A register and a comparison, and the board can see the tick the line changes.'),
  },
  {
    id: '1-4',
    title: T('数拍', 'Count the ticks'),
    adds: ['arith'],
    outputs: [{ name: 'n', label: T('拍数', 'Ticks') }],
    brief: T('每一拍交出这是第几拍：第一拍是 0。', 'Every tick, give out which tick this is: the first is 0.'),
    intro: [
      { t: T('要知道一位落在一帧的哪里，得会数。寄存卡记得住一个数，还缺一样把它往上加的东西。', 'To know where a bit falls in a frame, the board has to count. A register can hold a number; what is missing is something to add to it.') },
      { t: T('新元件<part-ref to="part:arith"></part-ref>：形状「加一」给出输入加 1，「相加」给出两个输入的和。', 'A new part, <part-ref to="part:arith"></part-ref>: its form Add one gives its input plus 1, and Add gives the sum of its two inputs.') },
    ],
    tests: [{ bus: QUIET(12) }, { bus: QUIET(20) }],
    want: (test) => ({ n: at(test, (t) => t) }),
    solution: (board) => board({ r: ['reg', { reg: 'A', start: 0 }], i: ['arith', { form: 'inc' }], k: ['keep', { reg: 'A' }] }, ['r>i', 'i>k', 'r>n']),
    after: T('读出、加一、存回去：一个绕过寄存卡的小圈，每拍转一次，就是计数。', 'Read, add one, keep it: a small loop through a register, once round each tick, is a count.'),
  },
  {
    id: '1-5',
    title: T('等够 11 拍', 'Wait eleven ticks'),
    adds: ['const'],
    outputs: [{ name: 'ready', label: T('够了', 'Enough') }],
    brief: T('从第 11 拍（从 0 数起）开始一直回答「是」，在那之前回答「否」。', 'Answer yes from tick 11 on (counting from 0), and no before it.'),
    intro: [
      { t: T('探针刚插上时不知道总线正说到哪里，要先等一阵。等多久是一个定好的数，板上还没有能写下一个数的元件。', 'A probe just plugged in does not know where the bus is in what it is saying, so it waits a while first. How long is a fixed number, and the board has no part yet that holds a number.') },
      { t: T('新元件<part-ref to="part:const"></part-ref>：总是给出它设的那个数。', 'A new part, <part-ref to="part:const"></part-ref>: always gives the number it is set to.') },
    ],
    tests: [{ bus: QUIET(16) }, { bus: QUIET(24) }],
    want: (test) => ({ ready: at(test, (t) => t >= 11) }),
    solution: (board) => board({ r: ['reg', { reg: 'A', start: 0 }], i: ['arith', { form: 'inc' }], k: ['keep', { reg: 'A' }], ten: ['const', { value: 10 }], lt: ['compare', { form: 'lt' }] }, ['r>i', 'i>k', 'ten>lt.a', 'r>lt.b', 'lt>ready']),
    after: T('计数加上一个比较，就是"等到第几拍"。', 'A count and a comparison make “wait until tick so-and-so”.'),
  },
  {
    id: '1-6',
    title: T('断了重数', 'Start again when it breaks'),
    adds: ['select'],
    inputs: [{ name: 'go', label: T('接着数', 'Go on') }],
    outputs: [{ name: 'n', label: T('数', 'Count') }],
    brief: T('每一拍交出「接着数」在这一拍之前连着是 1 的拍数；它一是 0，就从 0 重数。', 'Every tick, give out how many ticks in a row Go on was 1 before this one; once it is 0, start again from 0.'),
    intro: [
      { t: T('数拍只会一直往上数。要数"连着多少拍"，得在断的那一拍把数清零：板要能在两个值里挑一个。', 'Counting ticks only goes up. To count “how many in a row”, the count has to go back to zero on the tick the run breaks: the board has to pick one of two values.') },
      { t: T('新元件<part-ref to="part:select"></part-ref>：条件是「是」或 1 时给出「是」那一路，「否」或 0 时给出「否」那一路；没接的一路读作「—」。', 'A new part, <part-ref to="part:select"></part-ref>: when its condition is yes or 1 it gives its Yes input, when it is no or 0 its No input; an input left open reads 「—」.') },
    ],
    tests: [
      { bus: QUIET(14), inputs: { go: [1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0] } },
      { bus: QUIET(12), inputs: { go: [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0] } },
    ],
    want: (test) => ({ n: at(test, (t) => onesBefore(test.inputs.go, t)) }),
    solution: (board) => board({ r: ['reg', { reg: 'A', start: 0 }], i: ['arith', { form: 'inc' }], z: ['const', { value: 0 }], s: 'select', k: ['keep', { reg: 'A' }] }, ['go>s.if', 'r>i', 'i>s.yes', 'z>s.no', 's>k', 'r>n']),
    builds: { type: 'counter', name: T('计数器', 'Counter'), desc: T('交出「接着数」在这一拍之前连着是 1 的拍数；「接着数」为 0 的那一拍过后从 0 重数。每一块计数器有自己的寄存卡。', 'Gives how many ticks in a row Go on was 1 before this tick; after a tick where Go on is 0 it counts from 0 again. Each counter has registers of its own.') },
    after: T('这块板现在是一个元件了，板上放几块，就各数各的。', 'This board is now a part, and several of them on one board each keep their own count.'),
  },
  {
    id: '1-7',
    title: T('有人开口了', 'Someone speaks'),
    listens: true,
    outputs: [{ name: 'sof', label: T('帧起始', 'Start of frame') }],
    brief: T('总线连着至少 11 拍隐性之后的第一个显性，回答「是」；其余每一拍回答「否」。', 'Answer yes on the first dominant bit after at least 11 recessive ones in a row, and no on every other tick.'),
    intro: [
      { t: T('没人说话时总线一直是隐性。一个控制器开口，先说一位显性：这一位叫<wiki-ref to="sof"></wiki-ref>。', 'With nobody talking the bus stays recessive. A controller that starts talking first says one dominant bit: the <wiki-ref to="sof"></wiki-ref>.') },
      { t: T('可一帧里面到处都有显性。只有在总线确实安静过一阵以后的那个显性，才是一帧的开头。', 'Yet a frame is full of dominant bits. Only the dominant bit after the bus has really been quiet for a while is where a frame begins.') },
    ],
    hint: [T('数出这一拍之前隐性连着多长。', 'Count how long the recessive run before this tick is.'), T('显性是 0，可以拿它和常数 0 比。', 'Dominant is 0, and can be compared with a constant 0.')],
    tests: [{ bus: ONE }, { bus: { idle: 11, frames: [{ id: 0x0f3, data: [0x55, 0xaa] }, { id: 0x2a5, data: [] }] } }],
    want: (test) => ({ sof: at(test, (t) => sofAt(bitsOf(test), t)) }),
    solution: (board) => board(
      { c: 'counter', ten: ['const', { value: 10 }], lt: ['compare', { form: 'lt' }], z: ['const', { value: 0 }], e: ['compare', { form: 'eq' }], s: 'select' },
      ['line>c.go', 'ten>lt.a', 'c>lt.b', 'line>e.a', 'z>e.b', 'lt>s.if', 'e>s.yes', 'lt>s.no', 's>sof'],
    ),
    after: T('一帧的最后是 11 位隐性：应答界定位、7 位帧结束、3 位帧间间隔。所以两帧紧挨着时，这条规则照样认得出下一帧。', 'A frame ends with 11 recessive bits: the ACK delimiter, 7 bits of end of frame and 3 of intermission. So even with frames back to back, this rule still finds the next one.'),
  },
  {
    id: '1-8',
    title: T('攒成一个数', 'Gather a number'),
    inputs: [{ name: 'bit', label: T('位', 'Bit') }, { name: 'go', label: T('接着攒', 'Go on') }],
    outputs: [{ name: 'n', label: T('数', 'Number') }],
    brief: T('「接着攒」为 1 的每一拍，把「位」接到已经攒下的数的末尾（先来的位在高位），交出攒到的数；为 0 的那一拍交出 0，从头再攒。', 'On every tick Go on is 1, put Bit at the end of the number gathered so far (the first bit highest) and give out the number; on a tick it is 0, give out 0 and start over.'),
    intro: [
      { t: T('总线上的数是一位一位到的：说话的控制器先说最高位。探针要把它们攒回一个数。', 'Numbers come over the bus a bit at a time, the highest bit first. The probe has to gather them back into a number.') },
      { t: T('攒下的数后面多接一位，它在二进制里整体左移了一格，再加上新来的那一位。', 'Putting one more bit after the number gathered so far shifts it one place left in binary, then adds the new bit.') },
    ],
    tests: [
      { bus: QUIET(10), inputs: { bit: [1, 0, 1, 1, 0, 0, 1, 1, 1, 0], go: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1] } },
      { bus: QUIET(12), inputs: { bit: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], go: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] } },
    ],
    want: (test) => {
      let acc = 0
      return { n: at(test, (t) => (acc = test.inputs.go[t] ? acc * 2 + test.inputs.bit[t] : 0)) }
    },
    solution: (board) => board(
      { r: ['reg', { reg: 'A', start: 0 }], d: ['arith', { form: 'add' }], a: ['arith', { form: 'add' }], z: ['const', { value: 0 }], s: 'select', k: ['keep', { reg: 'A' }] },
      ['r>d.a', 'r>d.b', 'd>a.a', 'bit>a.b', 'go>s.if', 'a>s.yes', 'z>s.no', 's>k', 's>n'],
    ),
    builds: { type: 'shift', name: T('攒成一个数', 'Gather'), desc: T('「接着攒」为 1 时，把「位」接到攒下的数末尾，交出新的数；为 0 时交出 0 并清空。每一块有自己的寄存卡。', 'When Go on is 1, puts Bit at the end of the number gathered and gives the new number; when it is 0, gives 0 and empties. Each one has registers of its own.') },
    after: T('一个数加上自己，就是左移一格；再加上新的一位，就接上了。', 'A number added to itself is shifted one place left; add the new bit and it is on the end.'),
  },
  {
    id: '1-9',
    title: T('这是哪条消息', 'Which message is it'),
    listens: true,
    outputs: [{ name: 'id', label: T('标识符', 'Identifier') }],
    brief: T('帧起始后面的 11 位是这一帧的标识符。在它最后一位到达的那一拍交出标识符，其余每一拍交出「—」。', 'The 11 bits after the start of frame are the frame’s identifier. Give it out on the tick its last bit arrives, and 「—」 on every other tick.'),
    intro: [
      { t: T('认得出一帧从哪开始，也会把位攒成数，探针就能读出第一样东西：这一帧是哪条消息。每一帧开头是 11 位的<wiki-ref to="identifier"></wiki-ref>，说的是这条消息是什么、有多要紧。', 'Knowing where a frame starts and how to gather bits into a number, the probe can read the first thing: which message this frame is. Every frame begins with an 11-bit <wiki-ref to="identifier"></wiki-ref>, which says what the message is and how urgent.') },
      { t: T('一个帧起始只亮一拍，可之后的 11 拍都要知道"我在一帧里面"。', 'A start of frame lights for one tick, yet the 11 ticks after it all need to know “I am inside a frame”.') },
    ],
    hint: [T('帧起始那一拍，在寄存卡里记下"进帧了"，之后一直记着。', 'On the start of frame, keep “in a frame” in a register, and keep it there.'), T('进帧以后的拍数，用一块<part-ref to="counter"></part-ref>数。', 'Count the ticks since then with a <part-ref to="counter"></part-ref>.')],
    tests: [{ bus: ONE }, { bus: OTHER }],
    want: (test) => {
      const out = bitsOf(test).map(() => null)
      for (const f of test.bus.frames) out[f.at + 11] = f.id
      return { id: out }
    },
    solution: (board) => board(
      {
        c: 'counter', ten: ['const', { value: 10 }], lt: ['compare', { form: 'lt' }], z: ['const', { value: 0 }], e: ['compare', { form: 'eq' }], sof: 'select',
        f: ['reg', { reg: 'B', start: 0 }], one: ['const', { value: 1 }], sf: 'select', kf: ['keep', { reg: 'B' }],
        k: 'counter', g: 'shift', hit: ['compare', { form: 'eq' }], o: 'select',
      },
      [
        'line>c.go', 'ten>lt.a', 'c>lt.b', 'line>e.a', 'z>e.b', 'lt>sof.if', 'e>sof.yes', 'lt>sof.no',
        'sof>sf.if', 'one>sf.yes', 'f>sf.no', 'sf>kf',
        'f>k.go', 'line>g.bit', 'f>g.go', 'k>hit.a', 'ten>hit.b', 'hit>o.if', 'g>o.yes', 'o>id',
      ],
    ),
    after: T('两块计数器各数各的：一块数总线安静了多久，一块数进帧以后过了几拍。', 'The two counters count on their own: one how long the bus was quiet, one how many ticks since the frame began.'),
  },
]
