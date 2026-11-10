import test from 'node:test';
import assert from 'node:assert/strict';
import { investigateWithOllama, validateAgentFindings, fetchGithubEvidence, createBenchmarkInputContext } from '../server/agent.js';
import {contractReviewFor, sourceReviewFor, seedCases, evaluateEvidence} from '../server/domain.js';

const caseData = { id: 'a', milestone: 'M1', authorizedApprovers: ['client@example.test'], evidence: [
  { id: 'contract', caseId: 'a', milestone: 'M1', type: 'contract', text: 'Billing requires delivery and written client acceptance.' },
  { id: 'delivery', caseId: 'a', milestone: 'M1', type: 'delivery', text: 'PR merged.', accepted: true, author: 'client@example.test' },
  { id: 'approval', caseId: 'a', milestone: 'M1', type: 'acceptance', text: 'I accept M1.', accepted: true, author: 'client@example.test' },
] };
const reviewCase=c=>{c.contractReview=contractReviewFor(c,c.evidence[0],c.evidence[0].text,'Synthetic test reviewer');return c;};
const findings = () => ({ summary: 'Ready for review, not payment.', findings: [
  { requirement: 'contract', status: 'supported', explanation: 'Required.', evidenceIds: ['contract'], citations: [{ evidenceId: 'contract', quote: 'Billing requires delivery and written client acceptance.' }] },
  { requirement: 'delivery', status: 'supported', explanation: 'Merged.', evidenceIds: ['delivery'], citations: [{ evidenceId: 'delivery', quote: 'PR merged.' }] },
  { requirement: 'acceptance', status: 'supported', explanation: 'Explicit.', evidenceIds: ['approval'], citations: [{ evidenceId: 'approval', quote: 'I accept M1.' }] },
] });
caseData.contractReview=contractReviewFor(caseData,caseData.evidence[0],caseData.evidence[0].text,'Synthetic test reviewer');
const seen = new Set(['contract', 'delivery', 'approval']);

test('agent validates exact citations and known acceptance authority', () => {
  assert.equal(validateAgentFindings(findings(), caseData, caseData.evidence, seen).findings.length, 3);
  const bad = findings(); bad.findings[0].citations[0].quote = 'Invented clause';
  assert.throws(() => validateAgentFindings(bad, caseData, caseData.evidence, seen), /exact source/);
});
test('agent rejects unread source, cross-case evidence and unauthorized acceptance', () => {
  assert.throws(() => validateAgentFindings(findings(), caseData, caseData.evidence, new Set()), /unread/);
  assert.throws(() => validateAgentFindings(findings(), caseData, caseData.evidence.map((e) => ({ ...e, caseId: 'b' })), seen), /unread or unrelated/);
  assert.throws(() => validateAgentFindings(findings(), reviewCase({ ...caseData, authorizedApprovers: [] }), caseData.evidence, seen), /known authorized/);
});
test('merged pull request cannot establish acceptance', () => {
  const bad = findings(); bad.findings[2].evidenceIds = ['delivery']; bad.findings[2].citations = [{ evidenceId: 'delivery', quote: 'PR merged.' }];
  assert.throws(() => validateAgentFindings(bad, caseData, caseData.evidence, seen), /wrong source type/);
});
test('conflicting acceptance must never become supported', () => {
  const evidence = [...caseData.evidence, { id: 'rejection', caseId: 'a', milestone: 'M1', type: 'acceptance', text: 'M1 remains rejected.', accepted: false, author: 'client@example.test' }];
  assert.throws(() => validateAgentFindings(findings(), caseData, evidence, seen), /Conflicting acceptance/);
});
test('supported findings require a quote for each referenced source', () => {
  const result = findings(); result.findings[0].citations = [];
  assert.throws(() => validateAgentFindings(result, caseData, caseData.evidence, seen), /exact citations/);
});

