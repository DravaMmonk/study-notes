import { useSyncExternalStore } from 'react'
import { applyLang, currentLang } from '../lang.js'
import { applyTheme, THEMES } from '../theme.js'
import { L, tr } from './i18n.js'
import { PHONE, useMedia } from './useMedia.js'
import Popover from './Popover.jsx'
import { optionsFor, settings, settingsFor } from './settings.js'

export default function SettingsPanel({ game, theme, onTheme, anchor, onClose }) {
  useSyncExternalStore(settings.subscribe, settings.snapshot, settings.snapshot)
  const phone = useMedia(PHONE)
  const entries = game ? settingsFor(game, { phone }) : []
  const chooseTheme = (id) => { applyTheme(id); onTheme(id); window.dispatchEvent(new CustomEvent('themechange', { detail: id })) }
  return <Popover className="player-settings-popover" anchor={anchor} title={tr('设置', 'Settings')} onClose={onClose}>
    <div className="player-settings">
      <section aria-label={tr('语言和主题', 'Language and theme')}>
        <div className="player-setting"><span>{tr('语言', 'Language')}</span><span className="setting-options">{[['zh', '简体中文'], ['en', 'English']].map(([id, label]) => <button type="button" key={id} lang={id === 'zh' ? 'zh-CN' : 'en'} aria-pressed={currentLang() === id} onClick={() => applyLang(id)}>{label}</button>)}</span></div>
        <div className="player-setting"><span>{tr('主题', 'Theme')}</span><span className="setting-options">{THEMES.map(([id, zh, en]) => <button type="button" key={id} aria-pressed={theme === id} onClick={() => chooseTheme(id)}>{tr(zh, en)}</button>)}</span></div>
      </section>
      {['display', 'edit'].map((group) => {
        const rows = entries.filter((s) => s.group === group)
        return rows.length > 0 && <section key={group} aria-label={group === 'display' ? tr('显示', 'Display') : tr('编辑', 'Editing')}>
          {rows.map((setting) => {
            const value = settings.get(game, setting.key, { phone })
            return <div className="player-setting" key={setting.key}>
              <span>{L(setting.label)}</span>
              {setting.kind === 'toggle' ? <button type="button" role="switch" aria-checked={value} aria-label={L(setting.label)} onClick={() => settings.set(game, setting.key, !value)}><i /></button> : <span className="setting-options">{optionsFor(setting, game).map((option) => <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => settings.set(game, setting.key, option.value)}>{L(option.label)}</button>)}</span>}
            </div>
          })}
        </section>
      })}
      <button type="button" className="settings-reset" onClick={() => { if (game) settings.reset(game); applyLang(/^zh\b/i.test(navigator.language || '') ? 'zh' : 'en'); chooseTheme('paper') }}>{tr('恢复默认', 'Restore defaults')}</button>
    </div>
  </Popover>
}
