// What a part on the machine board is called beside its own text (《证明完毕》): a rule part named after the proof-board
// part or the lemma its rules belong to, and a part's text with the course's revisions.

/** A part's text with the game's revisions of it along the course (logicCourse `revisions`; defineGame textAt / textFor). */
export const withRevisions = (text, list) => (text && list ? { ...text, revisions: list } : text)

/** A lemma's or a defined part's name (the level's lemmas, the game's parts: course.js `partDefs`). */
export const nameOf = (level, type) => level.lemmas?.[type]?.name ?? level.partDefs?.[type]?.name ?? type
