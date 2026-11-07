import test from 'node:test'
import assert from 'node:assert/strict'
import { markupOf } from './markup.js'

test('math fences preserve LaTeX, inequalities and adjacent reference markup', () => {
  const parsed=markupOf(String.raw`Value \(a<b>c\), \[\frac{1}{N}\sum_n x_n\] <wiki-ref to="term"></wiki-ref>`)
  assert.deepEqual(parsed.problems,[])
  assert.deepEqual(parsed.nodes,['Value ',{math:'a<b>c',display:false},', ',{math:String.raw`\frac{1}{N}\sum_n x_n`,display:true},' ',{ref:'wiki',to:'term'}])
})

test('code spans retain literal math notation while ordinary emphasis can contain math', () => {
  assert.deepEqual(markupOf(String.raw`<code>\(x\)</code> <b>\(y\)</b>`).nodes,[{tag:'code',kids:[String.raw`\(x\)`]},' ',{tag:'b',kids:[{math:'y',display:false}]}])
})

test('unclosed mathematical text is rejected without hiding surrounding prose', () => {
  for(const fence of [String.raw`\(`,String.raw`\[`]){
    const parsed=markupOf(`before ${fence}x`)
    assert.equal(parsed.problems.length,1)
    assert.match(parsed.problems[0],/unclosed math delimiter/)
    assert.deepEqual(parsed.nodes,[`before ${fence}x`])
  }
})
