import { L, tr } from '../../../shell/i18n.js'
import { feeding, outputsOf, srcNode, srcOf } from '../../../circuit/model.js'
import { fmt, isImage, pixel, show } from '../image.js'
import ImageInspector from './ImageInspector.jsx'

const read = (ctx, source) => ({ value: source ? ctx.view.values.get(source) : undefined, error: source ? ctx.view.errors.get(srcNode(source)) : null })
const sample = (value, x, y) => isImage(value) ? pixel(value, x, y) : value
const text = (value) => Array.isArray(value) ? `(${value.join(', ')})` : String(value)

function DataValue({ value, error, label, explainPixel, fit }) {
  if (value === undefined) return <p className="vi-error">{error ? L(error) : tr('尚未连接或上游未产生结果', 'Not connected or no upstream result yet')}</p>
  if (isImage(value)) return <ImageInspector {...{ value, label, explainPixel }} fit={fit} dense />
  return <div className="vi-detail-scalar"><span>{label}</span><strong>{show(value)}</strong></div>
}

/** Live values belong to the domain; the shared shell owns opening and closing details. A desktop draws its images as
 * its result row does (fitted frames, number-wide cells), a phone as its results do. */
export default function PartDetail({ node, ctx, settings, description, phone = false }) {
  const { circuit, parts } = ctx.board
  const inputs = parts.inputs(node).map((port) => ({ port, label: parts.role(node) === 'sink' ? tr('接收到的值', 'Received value') : L(parts.portLabel?.(node, port) || port), ...read(ctx, feeding(circuit, node.id, port)) }))
  const outputs = parts.role(node) === 'sink' ? inputs.map((input) => ({ ...input, key: input.port })) : outputsOf(parts, node).map((port) => ({ ...port, ...read(ctx, srcOf(node, port.key)) }))
  const a = inputs.find((p) => p.port === 'a')?.value
  const b = inputs.find((p) => p.port === 'b')?.value
  const symbol = {add:'+',sub:'−',mul:'×',div:'÷'}[node.type === 'arithmetic' ? node.params?.op ?? 'add' : node.type]
  const arithmetic = Boolean(symbol) && a !== undefined && b !== undefined
  const operation = (node.type === 'add' || node.type === 'arithmetic' && (node.params?.op ?? 'add') === 'add') && a !== undefined && b !== undefined
  const real = outputs.find((o) => o.key === 're')?.value
  const imaginary = outputs.find((o) => o.key === 'im')?.value
  const complexNote = isImage(real) && isImage(imaginary) && real.c === 1 && imaginary.c === 1 ? (x, y) => {
    const re = pixel(real,x,y), im = pixel(imaginary,x,y), magnitude = Math.hypot(re,im)
    return tr(`系数大小 ${fmt(magnitude)} · ${magnitude < 1e-12 ? '系数近零，暂不显示相位' : `相位 ${fmt(Math.atan2(im,re)/(2*Math.PI))} 周`}`, `Magnitude ${fmt(magnitude)} · ${magnitude < 1e-12 ? 'near-zero coefficient; phase omitted' : `phase ${fmt(Math.atan2(im,re)/(2*Math.PI))} turns`}`)
  } : undefined
  return <div className="vi-part-detail">
    {description && <p className="vi-part-notes">{L(description)}</p>}
    {settings && <div className="vi-detail-settings">{settings}</div>}
    {outputs.length > 0 && <section className="vi-detail-values" aria-label={tr('输出', 'Outputs')}>{outputs.map((out) => <DataValue key={out.key ?? 'value'} fit={!phone} label={parts.role(node) === 'sink' ? tr('接收到的值','Received value') : node.type === 'grid' ? tr(`${out.key} 坐标图`, `${out.key} coordinate image`) : out.key === null ? tr('输出', 'Output') : L(out.label)} value={out.value} error={out.error}
      explainPixel={operation ? (x, y) => `${text(sample(a, x, y))} + ${text(sample(b, x, y))} = ${text(pixel(out.value, x, y))}` : arithmetic ? (x,y)=>`${text(sample(a,x,y))} ${symbol} ${text(sample(b,x,y))} = ${text(pixel(out.value,x,y))}` : complexNote} />)}</section>}
  </div>
}
