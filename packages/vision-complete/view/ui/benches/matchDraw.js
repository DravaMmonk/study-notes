import { pointAlongLine } from 'image'

export function linePath(line, from = -40) {
  const start = pointAlongLine(line, from).join(' ')
  const end = pointAlongLine(line, -from).join(' ')
  return `M${start} L${end}`
}
