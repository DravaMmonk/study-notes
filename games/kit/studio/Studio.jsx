// The studio (games/DESIGN.md 6.7, DIRECTION decision 5): two workspaces over the operation set, one for each side of a
// game. The package workspace (PackageStudio.jsx) is the level designer's: a package's levels, a level group at a
// time, their pieces and encyclopedia. The game workspace (GameStudio.jsx) is the course designer's: making a game on a
// package, arranging its chapters from whole groups and single levels, the map's layout, and the game's own wording
// over the package's texts, which it never changes. The bar switches between them; each keeps its own pending changes,
// and only its own side's operations run in it.
import './studio.css'
import { useEffect, useState } from 'react'
import { tr } from '../shell/i18n.js'
import { call } from './api.js'
import PackageStudio from './PackageStudio.jsx'
import GameStudio from './GameStudio.jsx'

const QUERY = new URLSearchParams(window.location.search)

export default function Studio() {
  const [games, setGames] = useState(null)
  const [space, setSpace] = useState(QUERY.get('space') === 'game' ? 'game' : 'package')
  const [game, setGame] = useState(QUERY.get('game'))
  const reload = () => call('games', {}).then((list) => {
    setGames(list)
    setGame((id) => (list.some((g) => g.id === id) ? id : list[0]?.id ?? null))
    return list
  })
  useEffect(() => { reload() }, [])
  if (!games || !game) return <div className="studio-loading">{tr('读取中……')}</div>
  const switcher = { value: space, onChange: setSpace }
  return space === 'game'
    ? <GameStudio game={game} games={games} onGame={setGame} onMade={(id) => reload().then(() => setGame(id))} space={switcher} />
    : <PackageStudio key={game} game={game} games={games} onGame={setGame} space={switcher} />
}
