import { useLayoutEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// KaTeX owns only this span; surrounding prose and references remain React elements.
export default function TypesetMath({ tex, display }) {
  const target = useRef(null)
  useLayoutEffect(() => {
    katex.render(tex, target.current, { displayMode: display, throwOnError: false, trust: false, strict: 'error' })
  }, [tex, display])
  return <span className={`typeset-math${display ? ' is-display' : ''}`} ref={target} />
}
