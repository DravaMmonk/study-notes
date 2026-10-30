// 车在说话's encyclopedia (the shell's 百科): the words of the CAN bus as the game meets them. An entry opens once the
// level `at` is reached (no `at`: from the start).

const T = (zh, en) => ({ zh, en })

export const groups = [
  { id: 'bus', title: T('总线', 'The bus') },
  { id: 'probe', title: T('探针', 'The probe') },
]

export const entries = [
  {
    id: 'bus', group: 'bus', title: T('总线', 'bus'), at: '1-1',
    body: [
      T('车上几十个控制器共用的一对线。这里讲的是 CAN 总线（ISO 11898-1）：任何时候线上只有一位，每个控制器都看得见，也都能说。', 'The pair of wires the dozens of controllers in a car share. The one here is the CAN bus (ISO 11898-1): at any moment there is one bit on the line, every controller sees it, and any of them can speak.'),
      T('真实的总线上是两根线之间的电压差；游戏从"每一拍线上有一位"讲起，不讲电压、终端电阻和位定时。', 'On a real bus the bit is a voltage difference between two wires; the game starts from “one bit on the line each tick”, without voltages, terminating resistors or bit timing.'),
    ],
    see: ['dominant', 'recessive'],
  },
  {
    id: 'dominant', group: 'bus', title: T('显性', 'dominant'), at: '1-1',
    body: [T('总线上的 0。只要有一个控制器说显性，整根线就是显性：它压过隐性。', 'A 0 on the bus. If any one controller says dominant, the whole line is dominant: it wins over recessive.')],
    see: ['recessive'],
  },
  {
    id: 'recessive', group: 'bus', title: T('隐性', 'recessive'), at: '1-1',
    body: [T('总线上的 1。只有所有控制器都说隐性（或者都不说话）时，线才是隐性。没人说话的总线一直是隐性。', 'A 1 on the bus. The line is recessive only when every controller says recessive (or none says anything). A bus nobody is talking on stays recessive.')],
    see: ['dominant'],
  },
  {
    id: 'register', group: 'probe', title: T('寄存卡', 'register'), at: '1-2',
    body: [T('探针每一拍把板从头跑一遍。寄存卡是板上唯一能跨过一拍的东西：这一拍存进去的值，下一拍读得出来。', 'The probe runs the board afresh each tick. A register is the one thing on it that lasts from one tick to the next: what is kept in it this tick can be read on the next.')],
  },
  {
    id: 'sof', group: 'bus', title: T('帧起始', 'start of frame'), at: '1-7',
    body: [T('一帧的第一位，一位显性。只有在总线连着安静了至少 11 位之后，控制器才能开口，所以安静之后的第一个显性就是帧起始。', 'The first bit of a frame, one dominant bit. A controller may only start talking once the bus has been quiet for at least 11 bits, so the first dominant bit after that quiet is a start of frame.')],
    see: ['identifier'],
  },
  {
    id: 'identifier', group: 'bus', title: T('标识符', 'identifier'), at: '1-9',
    body: [
      T('帧起始后面的 11 位，高位在前。它说的是这条消息是什么（车速、门开没开……），而不是谁发的；一条消息只有一个控制器发。', 'The 11 bits after the start of frame, highest first. It says what the message is (the speed, whether a door is open…), not who sent it; each message is sent by one controller.'),
      T('真实的 CAN 还有 29 位的扩展标识符，游戏只用 11 位的。', 'Real CAN also has 29-bit extended identifiers; the game uses the 11-bit ones only.'),
    ],
  },
]
