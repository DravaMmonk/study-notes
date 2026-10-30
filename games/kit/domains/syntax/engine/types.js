// What a reader marks in a sentence, the same in every game on the syntax domain: the roles of the skeleton, and the
// constructions a modifier can be folded as. A game's levels bring them in (`adds`: 'role:subj', 'pp', …); their names
// and descriptions are the components box's.

const T = (zh, en) => ({ zh, en })

/** The skeleton's roles, in the order a clause says them. */
export const ROLES = {
  subj: {
    name: T('主语', 'subject'),
    desc: T('句子说的是谁、是什么。标出它的名词短语：修饰成分都折起来以后，剩下的那几个词。', 'Who or what the sentence is about. Mark its noun phrase: the words left once its modifiers are folded.'),
  },
  verb: {
    name: T('谓语', 'verb'),
    desc: T('主语做什么、怎么样：整个动词词组，连同助动词（has been shown）。', 'What the subject does or is: the whole verb group, auxiliaries included (has been shown).'),
  },
  obj: {
    name: T('宾语', 'object'),
    desc: T('动作落到的东西，跟在谓语后面的名词短语。', 'What the action lands on: the noun phrase after the verb.'),
  },
  comp: {
    name: T('表语', 'complement'),
    desc: T('跟在 be 这类系动词后面、说明主语是什么或怎么样的成分。', 'What follows a linking verb such as be, saying what the subject is or what it is like.'),
  },
}

/** The constructions a modifier is folded as. */
export const TYPES = {
  pp: {
    name: T('介词短语', 'prepositional phrase'),
    desc: T('介词开头的一串词（of the model、on a single GPU），整块修饰一个词。折起来，挂到它修饰的词上。', 'A preposition and what follows it (of the model, on a single GPU), modifying one word as a whole. Fold it and hang it on that word.'),
  },
  rel: {
    name: T('定语从句', 'relative clause'),
    desc: T('跟在名词后面、自带主语和谓语的小句（that we propose、which has seven billion parameters）。折起来，挂到它修饰的词上。', 'A clause of its own, with its own subject and verb, after a noun (that we propose, which has seven billion parameters). Fold it and hang it on the word it modifies.'),
  },
}

/** A part's key as a course and a level's `adds` name it: a role is 'role:<role>', a construction its own key. */
export const roleKey = (role) => `role:${role}`
