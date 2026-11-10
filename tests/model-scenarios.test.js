import test from 'node:test';
import assert from 'node:assert/strict';
import {modelCases} from './fixtures/model-cases.mjs';
import {evaluateEvidence} from '../server/domain.js';
for(const item of modelCases){
 test(`evidence policy scenario: ${item.id}`,()=>{
  const actual=Object.fromEntries(evaluateEvidence(item.input).map(f=>[f.id,f.status]));
  assert.deepEqual(actual,item.expected);
 });
}
