import test from 'node:test';import assert from 'node:assert/strict';
import {buildApp} from '../server/app.js';import {createStore} from '../server/store.js';
test('model failure clears prior findings and invalidates approval without a demo fallback',async()=>{
 const previous=process.env.OLLAMA_BASE_URL;process.env.OLLAMA_BASE_URL='http://127.0.0.1:1';
 const store=createStore(':memory:');const c=store.get('northstar');c.approval={id:'old'};c.findings=[{status:'supported'}];store.put(c);
 const app=await buildApp({store});
 try{
  const r=await app.inject({method:'POST',url:'/api/cases/northstar/investigate',payload:{mode:'ollama'}});
  assert.equal(r.statusCode,503);const after=store.get('northstar');
  assert.equal(after.status,'investigation_failed');assert.equal(after.approval,null);assert.deepEqual(after.findings,[]);assert.equal(after.investigation.mode,'ollama');
  const rejected=await app.inject({method:'POST',url:'/api/cases/northstar/approve',payload:{recipient:'ap@northstar.example',subject:'Blocked',body:'Do not send',reviewer:'Tester'}});
  assert.equal(rejected.statusCode,409);
  assert.match(rejected.json().error,/successful current investigation/);
 }finally{await app.close();if(previous===undefined)delete process.env.OLLAMA_BASE_URL;else process.env.OLLAMA_BASE_URL=previous;}
});
test('demo reset preserves imported invoice records',()=>{
 const store=createStore(':memory:');
 try{store.put({id:'imported',imported:true,evidence:[]});store.reset();assert.ok(store.get('imported'));assert.equal(store.list().length,3);}finally{store.close();}
});
