// The syntax domain's parts (vocabulary.js part): what a reader marks in a sentence, the same in every game on the
// domain. The roles of the skeleton, and the constructions a modifier can be folded as. A game's levels bring them in
// (`adds`: 'role:subj', 'pp', …); their names and descriptions are the components box's.
import { T } from '../../../shell/i18n.js'


/** The skeleton's roles, in the order a clause says them. */
export const ROLES = {
  subj: {
    name: T('主语'),
    desc: T('句子说的是谁、是什么。标出它的名词短语：修饰成分都折起来以后，剩下的那几个词。'),
  },
  verb: {
    name: T('谓语'),
    desc: T('主语做什么、怎么样：整个动词词组，连同助动词（has been shown）。'),
  },
  obj: {
    name: T('宾语'),
    desc: T('动作落到的东西，跟在谓语后面的名词短语。'),
  },
  comp: {
    name: T('表语'),
    desc: T('跟在 be 这类系动词后面、说明主语是什么或怎么样的成分。'),
  },
}

/** The constructions a modifier is folded as. */
export const TYPES = {
  pp: {
    name: T('介词短语'),
    desc: T('介词开头的一串词（of the model、on a single GPU），整块修饰一个词。折起来，挂到它修饰的词上。'),
  },
  rel: {
    name: T('定语从句'),
    desc: T('跟在名词后面、自带主语和谓语的小句（that we propose、which has seven billion parameters）。折起来，挂到它修饰的词上。'),
  },
}

/** A part's key as a course and a level's `adds` name it: a role is 'role:<role>', a construction its own key. */
export const roleKey = (role) => `role:${role}`

/** Every part a level can bring in. */
export const PARTS = [...Object.keys(ROLES).map(roleKey), ...Object.keys(TYPES)]
