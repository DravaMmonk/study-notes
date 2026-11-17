import { tr } from '../shell/i18n.js'
import { creationChoices } from './form.js'
import { AddMenu } from './Picker.jsx'

/** Add an optional field offered by the current engine schema. */
export function AddFields({ fields, ctx, onAdd }) {
  const label = tr('添加字段', 'Add field')
  const entries = new Map()
  const options = fields.flatMap((field) => {
    const choices = creationChoices(field.schema, ctx)
    if (!choices.length) return []
    const { key, about } = field
    if (choices.length === 1) {
      entries.set(key, { field, make: choices[0].make })
      return [{ value: key, about }]
    }
    const children = choices.map((choice) => {
      const value = `${key}:${choice.value}`
      entries.set(value, { field, make: choice.make })
      return { ...choice, value }
    })
    return [{ value: key, about, children }]
  })
  return <AddMenu options={options} onPick={(key) => {
    const { field, make } = entries.get(key)
    onAdd(field, make())
  }} label={label} />
}
