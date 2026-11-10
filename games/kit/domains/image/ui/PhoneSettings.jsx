import { useState } from 'react'
import { L } from '../../../shell/i18n.js'
import SettingField from '../../../shell/parts/SettingField.jsx'
import Sheet from '../../../shell/Sheet.jsx'
import { InlineParam, KernelEditor, NumberEditor } from './phone/Editors.jsx'

export default function PhoneSettings({ label, node, settings, set, children }) {
  const [keypad, setKeypad] = useState(null)
  const param = keypad && settings.find((setting) => setting.key === keypad.key)
  const valueOf = (setting) => node.params[setting.key] ?? setting.default
  return <>
    {settings.map((setting) => <div className="pc-param" key={setting.key}>
      {setting.authored && (['toggle', 'slider'].includes(setting.kind) || (setting.fixed && !setting.learnable))
        ? <SettingField setting={setting.authored} allowed={setting.options?.map(([value]) => String(value))} value={valueOf(setting)} onChange={(value) => set(setting.key, value)} phone roomy />
        : <>
            <span className="pc-param-name">{L(setting.label)}</span>
            <InlineParam param={setting} value={valueOf(setting)} onChange={(value) => set(setting.key, value)} onKeypad={(cell) => setKeypad({ key: setting.key, cell })} />
          </>}
    </div>)}
    {children}
    {param && <Sheet title={`${L(label)} · ${L(param.label)}`} onClose={() => setKeypad(null)}>
      {param.kind === 'kernel'
        ? <KernelEditor param={param} value={valueOf(param)} onChange={(value) => set(param.key, value)} start={keypad.cell ?? 4} />
        : <NumberEditor param={param} value={valueOf(param)} onChange={(value) => set(param.key, value)} />}
    </Sheet>}
  </>
}
