import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApp} from '../server/app.js';
import {createStore} from '../server/store.js';
import {approvalHash,contractReviewFor,evaluateEvidence,seedCases,investigationHash,sourceReviewFor} from '../server/domain.js';
import {renderEvidencePdf} from '../server/pdf-pack.js';

async function setup(t){
 const store=createStore(':memory:');let sent=0;
 const app=await buildApp({store,transport:{sendMail:async()=>{sent++;return {messageId:'mock-only'};}}});
 t.after(()=>app.close());
 return {store,app,sent:()=>sent};
}
const draft={recipient:'ap@northstar.example',subject:'Audit',body:'Synthetic test message',reviewer:'Test reviewer'};
const post=(app,url,payload)=>app.inject({method:'POST',url,payload});

for(const state of ['investigation_failed','investigating','new']){
 test(state+' cannot edit, approve or send even with a forged matching approval hash',async t=>{
  const f=await setup(t);const c=f.store.get('northstar');
  c.status=state;c.findings=[];c.investigation={mode:'ollama',errorCode:'AGENT_LIMIT'};
  c.draft={...draft,to:draft.recipient};c.approval={id:'forged',hash:approvalHash(c)};f.store.put(c);
  assert.equal((await f.app.inject({method:'PATCH',url:'/api/cases/northstar/draft',payload:draft})).statusCode,409);
  assert.equal((await post(f.app,'/api/cases/northstar/approve',draft)).statusCode,409);
  assert.equal((await post(f.app,'/api/cases/northstar/send',{approvalId:'forged'})).statusCode,409);
  assert.equal(f.sent(),0);
 });
}

for(const shape of ['empty','missing','duplicate','invalid-status']){
 test('completed-looking investigation with '+shape+' findings cannot approve or send',async t=>{
  const f=await setup(t);
  await post(f.app,'/api/cases/northstar/investigate',{mode:'demo'});
  const c=f.store.get('northstar');
  if(shape==='empty')c.findings=[];
  if(shape==='missing')c.findings.pop();
  if(shape==='duplicate')c.findings[2]=structuredClone(c.findings[0]);
  if(shape==='invalid-status')c.findings[0].status='verified';
  c.draft={...draft,to:draft.recipient};c.approval={id:'forged',hash:approvalHash(c)};f.store.put(c);
  assert.equal((await post(f.app,'/api/cases/northstar/approve',draft)).statusCode,409);
  assert.equal((await post(f.app,'/api/cases/northstar/send',{approvalId:'forged'})).statusCode,409);
  assert.equal(f.sent(),0);
 });
}

test('independent send check rejects routing unresolved findings to client',async t=>{
 const f=await setup(t);await post(f.app,'/api/cases/harbor/investigate',{mode:'demo'});
 const c=f.store.get('harbor');c.status='approved';c.draft={...draft,to:'ap@harbor.example'};
 c.approval={id:'forged',hash:approvalHash(c)};f.store.put(c);
 assert.equal((await post(f.app,'/api/cases/harbor/send',{approvalId:'forged'})).statusCode,409);
 assert.equal(f.sent(),0);
});

test('complete missing-evidence findings still permit reviewed internal test delivery',async t=>{
 const f=await setup(t);let r=await post(f.app,'/api/cases/harbor/investigate',{mode:'demo'});
 r=await post(f.app,'/api/cases/harbor/approve',{recipient:r.json().draft.to,subject:'Internal review',body:'Locate the missing acceptance.',reviewer:'Tester'});
 assert.equal(r.statusCode,200);
 assert.equal((await post(f.app,'/api/cases/harbor/send',{approvalId:r.json().approval.id})).statusCode,200);
 assert.equal(f.sent(),1);
});

test('file type alone cannot support a contract and unrelated clauses cannot be confirmed',()=>{
 const c=seedCases()[0];const e=c.evidence[0];e.text=e.excerpt='Lunch menu only. No billing terms.';
 delete c.contractReview;
 assert.equal(evaluateEvidence(c)[0].status,'unknown');
 assert.throws(()=>contractReviewFor(c,e,e.text,'Tester'),/does not document/);
});

test('a valid billing clause still needs explicit review; source and context changes invalidate it',()=>{
 const c=seedCases()[0];const e=c.evidence[0];delete c.contractReview;
 assert.equal(evaluateEvidence(c)[0].status,'unknown');
 c.contractReview=contractReviewFor(c,e,e.text,'Tester');
 assert.equal(evaluateEvidence(c)[0].status,'supported');
 e.text+=' Changed terms.';
 assert.equal(evaluateEvidence(c)[0].status,'unknown');
 e.excerpt=e.text;c.contractReview=contractReviewFor(c,e,e.text,'Tester');c.milestone='Other milestone';
 assert.equal(evaluateEvidence(c)[0].status,'missing');
});

