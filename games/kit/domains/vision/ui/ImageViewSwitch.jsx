import { Hash, Image as Pixels } from 'lucide-react'
import { tr } from '../../../shell/i18n.js'
import { setImageView, useImageView } from './image-view.js'

/** The one switch between overview and information for every image on screen; it shows the view in force. */
export default function ImageViewSwitch() {
  const info = useImageView() === 'info'
  return <button type="button" className="vi-view-switch" onClick={() => setImageView(info ? 'overview' : 'info')}
    title={info ? tr('切换到简略：整张图缩放进窗口', 'Switch to overview: whole images scaled to fit') : tr('切换到信息：每格写出数值', 'Switch to information: values in every cell')}>
    {info ? <Hash size={13} /> : <Pixels size={13} />}<span>{info ? tr('信息', 'Information') : tr('简略', 'Overview')}</span>
  </button>
}