test('supported contract rejects headings and incomplete conditions even when exact and human reviewed', () => {
  const clause='Milestone M1 is billable only after delivery and written client acceptance.';
  const source={...caseData.evidence[0],text:'Synthetic pilot contract\nInvoice FEATURES-123\n'+clause};
  const c=reviewCase({...caseData,evidence:[source,...caseData.evidence.slice(1)]});
  for(const quote of ['Synthetic pilot contract','Invoice FEATURES-123','delivery','written client acceptance']){
    const answer=findings();answer.findings[0].citations=[{evidenceId:source.id,quote}];
    assert.throws(()=>validateAgentFindings(answer,c,c.evidence,seen),/meaningful excerpt|billing, delivery and written acceptance/);
  }
  const answer=findings();answer.findings[0].citations=[{evidenceId:source.id,quote:clause}];
  assert.equal(validateAgentFindings(answer,c,c.evidence,seen).findings[0].status,'supported');
  assert.equal(source.text,'Synthetic pilot contract\nInvoice FEATURES-123\n'+clause);
});

test('supported citations must use the reviewed passage, not another clause on the same page', () => {
  const reviewed=caseData.evidence[0].text;
  const other='Other project billing requires delivery and written client acceptance.';
  const source={...caseData.evidence[0],text:reviewed+'\n'+other};
  const c={...caseData,evidence:[source,...caseData.evidence.slice(1)]};
  c.contractReview=contractReviewFor(c,source,reviewed,'Synthetic test reviewer');
  const answer=findings();answer.findings[0].citations[0].quote=other;
  assert.throws(()=>validateAgentFindings(answer,c,c.evidence,seen),/reviewed requirement passage/);
});

test('every supported reference must match the requirement type, including extra exact citations', () => {
  const answer=findings();
  answer.findings[0].evidenceIds.push('delivery');
  answer.findings[0].citations.push({evidenceId:'delivery',quote:'PR merged.'});
  assert.throws(()=>validateAgentFindings(answer,caseData,caseData.evidence,seen),/wrong source type/);
});

test('uploaded delivery and acceptance citations stay inside current human-reviewed excerpts', () => {
  const c=structuredClone(caseData);
  for(const source of c.evidence.filter(e=>e.type!=='contract')){
    source.mode='uploaded';
    const quote=source.text;
    source.text='Supporting evidence heading\n'+quote+'\nUnreviewed note: '+quote;
    source.review=sourceReviewFor(c,source,{quote,reviewer:'Synthetic test reviewer',decision:source.type==='delivery'?'delivery':'accepted'});
  }
  assert.equal(validateAgentFindings(findings(),c,c.evidence,seen).findings.length,3);
  const answer=findings();answer.findings[1].citations[0].quote='Unreviewed note: PR merged.';
  assert.throws(()=>validateAgentFindings(answer,c,c.evidence,seen),/reviewed requirement passage/);
  answer.findings[1].citations[0].quote='Supporting evidence heading';
  assert.throws(()=>validateAgentFindings(answer,c,c.evidence,seen),/reviewed requirement passage/);
});

test('explicit human source review preserves contextual acceptance language', async () => {
  const c=structuredClone(caseData);
  const source=c.evidence[2];source.mode='uploaded';source.text='Yes, looks good to me.';
  source.review=sourceReviewFor(c,source,{quote:source.text,reviewer:'Synthetic test reviewer',decision:'accepted'});
  const answer=findings();answer.findings[2].citations[0].quote=source.text;
  assert.equal(validateAgentFindings(answer,c,c.evidence,seen).findings[2].status,'supported');
  let count=0;
  await investigateWithOllama(c,{fetchImpl:async(_url,request)=>{
    const body=JSON.parse(request.body);
    if(++count===2)assert.ok(body.format.properties.findings.items.properties.citations.items.properties.quote.enum.includes(source.text));
    return {ok:true,json:async()=>({message:count===1
      ?{role:'assistant',tool_calls:[{function:{name:'get_case_evidence',arguments:{}}}]}
      :{role:'assistant',content:JSON.stringify(answer)}})};
  }});
});

