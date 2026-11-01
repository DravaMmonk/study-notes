// Why a failed test went wrong beyond its numbers (vocabulary.js explain): a sentence added to the failure's message,
// in the current language.

import { callOf } from '../../../engine/schema.js';
import { tr } from '../lang.js';

/** Explains: (t, res, o) → text or ''. `res` is the run, `o` the stage's settings. */
const EXPLAINS = {
  roll(t, res, o) {
    let item = -1, touched = new Set();
    const s = res.steps.find(x => {
      if (x.cell.item !== item) { item = x.cell.item; touched = new Set(); }
      const hit = touched.has(x.cell.src) && x.writes[0][1] > x.probe['view#old'];
      touched.add(x.cell.w);
      return hit;
    });
    if (t.kind === '01' && s) { const it = t.items[s.cell.item]; return tr(`处理「${it.n}」（${it.w} kg）时，改 dp[${s.cell.w}] 要读 dp[${s.cell.src}]，可 dp[${s.cell.src}] 在这一轮已经改过，里面已经放了一个${it.n}。于是${it.n}又被放了一次。`, `While handling the ${it.n} (${it.w} kg), rewriting dp[${s.cell.w}] reads dp[${s.cell.src}], but dp[${s.cell.src}] was already rewritten this round and already holds one ${it.n}. So the ${it.n} got packed a second time.`); }
    if (t.kind === 'inf' && o.dirs.inf === 'desc') return tr('这一题每种东西可以拿很多件。从右往左改写时，dp[w − 重量] 总是旧值，每种东西都只被拿了一次。', 'In this test, each kind of thing can be taken many times. Rewriting from right to left, dp[w − weight] is always an old value, so each thing gets taken only once.');
    return '';
  },
};

/** What an explain item adds to a failed test's message. */
export function explain(call, t, res, o) {
  const [name] = callOf(call);
  return EXPLAINS[name](t, res, o);
}
