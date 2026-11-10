import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildApp} from '../server/app.js';
import {createStore} from '../server/store.js';
import {modelCases} from '../server/benchmark-cases.mjs';
import {createBenchmarkInputContext,createFindingsFormat,validateAgentFindings} from '../server/agent.js';
import {runLangGraph} from '../server/benchmark.js';

const fixture=async(store=createStore(':memory:'))=>({store,app:await buildApp({store})});
test('benchmark catalog exposes identical synthetic tasks and named strategies without changing cases',async()=>{
 const {app,store}=await fixture();try{const before=store.list();const response=await app.inject({method:'GET',url:'/api/benchmarks/tasks'});assert.equal(response.statusCode,200);const data=response.json();assert.equal(data.tasks.length,6);assert.equal(data.fullTaskCount,28);assert.deepEqual(data.candidates.map(x=>x.id),['ledgerly-tool-agent','single-pass-agent','langgraph-single-pass']);assert.ok(data.candidates.find(x=>x.id==='ledgerly-tool-agent').capabilities.includes('tool_failure_injection'));assert.equal(data.candidates.find(x=>x.id==='langgraph-single-pass').framework,'LangGraph.js');assert.ok(data.tasks.some(x=>x.fault==='tool-once'));assert.ok(data.tasks.some(x=>x.fault==='model-unavailable'));assert.equal(store.list().length,before.length);}finally{await app.close();}
});
test('single-pass output contract is schema constrained to current case evidence',()=>{
 const task=modelCases[0].input;const evidence=task.evidence;const schema=createFindingsFormat(task,evidence,new Set(evidence.map(x=>x.id)));
 const finding=schema.properties.findings.items;assert.equal(finding.properties.requirement.enum.join(','),'contract,delivery,acceptance');
 assert.deepEqual(finding.properties.evidenceIds.items.enum,evidence.map(x=>x.id));
 assert.ok(finding.properties.citations.items.properties.quote.enum.includes(task.contractReview.quote));
 assert.equal(schema.additionalProperties,false);
});
test('shared benchmark context gives a reviewed clause explicitly without exposing policy outcome labels',()=>{
 const task=modelCases[0].input;const context=createBenchmarkInputContext(task);const contract=context.evidence.find(x=>x.type==='contract');
 assert.equal(contract.humanReviewed,true);assert.equal(contract.reviewedClause,task.contractReview.quote);
 assert.ok(!('humanReviewed' in context.evidence.find(x=>x.type==='delivery')));
 assert.ok(!('policyStatus' in context));assert.ok(!('status' in contract));
});
test('benchmark records a wrong model status while production validation remains fail-closed',()=>{
 const task=structuredClone(modelCases[0].input);const evidence=task.evidence;
 const findings=[['contract',evidence[0]],['delivery',evidence[1]],['acceptance',evidence[2]]].map(([requirement,source])=>({requirement,status:requirement==='contract'?'unknown':'supported',explanation:'Based on the supplied record.',evidenceIds:requirement==='contract'?[]:[source.id],citations:requirement==='contract'?[]:[{evidenceId:source.id,quote:source.text}]}));
 const result={summary:'A syntactically valid but incorrect contract classification.',findings};const seen=new Set(evidence.map(x=>x.id));
 assert.throws(()=>validateAgentFindings(result,task,evidence,seen),/status disagrees with deterministic policy/);
 const benchmarkResult=validateAgentFindings(result,task,evidence,seen,{allowPolicyStatusMismatch:true});
 assert.equal(benchmarkResult.findings.find(x=>x.requirement==='contract').status,'unknown');
 assert.equal(benchmarkResult.findings.find(x=>x.requirement==='delivery').status,'supported');
});
test('LangGraph.js adapter executes the shared schema and deterministic validator',async()=>{
 const task={id:modelCases[0].id,input:structuredClone(modelCases[0].input),expected:modelCases[0].expected};const evidence=task.input.evidence;
 const findings=[['contract',evidence[0]],['delivery',evidence[1]],['acceptance',evidence[2]]].map(([requirement,source])=>({requirement,status:'supported',explanation:'Supported by supplied evidence.',evidenceIds:[source.id],citations:[{evidenceId:source.id,quote:source.text}]}));
 let sentBody;const response=async(_url,init)=>{sentBody=JSON.parse(init.body);return new Response(JSON.stringify({done_reason:'stop',prompt_eval_count:120,eval_count:35,message:{role:'assistant',content:JSON.stringify({summary:'Evidence reviewed.',findings})}}),{status:200,headers:{'content-type':'application/json'}});};
 const trace=[];const result=await runLangGraph(task,{model:'mock-local',baseUrl:'http://ollama.test',fetchImpl:response,onRequest:x=>trace.push(['request',x]),onResponse:x=>trace.push(['response',x])});
 assert.equal(result.findings.length,3);assert.equal(result.metrics.promptTokens,120);assert.equal(result.trace[0].name,'LangGraph.js');assert.equal(sentBody.format.type,'object');assert.equal(sentBody.options.temperature,0);assert.deepEqual(trace.map(x=>x[0]),['request','response']);
});
test('LangGraph benchmark preserves a wrong but well-formed status for scoring',async()=>{
 const item=modelCases[0];const task={id:item.id,input:structuredClone(item.input),expected:item.expected};const evidence=task.input.evidence;
 const findings=[['contract',evidence[0]],['delivery',evidence[1]],['acceptance',evidence[2]]].map(([requirement,source])=>({requirement,status:requirement==='contract'?'missing':'supported',explanation:'Decision from supplied facts.',evidenceIds:requirement==='contract'?[]:[source.id],citations:requirement==='contract'?[]:[{evidenceId:source.id,quote:source.text}]}));
 const fetchImpl=async()=>new Response(JSON.stringify({done_reason:'stop',message:{role:'assistant',content:JSON.stringify({summary:'Contract was misclassified.',findings})}}),{status:200,headers:{'content-type':'application/json'}});
 let output;const result=await runLangGraph(task,{model:'mock-local',baseUrl:'http://ollama.test',fetchImpl,onCandidateOutput:value=>output=value});
 assert.equal(result.findings.find(f=>f.requirement==='contract').status,'missing');assert.deepEqual(output.map(x=>[x.requirement,x.status]),[['contract','missing'],['delivery','supported'],['acceptance','supported']]);
});
test('benchmark records persist separately and case reset does not erase run history',()=>{
 const store=createStore(':memory:');try{const row={id:'run-1',status:'completed',updatedAt:new Date().toISOString(),results:[]};store.putBenchmarkRun(row);assert.equal(store.getBenchmarkRun(row.id).status,'completed');store.reset();assert.equal(store.getBenchmarkRun(row.id).status,'completed');}finally{store.close();}
});
test('benchmark API rejects unbounded or malformed run configuration',async()=>{
 const {app}=await fixture();try{const response=await app.inject({method:'POST',url:'/api/benchmarks/runs',payload:{suite:'full',repeats:99}});assert.equal(response.statusCode,400);}finally{await app.close();}
});
test('server restart marks an in-flight benchmark failed for explicit retry',async()=>{
 const store=createStore(':memory:');store.putBenchmarkRun({id:'run-active',status:'running',updatedAt:new Date().toISOString(),progress:{completed:2,total:8,current:{taskId:'x'}}});const app=await buildApp({store});try{const run=store.getBenchmarkRun('run-active');assert.equal(run.status,'failed');assert.equal(run.progress.current,null);assert.match(run.error,/restarted/i);}finally{await app.close();}
});