test('both original seed fixtures preserve their supported and missing branches', () => {
  for(const c of seedCases()){
    const answer={summary:'Synthetic fixture check.',findings:evaluateEvidence(c).map(f=>({
      requirement:f.id,status:f.status,explanation:f.explanation,evidenceIds:f.evidenceIds,
      citations:f.evidenceIds.map(id=>({evidenceId:id,quote:c.evidence.find(e=>e.id===id).text})),
    }))};
    assert.deepEqual(validateAgentFindings(answer,c,c.evidence,new Set(c.evidence.map(e=>e.id))).findings.map(f=>f.status),
      c.id==='northstar'?['supported','supported','supported']:['supported','supported','missing']);
  }
});
test('model cannot override deterministic policy status', () => {
  const result = findings();
  result.findings[2].status = 'missing';
  result.findings[2].evidenceIds = [];
  result.findings[2].citations = [];
  assert.throws(() => validateAgentFindings(result, caseData, caseData.evidence, seen), /disagrees with deterministic policy/);
});
test('GitHub lookup rejects arbitrary repositories before network request', async () => {
  await assert.rejects(fetchGithubEvidence({ github: { owner: 'evil', repo: 'other', number: 1 } }, {
    allowedRepositories: ['allowed/repo'], fetchImpl: () => { throw new Error('network should not run'); },
  }), /allowlist/);
});
test('GitHub live evidence retains exact PR endpoint and cannot become acceptance', async () => {
  let requested;
  const source = await fetchGithubEvidence({ id: 'gh', caseId: 'a', milestone: 'M1', github: { owner: 'allowed', repo: 'repo', number: 42 } }, {
    allowedRepositories: ['allowed/repo'], fetchImpl: async (url) => { requested = url; return { ok: true, json: async () => ({ title: 'M1', state: 'closed', merged: true, body: 'Done' }) }; },
  });
  assert.equal(requested, 'https://api.github.com/repos/allowed/repo/pulls/42');
  assert.equal(source.type, 'delivery'); assert.equal(source.accepted, false); assert.equal(source.mode, 'live');
});
test('real agent loop executes model-selected tools and validates final result', async () => {
  const batches = [
    [{ name: 'get_case_evidence', arguments: {} }],
    [{ name: 'finish_investigation', arguments: findings() }],
  ];
  const payloads = [];
  const result = await investigateWithOllama(caseData, { fetchImpl: async (_url, request) => {
    payloads.push(JSON.parse(request.body));
    return { ok: true, json: async () => ({ message: { role: 'assistant', content: '', tool_calls: batches.shift().map((fn) => ({ function: fn })) }, eval_count: 5 }) };
  } });
  assert.equal(result.mode, 'ollama'); assert.equal(result.toolCalls.length, 2); assert.equal(result.metrics.requests, 2);
  assert.ok(payloads[1].messages.some((message) => message.role === 'tool'));
});
test('benchmark tool context and follow-up prompt omit policy labels and record request timings',async()=>{
 const batches=[[{name:'get_case_evidence',arguments:{}}],[{name:'finish_investigation',arguments:findings()}]];const toolResults=[],timings=[],payloads=[];
 await investigateWithOllama(caseData,{policyAssistance:false,onResponse:e=>timings.push(e),fetchImpl:async(_url,request)=>{
  const body=JSON.parse(request.body);payloads.push(body);if(body.messages.some(m=>m.role==='tool'))toolResults.push(body.messages.find(m=>m.role==='tool').content);
  return {ok:true,status:200,json:async()=>({message:{role:'assistant',content:'',tool_calls:batches.shift().map(fn=>({function:fn}))},eval_count:5})};
 }});
 const context=JSON.parse(toolResults[0]);assert.deepEqual(Object.keys(context),['invoice','evidence']);assert.equal(context.invoice.id,caseData.id);assert.deepEqual(context,JSON.parse(JSON.stringify(createBenchmarkInputContext(caseData))));assert.ok(context.evidence.every(x=>Array.isArray(x.citationChoices)));assert.equal(context.evidence.find(x=>x.type==='contract').humanReviewed,true);assert.equal(JSON.stringify(context).includes('policyStatus'),false);assert.equal(JSON.stringify(payloads[1].messages).includes('policyStatus'),false);assert.equal(timings.length,2);assert.ok(timings.every(x=>x.status===200&&x.durationMs>=0));
});
test('model outage never becomes a successful demo investigation', async () => {
  await assert.rejects(investigateWithOllama(caseData, { fetchImpl: async () => { throw new Error('offline'); } }), /No demo fallback/);
});

