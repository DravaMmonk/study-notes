// The map's illustration: two premises wired through a rule into the goal, which is proved (∎).
export default function Hero() {
  const card = (x, y, w, text, cls = '') => (
    <g className={`lg-hero-card ${cls}`} transform={`translate(${x} ${y})`}>
      <rect width={w} height="34" rx="8" />
      <text x={w / 2} y="22">{text}</text>
    </g>
  )
  return (
    <figure className="hero-fig lg-hero">
      <svg viewBox="0 0 320 170" role="img" aria-label="A → B, A ⊢ B">
        <path className="lg-hero-wire" d="M86 42 C120 42 120 82 150 82" />
        <path className="lg-hero-wire" d="M86 122 C120 122 120 98 150 98" />
        <path className="lg-hero-wire is-done" d="M226 90 C246 90 246 90 262 90" />
        {card(10, 25, 76, 'A → B')}
        {card(10, 105, 76, 'A')}
        {card(150, 73, 76, 'MP', 'is-rule')}
        {card(262, 73, 48, '∎', 'is-goal')}
      </svg>
    </figure>
  )
}
