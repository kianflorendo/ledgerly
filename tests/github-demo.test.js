import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { createStore } from '../server/store.js';
import { createGithubDemoCase, refreshCaseGithub, registerGithubDemoRoutes, DEMO_CASE_ID } from '../server/github-demo.js';

const fetchOk = async () => ({ ok: true, json: async () => ({ title: 'feat: send photostrip emails via Resend', state: 'closed', merged: true, body: 'Replaced Gmail SMTP with Resend.' }) });
test('controlled scenario is synthetic and never imports GitHub as acceptance', async () => {
  const c = await refreshCaseGithub(createGithubDemoCase(), { fetchImpl: fetchOk });
  const e = c.evidence.find(e=>e.type==='delivery');
  assert.equal(c.synthetic,true); assert.equal(e.mode,'live'); assert.equal(e.accepted,false); assert.match(e.url,/photoboothV2\/pull\/3$/);
  assert.equal(c.evidence.filter(e=>e.type==='acceptance').length,1);
  assert.equal(c.evidence.find(e=>e.type==='acceptance').mode,'synthetic');
  assert.ok(e.fetchedAt); assert.equal(e.version.length,64);
});
test('explicit cached replay preserves snapshot version and timestamp without network', async () => {
  const live=await refreshCaseGithub(createGithubDemoCase(),{fetchImpl:fetchOk}); live.approval={id:'old'}; live.findings=[{status:'supported'}];
  const cached=await refreshCaseGithub(live,{mode:'cached',fetchImpl:()=>{throw Error('network must not run')}});
  const source=cached.evidence.find(e=>e.type==='delivery');
  assert.equal(source.mode,'cached');assert.equal(source.version,live.githubSnapshot.version);assert.equal(source.fetchedAt,live.githubSnapshot.fetchedAt);
  assert.equal(cached.approval,null);assert.deepEqual(cached.findings,[]);
});
test('cached replay without prior live snapshot is rejected',async()=>{
  await assert.rejects(refreshCaseGithub(createGithubDemoCase(),{mode:'cached'}),/No verified live snapshot/);
});
test('tampered mapping and unrelated case never reach network',async()=>{
  let called=false;const fetchImpl=async()=>{called=true;return fetchOk()};
  await assert.rejects(refreshCaseGithub({...createGithubDemoCase(),id:'northstar'},{fetchImpl}),/controlled synthetic case/);
  const c=createGithubDemoCase();c.evidence.push({type:'delivery',github:{owner:'evil',repo:'repo',number:3}});
  await assert.rejects(refreshCaseGithub(c,{fetchImpl}),/mapping/);assert.equal(called,false);
});
test('live failure never silently substitutes stored snapshot',async()=>{
  const c=await refreshCaseGithub(createGithubDemoCase(),{fetchImpl:fetchOk});const original=JSON.stringify(c);
  await assert.rejects(refreshCaseGithub(c,{fetchImpl:async()=>({ok:false,status:429})}),/Choose cached replay explicitly/);
  assert.equal(JSON.stringify(c),original);
});
test('invalid mode is rejected without network',async()=>{
  await assert.rejects(refreshCaseGithub(createGithubDemoCase(),{mode:'automatic'}),/Choose live or cached/);
});
test('route rejects arbitrary supplied repository and busy controlled case',async()=>{
  const app=Fastify();const store=createStore(':memory:');const locks=new Set([DEMO_CASE_ID]);
  registerGithubDemoRoutes(app,{store,locks,get:id=>store.get(id),fail:(statusCode,message)=>Object.assign(Error(message),{statusCode})});
  try {
    assert.equal((await app.inject({method:'POST',url:'/api/demo/github',payload:{owner:'evil'}})).statusCode,400);
    store.put(createGithubDemoCase());
    assert.equal((await app.inject({method:'POST',url:'/api/demo/github',payload:{mode:'live'}})).statusCode,409);
  } finally {await app.close();store.close();}
});
