import { qualifyItems } from 'kernel/view'
import { ObscuraScreen, ObscuraSide } from './Obscura.jsx'
export const displays = qualifyItems('image', 'display', {
  obscura: ObscuraSide,
  obscuraScreen: ObscuraScreen,
})
