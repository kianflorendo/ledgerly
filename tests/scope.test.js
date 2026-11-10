import test from 'node:test';import assert from 'node:assert/strict';
import {seedCases,evaluateEvidence} from '../server/domain.js';
for(const [field,value] of [['project','Another project'],['invoiceNumber','OTHER'],['contractVersion','stale-v0'],['isCurrent',false],['acceptanceScope','partial']]){
 test(`explicit ${field} mismatch cannot establish acceptance`,()=>{
  const c=seedCases()[0];c.evidence[2][field]=value;
  assert.equal(evaluateEvidence(c)[2].status,'missing');
 });
}
