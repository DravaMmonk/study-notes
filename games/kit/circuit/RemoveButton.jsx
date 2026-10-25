import { Trash2 } from 'lucide-react'
import { tr } from '../shell/i18n.js'

/** The foot of a part's sheet on a phone, in every game: take this block off the board. */
export default function RemoveButton({ onClick }) {
  return <button type="button" className="sheet-remove" onClick={onClick}><Trash2 size={15} />{tr('拿掉这一块', 'Remove this block')}</button>
}