test('contract review route rejects wrong-case sources, altered quotes and absent confirmation',async t=>{
 const f=await setup(t);const c=f.store.get('northstar');const source=c.evidence[0];
 const valid={sourceId:source.id,quote:source.text,reviewer:'Tester',confirmed:true};
 for(const payload of [{...valid,sourceId:'harbor-contract'},{...valid,quote:'Invented clause'},{...valid,confirmed:false},{...valid,reviewer:' '}]){
  assert.equal((await post(f.app,'/api/cases/northstar/contract-review',payload)).statusCode,400);
 }
 await post(f.app,'/api/cases/northstar/investigate',{mode:'demo'});
 const response=await post(f.app,'/api/cases/northstar/contract-review',valid);
 assert.equal(response.statusCode,200);
 const reviewed=response.json();assert.equal(reviewed.investigation,null);assert.equal(reviewed.approval,null);assert.deepEqual(reviewed.findings,[]);
 assert.equal((await post(f.app,'/api/cases/northstar/approve',draft)).statusCode,409);
});

test('send refuses changed contract review even when approval hash is recomputed',async t=>{
 const f=await setup(t);let r=await post(f.app,'/api/cases/northstar/investigate',{mode:'demo'});
 r=await post(f.app,'/api/cases/northstar/approve',{...draft,body:r.json().draft.body});
 assert.equal(r.statusCode,200);
 const c=f.store.get('northstar');c.contractReview.quote='Changed review';
 c.approval.hash=approvalHash(c);f.store.put(c);
 assert.notEqual(c.investigation.evidenceHash,investigationHash(c));
 assert.equal((await post(f.app,'/api/cases/northstar/send',{approvalId:c.approval.id})).statusCode,409);
 assert.equal(f.sent(),0);
});

const withdrawal={filename:'withdrawal.txt',kind:'acceptance',author:'approver@northstar.example',content:'I withdraw my acceptance of M2. Do not bill this milestone; it is rejected.'};
const acceptanceFinding=c=>evaluateEvidence(c).find(f=>f.id==='acceptance');

test('an unreviewed withdrawal overrides prior acceptance and independently blocks external approval and send',async t=>{
 const f=await setup(t);
 assert.equal(acceptanceFinding(f.store.get('northstar')).status,'supported');
 let r=await post(f.app,'/api/cases/northstar/sources',withdrawal);
 assert.equal(r.statusCode,200);
 const pending=acceptanceFinding(r.json());
 assert.equal(pending.status,'unknown');
 assert.deepEqual(pending.evidenceIds,[]);
 assert.match(pending.explanation,/human review/i);
 r=await post(f.app,'/api/cases/northstar/investigate',{mode:'demo'});
 assert.equal(r.statusCode,200);
 assert.equal(r.json().status,'needs_evidence');
 assert.equal(r.json().findings.find(f=>f.id==='acceptance').status,'unknown');
 assert.equal(r.json().draft.to,'project-manager@agency.example');
 assert.equal((await post(f.app,'/api/cases/northstar/approve',draft)).statusCode,409);
 const c=f.store.get('northstar');c.status='approved';c.draft={...draft,to:draft.recipient};
 c.approval={id:'forged',hash:approvalHash(c)};f.store.put(c);
 assert.equal((await post(f.app,'/api/cases/northstar/send',{approvalId:'forged'})).statusCode,409);
 assert.equal(f.sent(),0);
});

test('explicit withdrawal review conflicts; not-acceptance review restores earlier support after reinvestigation',async t=>{
 const f=await setup(t);
 let r=await post(f.app,'/api/cases/northstar/sources',withdrawal);
 assert.equal(r.statusCode,200);const id=r.json().evidence.at(-1).id;
 const review={quote:withdrawal.content,reviewer:'Test reviewer',confirmed:true};
 r=await post(f.app,'/api/cases/northstar/sources/'+id+'/review',{...review,decision:'rejected'});
 assert.equal(r.statusCode,200);assert.equal(acceptanceFinding(r.json()).status,'conflicting');
 r=await post(f.app,'/api/cases/northstar/investigate',{mode:'demo'});
 assert.equal(r.statusCode,200);assert.equal(r.json().status,'needs_evidence');
 assert.equal((await post(f.app,'/api/cases/northstar/approve',draft)).statusCode,409);
 r=await post(f.app,'/api/cases/northstar/sources/'+id+'/review',{...review,decision:'not_acceptance'});
 assert.equal(r.statusCode,200);
 assert.equal(r.json().approval,null);assert.equal(r.json().investigation,null);
 assert.equal((await post(f.app,'/api/cases/northstar/approve',draft)).statusCode,409);
 assert.equal(acceptanceFinding(r.json()).status,'supported');
 r=await post(f.app,'/api/cases/northstar/investigate',{mode:'demo'});
 assert.equal(r.statusCode,200);assert.equal(r.json().status,'review_ready');
 assert.equal(r.json().draft.to,draft.recipient);
 assert.equal((await post(f.app,'/api/cases/northstar/approve',draft)).statusCode,200);
 assert.equal(f.sent(),0);
});

