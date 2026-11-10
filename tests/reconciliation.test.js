import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileFindings} from '../server/domain.js';

test('model missing acceptance cannot be hidden by supported application policy',()=>{
 const [f]=reconcileFindings([{id:'acceptance',status:'supported'}],[{requirement:'acceptance',status:'missing'}]);
 assert.equal(f.status,'unknown');assert.deepEqual(f.disagreement,{policy:'supported',model:'missing'});
});
test('model support cannot bypass application missing acceptance',()=>{
 assert.equal(reconcileFindings([{id:'acceptance',status:'missing'}],[{requirement:'acceptance',status:'supported'}])[0].status,'unknown');
});
test('agreement preserves cited model explanation',()=>{
 const [f]=reconcileFindings([{id:'delivery',status:'supported'}],[{requirement:'delivery',status:'supported',explanation:'Delivered.',citations:[{evidenceId:'d',quote:'Merged.'}]}]);
 assert.equal(f.explanation,'Delivered.');assert.equal(f.disagreement,undefined);assert.equal(f.citations.length,1);
});
