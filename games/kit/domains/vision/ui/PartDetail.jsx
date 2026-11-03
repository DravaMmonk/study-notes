import { L, tr } from '../../../shell/i18n.js'
import { feeding, outputsOf, srcNode, srcOf } from '../../../circuit/model.js'
import { fmt, isImage, pixel, show } from '../image.js'
import ImageInspector from './ImageInspector.jsx'

const read = (ctx, source) => ({ value: source ? ctx.view.values.get(source) : undefined, error: source ? ctx.view.errors.get(srcNode(source)) : null })
const sample = (value, x, y) => isImage(value) ? pixel(value, x, y) : value
const text = (value) => Array.isArray(value) ? `(${value.join(', ')})` : String(value)
const compact = (value) => value === undefined ? '—' : isImage(value) ? `${value.w}×${value.h}` : show(value)

function DataValue({ value, error, label, explainPixel }) {
  if (value === undefined) return <p className="vi-error">{error ? L(error) : tr('尚未连接或上游未产生结果', 'Not connected or no upstream result yet')}</p>
  if (isImage(value)) return <ImageInspector {...{ value, label, explainPixel }} />
  return <div className="vi-detail-scalar"><span>{label}</span><strong>{show(value)}</strong></div>
}

/** Live values belong to the domain; the shared shell owns opening and closing details. */
export default function PartDetail({ node, ctx, settings }) {
  const { circuit, parts } = ctx.board
  const inputs = parts.inputs(node).map((port) => ({ port, label: parts.role(node) === 'sink' ? tr('接收到的值', 'Received value') : L(parts.portLabel?.(node, port) || port), ...read(ctx, feeding(circuit, node.id, port)) }))
  const outputs = parts.role(node) === 'sink' ? [] : outputsOf(parts, node).map((port) => ({ ...port, ...read(ctx, srcOf(node, port.key)) }))
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
  const explanation = operation ? isImage(a) || isImage(b)
    ? isImage(a) && isImage(b) ? tr('两张图按对应格相加，尺寸不变。', 'Add matching cells; dimensions stay the same.') : tr(`每格加 ${text(isImage(a) ? b : a)}，图的尺寸不变。`, `Add ${text(isImage(a) ? b : a)} to each cell; dimensions stay the same.`)
    : `${a} + ${b} = ${outputs[0]?.value ?? '—'}`
    : null
  return <div className="vi-part-detail">
    {settings && <div className="vi-detail-settings">{settings}</div>}
    {outputs.length > 0 && <section className="vi-detail-values" aria-label={tr('输出', 'Outputs')}>{outputs.map((out) => <DataValue key={out.key ?? 'value'} label={node.type === 'grid' ? tr(`${out.key} 坐标图`, `${out.key} coordinate image`) : out.key === null ? tr('输出', 'Output') : L(out.label)} value={out.value} error={out.error}
      explainPixel={operation ? (x, y) => `${text(sample(a, x, y))} + ${text(sample(b, x, y))} = ${text(pixel(out.value, x, y))}` : arithmetic ? (x,y)=>`${text(sample(a,x,y))} ${symbol} ${text(sample(b,x,y))} = ${text(pixel(out.value,x,y))}` : complexNote} />)}</section>}
    {inputs.length > 0 && <details className="vi-detail-inputs">
      <summary>{(node.type === 'add' || node.type === 'arithmetic' && (node.params?.op ?? 'add') === 'add') ? tr('输入与说明', 'Inputs and explanation') : tr('输入', 'Inputs')}<small>{inputs.map((p) => `${p.label} ${compact(p.value)}`).join(' · ')}</small></summary>
      <div className="vi-detail-extra">
        {explanation && <p className="vi-detail-explanation">{explanation}</p>}
        <div className="vi-detail-values">{inputs.map((p) => <DataValue key={p.port} {...p} />)}</div>
    {(node.type === 'add' || node.type === 'arithmetic' && (node.params?.op ?? 'add') === 'add') && <details className="vi-add-guide"><summary>{tr('数、图、坐标相加有什么区别？', 'How do numbers, images and coordinates add?')}</summary>
      <dl>
        <dt>{tr('数 + 数', 'Number + number')}</dt><dd>{tr('3 + 2 = 5，只产生一个数。单个坐标值也按数计算，例如 x = 4 加 2 得到 6。', '3 + 2 = 5 produces one number. A single coordinate is also a number: x = 4 plus 2 becomes 6.')}</dd>
        <dt>{tr('图 + 数', 'Image + number')}</dt><dd>{tr('每格都加同一个数。例如某格亮度为 0.2，加 0.1 后为 0.3；图的宽高和格子位置不变。', 'Add the same number to every cell. An intensity of 0.2 plus 0.1 becomes 0.3; image dimensions and cell positions stay unchanged.')}</dd>
        <dt>{tr('坐标图 + 数', 'Coordinate image + number')}</dt><dd>{tr('坐标图保存的是取样位置。例如一行 x 坐标 [0, 1] 加 2，得到 [2, 3]；第 0 格仍在第 0 格，但它保存的取样列号变成了 2。用于取像素时，它会读取原图中列号为 2 的像素（列号从 0 开始）。', 'A coordinate image stores sampling positions. Adding 2 to x coordinates [0, 1] gives [2, 3]. Cell 0 remains cell 0, but now stores sampling column 2. A lookup using it reads source column 2.')}</dd>
        <dt>{tr('图 + 图', 'Image + image')}</dt><dd>{tr('两张图必须宽高相同，相同位置的值两两相加；灰度值与 RGB 像素相加时，分别加到 R、G、B。坐标图与照片相加也只是在加数值；要按照坐标从照片中读取数值，使用取像素元件。', 'The two images must have the same width and height. Add values at matching positions; a grey value paired with an RGB pixel is added to R, G and B. Adding a coordinate image to a photograph still only adds numbers. Use Lookup to read photograph values at specified coordinates.')}</dd>
      </dl>
    </details>}
      </div>
    </details>}

  </div>
}
