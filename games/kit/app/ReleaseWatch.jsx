import { useEffect, useState } from 'react'
import { Dialog } from '../shell/index.js'
import { tr } from '../shell/i18n.js'
import { refreshURL, releaseChanged } from './release.js'

/** What is wrong with the content the page read, one problem a line. */
export function Unreadable({ problems }) {
  return (
    <main className="content-problems">
      <h1>{tr('这款游戏的内容读不进来', 'This game’s content cannot be read')}</h1>
      <ul>{problems.map((p, k) => <li key={k}><code>{p}</code></li>)}</ul>
    </main>
  )
}

export function ReleaseWatch({ page, content, loadedAssets }) {
  const [updated, setUpdated] = useState(false)
  useEffect(() => {
    if (import.meta.env.DEV) return undefined
    let active = true
    let checking = false
    const check = async () => {
      if (checking || document.visibilityState === 'hidden') return
      checking = true
      const changed = await releaseChanged({ base: window.location.href, assets: loadedAssets, content })
      checking = false
      if (active && changed) setUpdated(true)
    }
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    check()
    const timer = window.setInterval(check, 45000)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
    }
  }, [content, loadedAssets])
  if (!updated) return page
  // An embedded level (`?embed`) reopens on itself, with no map to return to.
  const embedded = new URL(window.location.href).searchParams.has('embed')
  const lines = embedded
    ? [tr('请刷新以使用最新版本。更新可能会重置这一关的进度。', 'Refresh to use the latest version. An update may reset this level’s progress.')]
    : [tr('请刷新以使用最新版本，刷新后将返回关卡导航页。更新可能会重置游戏进度。', 'Refresh to use the latest version and return to the level map. An update may reset your progress.')]
  const label = embedded ? tr('刷新', 'Refresh') : tr('刷新并返回导航', 'Refresh and return to map')
  return <>{page}<Dialog top title={tr('游戏已更新', 'Game updated')} lines={lines} actions={[[label, () => window.location.replace(refreshURL(window.location.href))]]} /></>
}