test('schema-constrained final JSON preserves missing acceptance as a valid result', async () => {
  const c = {...caseData, evidence:caseData.evidence.filter(e=>e.type!=='acceptance')};
  const answer=findings(); answer.findings[2]={requirement:'acceptance',status:'missing',explanation:'No acceptance supplied.',evidenceIds:[],citations:[]};
  let count=0;
  const result=await investigateWithOllama(c,{fetchImpl:async(_u,req)=>{
    const body=JSON.parse(req.body);count++;
    if(count===2)assert.ok(body.format.properties.findings);
    return {ok:true,json:async()=>({message:count===1?{role:'assistant',tool_calls:[{function:{name:'get_case_evidence',arguments:{}}}]}:{role:'assistant',content:JSON.stringify(answer)}})};
  }});
  assert.equal(result.findings[2].status,'missing');assert.equal(count,2);
});

test('final JSON with fewer than three findings is rejected', async () => {
  let count=0;
  await assert.rejects(investigateWithOllama(caseData,{fetchImpl:async()=>({ok:true,json:async()=>({message:++count===1?{role:'assistant',tool_calls:[{function:{name:'get_case_evidence',arguments:{}}}]}:{role:'assistant',content:JSON.stringify({summary:'Incomplete',findings:[]})}})})}),/step limit/);
});
test('model non-tool answers terminate immediately without another expensive request', async () => {
  let count = 0;
  await assert.rejects(investigateWithOllama(caseData, { maxSteps: 2, fetchImpl: async () => {
    count++; return { ok: true, json: async () => ({ message: { role: 'assistant', content: 'Everything is paid.' } }) };
  } }), /no tool call/);
  assert.equal(count, 1);
});

test('imported UUID source IDs constrain both references and citations to read case sources', async () => {
  const id='a8d47c0a-27ea-43a3-9f13-286dd81b0adb-p1';
  const source={id,caseId:'a',milestone:'M1',type:'contract',text:'Billing requires delivery and written client acceptance.'};
  const c=reviewCase({...caseData,evidence:[source,{...source,id:'foreign-source',caseId:'other'}]});
  const answer={summary:'Delivery and acceptance are missing.',findings:[
    {requirement:'contract',status:'supported',explanation:'Billing condition documented.',evidenceIds:[id],citations:[{evidenceId:id,quote:source.text}]},
    ...['delivery','acceptance'].map(requirement=>({requirement,status:'missing',explanation:'No source provided.',evidenceIds:[],citations:[]})),
  ]};
  let count=0;
  const result=await investigateWithOllama(c,{fetchImpl:async(_url,request)=>{
    const body=JSON.parse(request.body);
    if(++count===2){
      const fields=body.format.properties.findings.items.properties;
      assert.deepEqual(fields.evidenceIds.items.enum,[id]);
      assert.equal(fields.evidenceIds.maxItems,1);
      assert.equal(fields.citations.maxItems,1);
      assert.deepEqual(fields.citations.items.properties.evidenceId.enum,[id]);
      assert.ok(fields.citations.items.properties.quote.enum.includes(source.text));
    }
    return {ok:true,json:async()=>({message:count===1
      ?{role:'assistant',tool_calls:[{function:{name:'get_case_evidence',arguments:{}}}]}
      :{role:'assistant',content:JSON.stringify(answer)}})};
  }});
  assert.equal(result.findings[0].citations[0].evidenceId,id);
});

test('generation excludes headings and exposes requirement-specific reviewed quote choices', async () => {
  const clause='Milestone M1 is billable only after delivery and written client acceptance.';
  const source={...caseData.evidence[0],text:'Synthetic pilot contract\nInvoice FEATURES-123\n'+clause};
  const c=reviewCase({...caseData,evidence:[source,...caseData.evidence.slice(1)]});
  const answer=findings();answer.findings[0].citations[0].quote=clause;
  let count=0;
  await investigateWithOllama(c,{policyAssistance:false,fetchImpl:async(_url,request)=>{
    const body=JSON.parse(request.body);
    if(++count===2){
      const quotes=body.format.properties.findings.items.properties.citations.items.properties.quote.enum;
      assert.ok(quotes.includes(clause));
      assert.ok(!quotes.includes('Synthetic pilot contract'));
      assert.ok(!quotes.includes('Invoice FEATURES-123'));
      const bundle=JSON.parse(body.messages.find(message=>message.role==='tool').content);
      const contract=bundle.evidence.find(item=>item.type==='contract');
      assert.equal(contract.reviewedClause,c.contractReview.quote);
      assert.ok(contract.reviewedClause.includes(clause));
      assert.deepEqual(contract.citationChoices,[clause]);
      assert.ok(!contract.citationChoices.includes('PR merged.'));
      assert.match(body.messages.at(-1).content,/shared evidence returned by get_case_evidence/);
    }
    return {ok:true,json:async()=>({message:count===1
      ?{role:'assistant',tool_calls:[{function:{name:'get_case_evidence',arguments:{}}}]}
      :{role:'assistant',content:JSON.stringify(answer)}})};
  }});
});

