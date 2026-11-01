import { useLayoutEffect, useRef } from 'react'
import { sceneSVG } from './svg.js'

// A board scene (../model/scene.js) on the page: drawn afresh by svg.js on every render, a cell the player can tap
// (`tap`) handing its id to onCell, by click or by Enter / Space; a cell picked from the keyboard keeps the focus when
// the board redraws.

export default function Scene({ scene, opt, onCell, className = 'board sg-board' }) {
  const box = useRef(null)
  const refocus = useRef(null)
  useLayoutEffect(() => {
    if (refocus.current === null) return
    box.current.querySelector(`[data-cell="${CSS.escape(refocus.current)}"]`)?.focus({ preventScroll: true })
    refocus.current = null
  })
  const tapped = (event) => event.target.closest('[data-cell]')?.dataset.cell
  const onClick = (event) => {
    const id = tapped(event)
    if (id !== undefined) onCell?.(id)
  }
  const onKeyDown = (event) => {
    const id = (event.key === 'Enter' || event.key === ' ') && tapped(event)
    if (id === undefined || id === false || !onCell) return
    event.preventDefault()
    refocus.current = id
    onCell(id)
  }
  return <div ref={box} className={className} onClick={onClick} onKeyDown={onKeyDown} dangerouslySetInnerHTML={{ __html: sceneSVG(scene, opt) }} />
}
