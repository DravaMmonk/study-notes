import { partFlow } from './flow.js'
export const circuitTools = {
  flow: {
    about: 'A part’s way through a game’s course (as a changeset would leave it), read off the course, in course order: where it is at hand from the start, where a level brings it in, where a level or one of its tasks gives it there only or withholds it, where a part superseding it arrives, and each step of its upgrade chains (the task whose work runs inside it, with its form). Each event names the level, the task (an index) and the path of the field in the level’s content that says it (null: none).',
    params: { game: 'string', part: 'string', changeset: 'object?', scope: 'string?' },
    async run({ game, part, changeset = null, scope }, { contentAfter, runtimeOf }) {
      const content = await contentAfter(game, changeset, scope)
      if (content.packageTarget) return { events: [] }
      const domain = await runtimeOf(content)
      return { events: partFlow(domain.spec(content).course, content, part) }
    },
  },
}
