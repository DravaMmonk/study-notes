import PartView from './PartView.jsx'

export default function PartStudioPreview({ game, type, stage, editing, say }) {
  const which = { part: type }
  const edit = editing.on && !stage ? { picked: editing.picked, pick: path => say({ type: 'pick', ...which, path }), add: path => say({ type: 'add', ...which, path }) } : null
  const label = task => {
    const level = game.levels.find(level => level.id === task || level.tasks?.some(item => (item.key ?? item.id) === task))
    if (!level) return task
    const index = level.tasks?.findIndex(item => (item.key ?? item.id) === task) ?? -1
    return `${game.levelLabel(level)}${level.tasks?.length > 1 && index >= 0 ? ` · ${index + 1}` : ''}`
  }
  return <PartView game={game} type={type} stage={stage} edit={edit} onTask={task => say({ type: 'task-go', task })} label={label} />
}
