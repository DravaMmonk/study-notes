// The everyday sentences of 证明完毕 (kit/domains/logic/notation.js). Truth-table levels are written in them directly;
// a proof level is a schema in letters whose test cases fill the letters in with these, so the player only ever reads
// sentences.
const T = (zh, en) => ({ zh, en })

export const WORDS = {
  Rain: T('下雨', 'it rains'),
  Wet: T('地面湿润', 'the ground is wet'),
  Wind: T('刮风', 'it is windy'),
  Slip: T('路滑', 'the road is slippery'),
  Fall: T('有人摔跤', 'someone falls'),
  Sat: T('今天是周六', 'today is Saturday'),
  Sun: T('今天是周日', 'today is Sunday'),
  Rest: T('我休息', 'I rest'),
  Bus: T('我乘坐公交', 'I take the bus'),
  Bike: T('我骑车', 'I cycle'),
  OnTime: T('我准时到达', 'I arrive on time'),
  Alarm: T('闹钟响了', 'the alarm rings'),
  Up: T('我起床了', 'I get up'),
  Coffee: T('我喝了咖啡', 'I drink coffee'),
  Tea: T('我喝了茶', 'I drink tea'),
  Awake: T('我很清醒', 'I am wide awake'),
  Late: T('我迟到了', 'I am late'),
  Exam: T('明天考试', 'there is an exam tomorrow'),
  Study: T('我在复习', 'I am revising'),
  Pass: T('我通过了考试', 'I pass'),
  Happy: T('我很开心', 'I am happy'),
  Hungry: T('我饿了', 'I am hungry'),
  Eat: T('我去吃饭', 'I go and eat'),
  Full: T('我吃饱了', 'I am full'),
  Locked: T('门锁着', 'the door is locked'),
  Moon: T('月亮是奶酪做的', 'the moon is made of cheese'),
  Pigs: T('猪会飞', 'pigs fly'),
  // The island of knights and knaves: what four islanders are.
  KA: T('a 是骑士', 'a is a knight'),
  KB: T('b 是骑士', 'b is a knight'),
  KC: T('c 是骑士', 'c is a knight'),
  KD: T('d 是骑士', 'd is a knight'),
}
