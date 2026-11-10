import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {buildApp} from '../server/app.js';
import {createStore} from '../server/store.js';
import {evaluateEvidence,sourceReviewFor} from '../server/domain.js';
import {parseSource} from '../server/pilot.js';
import {parseInvoiceCsv} from '../server/imports.js';
import {readFile} from 'node:fs/promises';
async function setup(t,options={}){
 const store=options.store||createStore(':memory:');let sent=0;
 const app=await buildApp({...options,store,transport:{sendMail:async()=>{sent++;return{messageId:'mock'};}}});
 t.after(()=>app.close());return{app,store,sent:()=>sent};
}
const post=(app,url,payload)=>app.inject({method:'POST',url,payload});
async function finished(app,caseId,id){
 for(let i=0;i<40;i++){const r=await app.inject('/api/cases/'+caseId+'/investigations/'+id);if(r.json().job.status!=='running')return r.json();await setImmediate();}
 throw Error('Job did not finish');
}
const modelResult=c=>({summary:'Mock transport only.',findings:evaluateEvidence(c).map(f=>({
 requirement:f.id,status:f.status,explanation:f.explanation,evidenceIds:f.evidenceIds,
 citations:f.evidenceIds.map(id=>({evidenceId:id,quote:c.evidence.find(e=>e.id===id).text})),
}))});

test('plain email parsing preserves original headers and treats From as unverified',()=>{
 const c={id:'x',milestone:'M1',project:'Portal',invoiceNumber:'X',synthetic:false};
 const raw='From: Client <client@customer.example>\r\nDate: Wed, 04 Nov 2026 10:00:00 +0800\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nI accept milestone M1.';
 const e=parseSource({filename:'signoff.eml',content:raw,kind:'acceptance'},c);
 assert.equal(e.author,'client@customer.example');assert.equal(e.text,'I accept milestone M1.');
 assert.equal(e.originalText,raw);assert.equal(e.identityVerified,false);assert.equal(e.accepted,undefined);assert.match(e.provenance,/consented/);
 for(const content of [raw.replace('text/plain','multipart/mixed'),raw.replace('Content-Type:','Content-Transfer-Encoding: base64\r\nContent-Type:'),'Missing headers'])
  assert.throws(()=>parseSource({filename:'bad.eml',content,kind:'acceptance'},c));
 assert.throws(()=>parseSource({filename:'x.html',content:'x',kind:'delivery'},c));
});

test('invoice provenance is explicit and does not imply verified customer identity',async()=>{
 const csv=await readFile(new URL('../samples/sample-invoices.csv',import.meta.url),'utf8');
 assert.equal(parseInvoiceCsv(csv)[0].synthetic,true);
 const c=parseInvoiceCsv(csv,[],'consented')[0];assert.equal(c.synthetic,false);assert.equal(c.dataOrigin,'consented');assert.equal(c.approval,null);
 assert.throws(()=>parseInvoiceCsv(csv,[],'verified'));
});

test('uploaded delivery needs review; reviewing delivery never establishes acceptance',async t=>{
 const f=await setup(t);const c=f.store.get('harbor');
 let r=await post(f.app,'/api/cases/harbor/sources',{filename:'delivery.txt',content:'Portal delivered for milestone M2.',kind:'delivery',author:'Developer'});
 assert.equal(r.statusCode,200);const e=r.json().evidence.at(-1);
 const only={...c,evidence:[e]};assert.equal(evaluateEvidence(only)[1].status,'unknown');
 r=await post(f.app,'/api/cases/harbor/sources/'+e.id+'/review',{quote:e.text,decision:'delivery',reviewer:'Tester',confirmed:true});
 assert.equal(r.statusCode,200);assert.equal(r.json().approval,null);
 const reviewed={...r.json(),evidence:[r.json().evidence.at(-1)]};assert.equal(evaluateEvidence(reviewed)[1].status,'supported');assert.equal(evaluateEvidence(reviewed)[2].status,'missing');
});

test('acceptance review rejects unauthorized sender, unrelated quote and cross-case source',async t=>{
 const f=await setup(t);const payload={filename:'acceptance.txt',content:'I accept M2 for billing.',kind:'acceptance',author:'outsider@client.example'};
 let r=await post(f.app,'/api/cases/harbor/sources',payload);const id=r.json().evidence.at(-1).id;
 assert.equal(evaluateEvidence(r.json())[2].status,'unknown');
 const review={quote:payload.content,decision:'accepted',reviewer:'Tester',confirmed:true};
 assert.equal((await post(f.app,'/api/cases/harbor/sources/'+id+'/review',review)).statusCode,400);
 assert.equal((await post(f.app,'/api/cases/northstar/sources/'+id+'/review',review)).statusCode,404);
 assert.equal((await post(f.app,'/api/cases/harbor/sources/'+id+'/review',{...review,quote:'Invented'})).statusCode,400);
 r=await post(f.app,'/api/cases/harbor/sources',{...payload,author:'approver@harbor.example'});
 const source=r.json().evidence.at(-1);
 r=await post(f.app,'/api/cases/harbor/sources/'+source.id+'/review',review);
 assert.equal(r.statusCode,200);assert.equal(evaluateEvidence(r.json())[2].status,'unknown');
 r=await post(f.app,'/api/cases/harbor/sources/'+id+'/review',{...review,decision:'not_acceptance'});
 assert.equal(r.statusCode,200);assert.equal(evaluateEvidence(r.json())[2].status,'supported');
 const changed=r.json();changed.evidence.at(-1).text+=' Altered.';assert.equal(evaluateEvidence(changed)[2].status,'unknown');
});

