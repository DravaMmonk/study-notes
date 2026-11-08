import { useMemo } from 'react'
import { channel } from '../engine/colour.js'
import { tr } from '../../../shell/i18n.js'
import ImageView from './ImageView.jsx'

// Show the colour image alongside the values carried by its three channel outputs.
export default function ColourPreview({ img, theme, onHover, labels = false }) {
  const planes = useMemo(() => [img, ...[0, 1, 2].map((index) => channel(img, index))], [img])
  const names = [tr('图', 'Image'), 'R', 'G', 'B']
  return (
    <span className={`colour-preview ${labels ? 'has-labels' : ''}`}>
      {planes.map((plane, index) => (
        <span className="colour-preview-item" key={index}>
          <ImageView img={plane} size={64} theme={theme} onHover={onHover} label={names[index]} />
          {labels && <small>{names[index]}</small>}
        </span>
      ))}
    </span>
  )
}
