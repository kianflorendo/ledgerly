import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,appendFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {modelCases as baselineCases} from '../tests/fixtures/model-cases.mjs';
import {readinessCases} from '../tests/fixtures/readiness-cases.mjs';
const modelCases=[...baselineCases,...readinessCases];
const dir=process.env.EVAL_DIR||'test-results/model-evaluation';mkdirSync(dir,{recursive:true});
const model=process.env.OLLAMA_MODEL||'qwen3:1.7b';
const start=Date.now();const records=[];
const sourceHash=createHash('sha256').update(readFileSync('server/agent.js')).digest('hex');
const limit=Number(process.env.EVAL_LIMIT||modelCases.length);
const selectedIds=process.env.EVAL_IDS?new Set(process.env.EVAL_IDS.split(',').map(value=>value.trim()).filter(Boolean)):null;
const resume=process.argv.includes('--resume');
const sourceHashes=Object.fromEntries(['server/agent.js','server/domain.js','tests/fixtures/model-cases.mjs','tests/fixtures/readiness-cases.mjs'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
if(resume&&existsSync(dir+'/manifest.json')){
 const previous=JSON.parse(readFileSync(dir+'/manifest.json','utf8'));
 if(previous.model!==model||JSON.stringify(previous.sourceHashes)!==JSON.stringify(sourceHashes))throw new Error('Refusing to mix evaluation results from different model/code versions. Use a new EVAL_DIR.');
} else if(resume&&existsSync(dir+'/results.jsonl'))throw new Error('Cannot resume results without a matching manifest.');
if(resume&&existsSync(`${dir}/results.jsonl`)){
 for(const line of readFileSync(`${dir}/results.jsonl`,'utf8').trim().split('\n'))if(line)records.push(JSON.parse(line));
}else writeFileSync(`${dir}/results.jsonl`,'');
writeFileSync(`${dir}/manifest.json`,JSON.stringify({startedAt:new Date().toISOString(),model,sourceHash,sourceHashes,cases:modelCases.map(({id,split,expected,expectedReady})=>({id,split,expected,expectedReady})),synthetic:true},null,2));
const selectedCases=modelCases.filter(item=>!selectedIds||selectedIds.has(item.id)).slice(0,limit);
function execute(input){return new Promise((resolve,reject)=>{
 const program=`import {investigateWithOllama} from '/app/server/agent.js';import {evaluateEvidence,reconcileFindings} from '/app/server/domain.js';const c=${JSON.stringify(input)};try{const r=await investigateWithOllama(c,{model:${JSON.stringify(model)}});console.log('EVAL_RESULT:'+JSON.stringify({result:r,policy:evaluateEvidence(c),reconciled:reconcileFindings(evaluateEvidence(c),r.findings)}));}catch(e){console.log('EVAL_RESULT:'+JSON.stringify({error:e.message,code:e.code}));}`;
 const child=spawn('docker',['compose','exec','-T','app','node','--input-type=module'],{stdio:['pipe','pipe','pipe']});let out='',err='';
 const timer=setTimeout(()=>{child.kill();reject(new Error('Evaluation subprocess exceeded 240 seconds'));},240000);
 child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('close',code=>{clearTimeout(timer);const line=out.split('\n').find(l=>l.startsWith('EVAL_RESULT:'));if(!line)return reject(new Error(`No evaluation result (exit ${code}): ${err.slice(-500)}`));try{resolve(JSON.parse(line.slice(12)))}catch(e){reject(e)}});child.stdin.end(program);
 });}
function summarize(){const completed=records.length,returned=records.filter(r=>!r.error),correct=returned.filter(r=>r.rawExact),safe=records.filter(r=>r.safe),timings=returned.map(r=>r.seconds).sort((a,b)=>a-b);const summary={model,sourceHash,completed,total:selectedCases.length,returned:returned.length,rawExact:correct.length,rawAccuracy:completed?correct.length/completed:0,safe:safe.length,unsafe:records.filter(r=>!r.safe).length,failures:records.filter(r=>r.error).length,citationOracles:records.filter(r=>r.citationOraclePassed!==null).length,citationOraclesPassed:records.filter(r=>r.citationOraclePassed===true).length,p95Seconds:timings.length?timings[Math.ceil(timings.length*.95)-1]:null,elapsedSeconds:(Date.now()-start)/1000};writeFileSync(`${dir}/summary.json`,JSON.stringify(summary,null,2));return summary;}
for(const item of selectedCases){
 if(records.some(r=>r.id===item.id))continue;
 console.log(`START ${item.id}`);const t=Date.now();let data;try{data=await execute(item.input)}catch(e){data={error:e.message}};
 const raw=Object.fromEntries((data.result?.findings||[]).map(f=>[f.requirement,f.status]));const policy=Object.fromEntries((data.policy||[]).map(f=>[f.id,f.status]));
 const rawExact=!data.error&&Object.entries(item.expected).every(([k,v])=>raw[k]===v);
 const ready=!data.error&&data.reconciled?.every(f=>f.status==='supported');
 const citationOraclePassed=item.expectedContractQuote?!!data.result?.findings.find(f=>f.requirement==='contract')?.citations.some(q=>q.quote===item.expectedContractQuote):null;
 const record={citationOraclePassed,id:item.id,split:item.split,seconds:(Date.now()-t)/1000,expected:item.expected,raw,policy,rawExact,safe:!!data.error||item.expectedReady||!ready,actualReady:!!ready,...data};
 records.push(record);appendFileSync(`${dir}/results.jsonl`,JSON.stringify(record)+'\n');const s=summarize();console.log(`DONE ${item.id} ${record.seconds}s exact=${rawExact} safe=${record.safe} ${data.error||''}; ${s.completed}/${s.total}`);
}
console.log(JSON.stringify(summarize(),null,2));
