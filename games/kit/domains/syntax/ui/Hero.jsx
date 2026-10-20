import { treeSVG } from '../art.js'

// The level map's picture: the sentence tree the first era builds (art.js, shared with the games hub's card).
export default function Hero() {
  return <div className="sx-hero" dangerouslySetInnerHTML={{ __html: treeSVG() }} />
}
