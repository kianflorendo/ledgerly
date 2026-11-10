import test from 'node:test';
import assert from 'node:assert/strict';
import {readinessCases} from './fixtures/readiness-cases.mjs';
import {evaluateEvidence} from '../server/domain.js';
for(const scenario of readinessCases)test('readiness regression policy: '+scenario.id,()=>{
 const actual=Object.fromEntries(evaluateEvidence(scenario.input).map(f=>[f.id,f.status]));
 assert.deepEqual(actual,scenario.expected);
 if(scenario.expectedContractQuote){
  assert.equal(scenario.input.contractReview.quote,scenario.expectedContractQuote);
  assert.ok(!scenario.expectedContractQuote.includes('Synthetic pilot contract'));
 }
});
