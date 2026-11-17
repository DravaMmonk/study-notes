export function describeObservation(o, { phase, lang, say }) {
  const en = lang === 'en'
  const out = []
  if (phase === 'tools') {
    if (o.nodes?.length) {
      out.push(`## ${en ? 'Nodes the level gives (wire to and from them by name)' : '关卡给的节点（按名字接线）'}\n${o.nodes.map((n) => {
        const ins = n.inputs.length ? `${en ? 'inputs' : '输入口'}: ${n.inputs.join(', ')}` : ''
        const outs = n.outputs.length ? `${en ? 'outputs' : '输出'}: ${n.outputs.map((k) => `${n.id}.${k}`).join(', ')}` : ''
        const sets = n.sets.length ? `${en ? 'settable' : '可设置'}: ${n.sets.join(', ')}` : ''
        return `- ${n.id} (${n.role})${[ins, outs, sets].filter(Boolean).map((s) => `; ${s}`).join('')}`
      }).join('\n')}`)
    }
    if (o.palette) {
      out.push(`## ${en ? 'Parts in the tray' : '托盘里的元件'}\n${o.palette.length ? o.palette.map((p) => {
        const port = (x) => (x.label && say(x.label) !== x.key ? `${x.key} “${say(x.label)}”` : x.key)
        const io = `${p.type}(${p.inputs.map(port).join(', ')})${p.outputs.length ? ` → ${p.outputs.map(port).join(', ')}` : ''}`
        const sets = p.settings.length ? `\n    ${en ? 'settings' : '设置'}: ${p.settings.map((s) => `${s.key}${s.values ? `=${s.values.join('|')}` : ''}${s.about ? ` (${say(s.about)})` : ''}`).join('; ')}` : ''
        return `- ${io}  “${say(p.name)}”: ${say(p.desc)}${sets}`
      }).join('\n') : en ? '(none)' : '（没有）'}`)
    }
  }
  if (phase === 'work') {
    if (o.start) out.push(`## ${en ? 'The board as it opens (blueprint)' : '打开时的电路（蓝图）'}\n${o.start}`)
  }
  return out
}
