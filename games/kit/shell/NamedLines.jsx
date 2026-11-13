// A few lines each under a short name, the same in every game: what the thing the player is making amounts to, written
// out as it stands (the rules a declaration gives, each by its kind). Read only.
//
//   lines   [{ name, mark? (a number after the name), text }]

export default function NamedLines({ lines }) {
  if (!lines.length) return null
  return (
    <dl className="named-lines">
      {lines.map((line, k) => (
        <div key={k}>
          <dt>{line.name}{line.mark !== undefined && <i>{line.mark}</i>}</dt>
          <dd>{line.text}</dd>
        </div>
      ))}
    </dl>
  )
}