test('new uploaded evidence invalidates a successful investigation and approval',async t=>{
 const f=await setup(t);await post(f.app,'/api/cases/northstar/investigate',{mode:'demo'});
 const c=f.store.get('northstar');
 let r=await post(f.app,'/api/cases/northstar/approve',{recipient:c.draft.to,subject:c.draft.subject,body:c.draft.body,reviewer:'Tester'});
 assert.equal(r.statusCode,200);
 r=await post(f.app,'/api/cases/northstar/sources',{filename:'new.txt',content:'Additional delivery record.',kind:'delivery'});
 assert.equal(r.statusCode,200);assert.equal(r.json().approval,null);assert.equal(r.json().investigation,null);assert.deepEqual(r.json().findings,[]);
});

test('downloadable packs require current findings and contain selectable PDF text',async t=>{
 const f=await setup(t);
 assert.equal((await f.app.inject('/api/cases/northstar/pack')).statusCode,409);
 const c=f.store.get('northstar');c.customer='Northstar Studio - José Niño';c.evidence[1].text=c.evidence[1].excerpt='<script>alert(1)</script>';f.store.put(c);
 await post(f.app,'/api/cases/northstar/investigate',{mode:'demo'});
 let r=await f.app.inject('/api/cases/northstar/pack');assert.equal(r.statusCode,200);assert.match(r.headers['content-disposition'],/attachment/);
 assert.match(r.headers['content-type'],/application\/pdf/);assert.equal(r.rawPayload.subarray(0,5).toString(),'%PDF-');
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=getDocument({data:new Uint8Array(r.rawPayload),isEvalSupported:false});const pdf=await task.promise;let content='';
 try{for(let page=1;page<=pdf.numPages;page++)content+=(await(await pdf.getPage(page)).getTextContent()).items.map(i=>i.str||'').join(' ');}finally{await task.destroy();}
 assert.ok(!content.includes('Pilot outcome'));assert.ok(!content.includes('Manual preparation baseline'));assert.ok(pdf.numPages>=2);assert.match(content,/not proof of payment/);assert.ok(content.includes('<script>alert(1)</script>'));assert.match(content,/Northstar Studio/);assert.ok(content.includes('José Niño'));
 for(const format of ['html','json'])assert.equal((await f.app.inject('/api/cases/northstar/pack?format='+format)).statusCode,400);
 r=await f.app.inject('/api/cases/northstar/pack?format=pdf');assert.equal(r.statusCode,200);
 const changed=f.store.get('northstar');changed.evidence[1].version='changed';f.store.put(changed);
 assert.equal((await f.app.inject('/api/cases/northstar/pack')).statusCode,409);
});

test('removed pilot outcome endpoint is unavailable and cannot send mail',async t=>{
 const f=await setup(t);
 const r=await post(f.app,'/api/cases/harbor/pilot',{outcome:'paid',reviewer:'Tester',note:'Obsolete feature',reference:'Unused'});
 assert.equal(r.statusCode,404);assert.equal(f.sent(),0);assert.equal(f.store.get('harbor').pilot,undefined);
});

test('async investigations return 202, persist progress, lock writes and reject duplicate starts',async t=>{
 let release;const gate=new Promise(resolve=>release=resolve);
 const f=await setup(t,{investigate:async(c,options)=>{options.onProgress({stage:'writing_findings'});await gate;return modelResult(c);}});
 try {
 const r=await post(f.app,'/api/cases/northstar/investigations',{mode:'ollama'});assert.equal(r.statusCode,202);const id=r.json().job.id;
 let job;for(let i=0;i<20;i++){job=(await f.app.inject('/api/cases/northstar/investigations/'+id)).json();if(job.job.stage==='writing_findings')break;await setImmediate();}assert.equal(job.job.stage,'writing_findings');
 assert.equal((await post(f.app,'/api/cases/northstar/investigations',{mode:'ollama'})).statusCode,409);
 assert.equal((await post(f.app,'/api/cases/northstar/sources',{filename:'x.txt',content:'x',kind:'delivery'})).statusCode,409);
 assert.equal((await f.app.inject('/api/cases/harbor/investigations/'+id)).statusCode,404);
 release();job=await finished(f.app,'northstar',id);assert.equal(job.job.status,'completed');assert.equal(job.case.status,'review_ready');
 }finally{release();}
});

test('async failures clear approval, persist an actionable error and allow explicit retry',async t=>{
 let fail=true;const f=await setup(t,{investigate:async c=>{if(fail)throw Object.assign(new Error('Model unavailable'),{code:'OLLAMA_UNAVAILABLE'});return modelResult(c);}});
 let r=await post(f.app,'/api/cases/harbor/investigations',{mode:'ollama'});
 let result=await finished(f.app,'harbor',r.json().job.id);assert.equal(result.job.status,'failed');assert.equal(result.case.approval,null);assert.match(result.job.error,/unavailable/);
 fail=false;r=await post(f.app,'/api/cases/harbor/investigations',{mode:'ollama'});result=await finished(f.app,'harbor',r.json().job.id);assert.equal(result.job.status,'completed');
});

test('server restart marks interrupted persisted investigations failed without approving them',async t=>{
 const store=createStore(':memory:');const c=store.get('northstar');c.status='investigating';c.investigationJob={id:'old',mode:'ollama',status:'running'};store.put(c);
 const f=await setup(t,{store});const r=await f.app.inject('/api/cases/northstar/investigations/old');
 assert.equal(r.json().job.status,'failed');assert.equal(r.json().case.approval,null);assert.equal(r.json().case.investigation.errorCode,'RESTARTED');
});
