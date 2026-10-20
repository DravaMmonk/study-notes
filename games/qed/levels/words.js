// The everyday sentences early levels are about (kit/domains/logic/notation.js): each proposition letter a level uses
// reads as one of these, until the course moves to A, B, C.
const T = (zh, en) => ({ zh, en })

export const WORDS = {
  Rain: T('下雨', 'it rains'),
  Wet: T('地湿', 'the ground is wet'),
  Wind: T('刮风', 'it is windy'),
  Slip: T('路滑', 'the road is slippery'),
  Fall: T('有人摔跤', 'someone falls'),
  Sat: T('今天是周六', 'today is Saturday'),
  Sun: T('今天是周日', 'today is Sunday'),
  Bus: T('我坐公交', 'I take the bus'),
  Bike: T('我骑车', 'I cycle'),
  OnTime: T('我准时到', 'I arrive on time'),
  Locked: T('门锁着', 'the door is locked'),
  Moon: T('月亮是奶酪做的', 'the moon is made of cheese'),
}

// The island of knights and knaves: A and B are what two islanders are.
export const ISLAND = {
  A: T('a 是骑士', 'a is a knight'),
  B: T('b 是骑士', 'b is a knight'),
}