for(const change of ['source text','source author','case authority']){
 test('stale acceptance review after changed '+change+' cannot expose prior support',()=>{
  const c=seedCases()[0];
  const source={...c.evidence[2],id:'uploaded-withdrawal',mode:'uploaded',accepted:undefined,text:withdrawal.content,excerpt:withdrawal.content};
  source.review=sourceReviewFor(c,source,{quote:source.text,reviewer:'Tester',decision:'not_acceptance'});
  c.evidence.push(source);assert.equal(acceptanceFinding(c).status,'supported');
  if(change==='source text')source.text+=' Changed record.';
  if(change==='source author')source.author='different@northstar.example';
  if(change==='case authority')c.authorizedApprovers.push('additional@northstar.example');
  assert.equal(acceptanceFinding(c).status,'unknown');
  assert.deepEqual(acceptanceFinding(c).evidenceIds,[]);
 });
}

test('out-of-case unreviewed acceptance cannot block this milestone',()=>{
 for(const scope of [{caseId:'harbor'},{milestone:'M1 - Discovery'},{project:'Unrelated project'},{invoiceNumber:'OTHER-INVOICE'},{isCurrent:false}]){
  const c=seedCases()[0];
  c.evidence.push({...c.evidence[2],id:'other-withdrawal',mode:'uploaded',accepted:undefined,text:withdrawal.content,excerpt:withdrawal.content,...scope});
  assert.equal(acceptanceFinding(c).status,'supported');
 }
});

async function storedModelCase(f,id='northstar'){
 await post(f.app,'/api/cases/'+id+'/investigate',{mode:'demo'});
 const c=f.store.get(id),source=c.evidence.find(e=>e.type==='contract'),clause=source.text;
 source.text='Statement of Work\n'+clause;
 c.contractReview=contractReviewFor(c,source,clause,'Synthetic legacy reviewer');
 c.findings=c.findings.map(finding=>({...finding,citations:finding.evidenceIds.map(evidenceId=>({evidenceId,quote:evidenceId===source.id?clause:c.evidence.find(e=>e.id===evidenceId).text}))}));
 c.investigation={...c.investigation,mode:'ollama',summary:'Historical synthetic saved model result.',evidenceHash:investigationHash(c),
  toolCalls:[{name:'get_case_evidence',status:'completed'},{name:'finish_investigation',status:'completed'}],
  modelFindings:c.findings.map(finding=>({...finding,requirement:finding.id}))};
 return c;
}

for(const location of ['model output','displayed findings','both']){
 test('historical heading-only '+location+' blocks edit, approval, send and PDF export until reinvestigation',async t=>{
  const f=await setup(t);const c=await storedModelCase(f);
  if(location!=='displayed findings')c.investigation.modelFindings.find(f=>f.requirement==='contract').citations[0].quote='Statement of Work';
  if(location!=='model output')c.findings.find(f=>f.id==='contract').citations[0].quote='Statement of Work';
  f.store.put(c);
  const edit=await f.app.inject({method:'PATCH',url:'/api/cases/northstar/draft',payload:draft});
  const approve=await post(f.app,'/api/cases/northstar/approve',draft);
  c.status='approved';c.draft={...draft,to:draft.recipient};c.approval={id:'legacy-forged',hash:approvalHash(c)};f.store.put(c);
  const send=await post(f.app,'/api/cases/northstar/send',{approvalId:c.approval.id});
  const pack=await f.app.inject('/api/cases/northstar/pack');
  assert.deepEqual([edit.statusCode,approve.statusCode,send.statusCode,pack.statusCode],[409,409,409,409]);
  assert.match(approve.json().error,/investigate again/i);assert.match(send.json().error,/investigate again/i);
  await assert.rejects(()=>renderEvidencePdf(c),/investigate again/i);
  assert.equal(f.sent(),0);
 });
}

for(const id of ['northstar','harbor']){
 test('valid saved reviewed model citations still allow '+id+' approval without new inference',async t=>{
  const f=await setup(t);const c=await storedModelCase(f,id);f.store.put(c);
  const response=await post(f.app,'/api/cases/'+id+'/approve',{recipient:c.draft.to,subject:c.draft.subject,body:c.draft.body,reviewer:'Tester'});
  assert.equal(response.statusCode,200);assert.ok(response.json().approval?.id);assert.equal(f.sent(),0);
  const pack=await f.app.inject('/api/cases/'+id+'/pack');assert.equal(pack.statusCode,200);
  assert.equal(pack.headers['content-type'],'application/pdf');assert.equal(pack.rawPayload.subarray(0,5).toString(),'%PDF-');
  const pdf=await renderEvidencePdf(c);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 });
}
