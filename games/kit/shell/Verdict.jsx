// What a check or a run came to, in a line under the play area, the same in every game: green when it passed, red
// with the reason when it did not.
export default function Verdict({ pass, children }) {
  return <p className={`verdict ${pass ? 'is-pass' : 'is-fail'}`} role="status">{children}</p>
}
