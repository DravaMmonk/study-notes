import { test } from 'node:test'
import assert from 'node:assert/strict'
import { numberKey, numberValue, stepNumber } from './number-entry.js'
const type=(keys,initial='0')=>keys.reduce(numberKey,{text:initial,replace:true})
test('phone numeric drafts support signed decimals, fractions and exponents without committing incomplete values',()=>{
  assert.equal(numberValue(type(['sign','.','2','5'],'').text),-.25)
  assert.equal(numberValue(type(['1','/','3']).text),1/3)
  assert.equal(numberValue(type(['1','e','sign','1','2']).text),1e-12)
  for(const draft of ['', '-', '.', '1/', '1e-', '1/0', '1e999'])assert.equal(numberValue(draft),null,draft)
  assert.equal(type(['.','5'],'2.75').text,'0.5')
  assert.equal(type(['clear','2','erase','3']).text,'3')
  assert.equal(type(['sign'],'4').text,'-4')
})

test('numeric steps respect direction and bounds without snapping typed fractions', () => {
  const limits = { min: 0, max: 1, step: 0.25 }
  assert.equal(stepNumber(1 / 3, 1, limits), 1 / 3 + 0.25)
  assert.equal(stepNumber(0.875, 1, limits), 1)
  assert.equal(stepNumber(0.125, -1, limits), 0)
  assert.equal(stepNumber(1, 1, limits), null)
  assert.equal(stepNumber(-1, -1, limits), null)
  assert.equal(stepNumber(-1, 1, limits), 0)
  assert.equal(stepNumber(NaN, 1, limits), null)
  assert.equal(stepNumber(Number.MAX_VALUE, 1, { step: Number.MAX_VALUE }), null)
  assert.equal(stepNumber(2, -1), 1)
})