test('empty evidence permits only empty reference and citation arrays', async () => {
  let count=0;
  const answer={summary:'No evidence supplied.',findings:['contract','delivery','acceptance'].map(requirement=>({
    requirement,status:'missing',explanation:'No source supplied.',evidenceIds:[],citations:[],
  }))};
  const result=await investigateWithOllama({...caseData,evidence:[]},{fetchImpl:async(_url,request)=>{
    const body=JSON.parse(request.body);
    if(++count===2){
      const fields=body.format.properties.findings.items.properties;
      assert.equal(fields.evidenceIds.maxItems,0);
      assert.equal(fields.citations.maxItems,0);
    }
    return {ok:true,json:async()=>({message:count===1
      ?{role:'assistant',tool_calls:[{function:{name:'get_case_evidence',arguments:{}}}]}
      :{role:'assistant',content:JSON.stringify(answer)}})};
  }});
  assert.ok(result.findings.every(f=>f.status==='missing'));
});

test('forged source IDs remain rejected even if transport bypasses the output schema', async () => {
  let count=0;
  const answer=findings();answer.findings[0].evidenceIds=['invented-source'];
  await assert.rejects(investigateWithOllama(caseData,{fetchImpl:async()=>({ok:true,json:async()=>({
    message:++count===1?{role:'assistant',tool_calls:[{function:{name:'get_case_evidence',arguments:{}}}]}
      :{role:'assistant',content:JSON.stringify(answer)},
  })})}),/step limit/);
});

test('PDF citation choices preserve line breaks and normalized paraphrases remain rejected', async () => {
  const source={...caseData.evidence[0],text:Array.from({length:15},(_,i)=>'Contract background '+i+': '+'x'.repeat(95)).join('\n')+'\nBilling requires delivery and\nwritten client acceptance.'};
  const c=reviewCase({...caseData,evidence:[source]});
  const answer={summary:'Evidence incomplete.',findings:[
    {requirement:'contract',status:'supported',explanation:'Documented.',evidenceIds:[source.id],citations:[
      {evidenceId:source.id,quote:'Billing requires delivery and'},
      {evidenceId:source.id,quote:'written client acceptance.'},
    ]},
    ...['delivery','acceptance'].map(requirement=>({requirement,status:'missing',explanation:'Absent.',evidenceIds:[],citations:[]})),
  ]};
  let count=0;
  await investigateWithOllama(c,{fetchImpl:async(_url,request)=>{
    const body=JSON.parse(request.body);
    if(++count===2){
      const quotes=body.format.properties.findings.items.properties.citations.items.properties.quote.enum;
      assert.ok(quotes.every(q=>q.length<=400&&source.text.includes(q)));
      assert.ok(quotes.every(q=>!/[\r\n]/.test(q)));
      assert.ok(quotes.includes('Billing requires delivery and'));
      assert.ok(quotes.includes('written client acceptance.'));
      assert.ok(quotes.every(q=>!q.startsWith('Contract background')));
      assert.ok(body.format.properties.findings.items.properties.citations.maxItems>=2);
      assert.ok(!quotes.includes(source.text.replace('\n',' ')));
    }
    return {ok:true,json:async()=>({message:count===1
      ?{role:'assistant',tool_calls:[{function:{name:'get_case_evidence',arguments:{}}}]}
      :{role:'assistant',content:JSON.stringify(answer)}})};
  }});
  answer.findings[0].citations[0].quote=source.text.replace('\n',' ');
  assert.throws(()=>validateAgentFindings(answer,c,c.evidence,new Set([source.id])),/exact source/);
});

test('token-truncated model output is rejected explicitly instead of parsing partial JSON',async()=>{
 await assert.rejects(investigateWithOllama(caseData,{fetchImpl:async()=>({ok:true,json:async()=>({
   done_reason:'length',message:{role:'assistant',content:'{"findings":['},
 })})}),/output budget/);
});
