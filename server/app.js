import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import nodemailer from 'nodemailer';
import { existsSync } from 'node:fs';
import { resolve,dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createStore } from './store.js';
import {registerGithubDemoRoutes,refreshCaseGithub} from './github-demo.js';
import {registerImportRoutes} from './imports.js';
import {registerPilotRoutes} from './pilot.js';
import {registerBenchmarkRoutes} from './benchmark.js';
import {validateCurrentInvestigation} from './investigation-validation.js';
import { evaluateEvidence, validateFindings, makeDraft, approvalHash, event, reconcileFindings, investigationHash, contractReviewFor } from './domain.js';
export async function buildApp(options={}) {
 const app=Fastify({logger:options.logger??false,bodyLimit:1048576});
 const store=options.store||createStore(process.env.DATA_PATH||'data/cases.sqlite');
 for(const run of store.listBenchmarkRuns(50))if(run.status==='running'){
  run.status='failed';run.error='Server restarted during this benchmark. Start a new run explicitly.';run.progress={...run.progress,current:null};run.updatedAt=new Date().toISOString();store.putBenchmarkRun(run);
 }
 const transport=options.transport||nodemailer.createTransport({host:process.env.SMTP_HOST||'127.0.0.1',port:Number(process.env.SMTP_PORT||1025),secure:false,connectionTimeout:5000,socketTimeout:10000});
 const locks=new Set();
 const runningJobs=new Set();
 for(const c of store.list())if(c.status==='investigating'||c.investigationJob?.status==='running'){
  c.status='investigation_failed';c.findings=[];c.draft=null;c.approval=null;
  c.investigation={mode:c.investigationJob?.mode||c.investigation?.mode||'ollama',errorCode:'RESTARTED',summary:'Investigation interrupted by server restart; retry explicitly.'};
  if(c.investigationJob)c.investigationJob={...c.investigationJob,status:'failed',stage:'failed',error:'Server restarted. Retry the investigation.',updatedAt:new Date().toISOString()};
  store.put(c);
 }
 const fail=(code,message)=>Object.assign(new Error(message),{statusCode:code});
 const get=id=>{const c=store.get(id);if(!c)throw fail(404,'Case not found');return c;};
 const currentInvestigation=c=>{try{validateCurrentInvestigation(c);}catch(error){throw fail(409,error.message);}};
 const checkRecipient=(c,recipient)=>{if(c.findings.some(f=>f.status!=='supported')&&recipient!=='project-manager@agency.example')throw fail(409,'Unresolved evidence permits internal review only');};
 registerGithubDemoRoutes(app,{store,get,locks,fail});
 registerPilotRoutes(app,{store,get,locks,fail});
 registerBenchmarkRoutes(app,{store,fail,trackJob:task=>{runningJobs.add(task);task.finally(()=>runningJobs.delete(task));}});
 await registerImportRoutes(app,{store,get,locks,fail,dataDirectory:options.dataDirectory||dirname(resolve(process.env.DATA_PATH||'data/cases.sqlite'))});
 app.addHook('onRequest',async(req)=>{
  const origin=req.headers.origin;
  if(origin&&new URL(origin).host!==req.headers.host) throw fail(403,'Cross-origin requests are not allowed');
 });
 app.setErrorHandler((error,req,reply)=>{req.log.error({err:error},'Request failed');reply.code(error.statusCode||500).send({error:error.statusCode?error.message:'Request failed; check local service logs.'});});
 app.get('/api/health',async()=>({status:'ok',synthetic:true,delivery:'test SMTP only',model:process.env.OLLAMA_MODEL||'qwen3:1.7b'}));
 app.get('/api/model/status',async()=>{
  const model=process.env.OLLAMA_MODEL||'qwen3:1.7b';
  try{const r=await fetch(`${process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434'}/api/tags`,{signal:AbortSignal.timeout(3000)});if(!r.ok)throw new Error('Model service unavailable');const data=await r.json();return {reachable:true,model,modelAvailable:data.models?.some(m=>m.name===model)||false};}
  catch{return {reachable:false,model,modelAvailable:false};}
 });
 app.get('/api/cases',async()=>({cases:store.list()}));
 app.get('/api/cases/:id',async req=>get(req.params.id));
 app.post('/api/cases/:id/contract-review',{schema:{body:{type:'object',additionalProperties:false,required:['sourceId','quote','reviewer','confirmed'],properties:{
   sourceId:{type:'string',minLength:1,maxLength:200},quote:{type:'string',minLength:1,maxLength:6000},reviewer:{type:'string',minLength:1,maxLength:100},confirmed:{const:true}
 }}}},async req=>{
   const c=get(req.params.id);
   if(locks.has(c.id)||c.sendState==='sending')throw fail(409,'Case action is running');
   try{c.contractReview=contractReviewFor(c,c.evidence.find(e=>e.id===req.body.sourceId),req.body.quote,req.body.reviewer);}catch(error){throw fail(400,error.message);}
   c.findings=[];c.draft=null;c.approval=null;c.investigation=null;c.investigationJob=null;c.status='new';
   c.events.push(event('contract_reviewed','Reviewer confirmed the exact billing clause for this case and source version'));
   store.put(c);return c;
 });
 async function runInvestigation(id,mode,jobId){
  const c=get(id); if(locks.has(c.id)||c.sendState==='sending')throw fail(409,'Case action is already running');
  if(!['demo','ollama'].includes(mode))throw fail(400,'Choose demo or ollama mode');
  const job=jobId?c.investigationJob:null;
  const progress=stage=>{if(job){job.stage=stage;job.updatedAt=new Date().toISOString();store.put(c);}};
  locks.add(c.id);
  try{
   c.events.push(event('investigation_started',mode+' investigation started'));
   c.approval=null;c.draft=null;c.findings=[];c.status='investigating';
   c.investigation={mode,summary:'Investigation in progress; no current findings are approved.',at:new Date().toISOString(),modelFindings:null};store.put(c);
   if(c.githubDemo){Object.assign(c,await refreshCaseGithub(c,{mode:c.githubMode}));store.put(c);}
   let result=null;
   if(mode==='ollama') {const { investigateWithOllama }=await import('./agent.js');result=await (options.investigate||investigateWithOllama)(c,{baseUrl:process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434',model:process.env.OLLAMA_MODEL||'qwen3:1.7b',onProgress:e=>progress(e.stage),onEvent:e=>progress(e.name==='get_case_evidence'?'sources_read':'validating')});if(result.evidence)c.evidence=result.evidence;}
   progress('validating');
   const policy=evaluateEvidence(c);
   c.findings=result?reconcileFindings(policy,result.findings):policy;validateFindings(c,c.findings);
   c.draft=makeDraft(c);c.approval=null;c.status=c.findings.every(f=>f.status==='supported')?'review_ready':'needs_evidence';
   c.investigation={mode,summary:c.findings.some(f=>f.disagreement)?'Model and application evidence checks disagree. Internal human review is required.':result?.summary||'Deterministic fixture policy evaluated; no AI inference performed.',toolCalls:result?.toolCalls||[],metrics:result?.metrics||null,at:new Date().toISOString(),modelFindings:result?.findings||null,completedAt:new Date().toISOString(),evidenceHash:investigationHash(c)};
   if(job){job.status='completed';job.stage='completed';job.updatedAt=new Date().toISOString();}
   c.events.push(event('investigated',mode==='demo'?'Fixture policy checked (no AI inference)':`Local model investigation complete; application policy checked citations and acceptance`));store.put(c);return c;
  }catch(error){
   if(job){job.status='failed';job.stage='failed';job.error=error.code?error.message:'Investigation failed; inspect local logs.';job.updatedAt=new Date().toISOString();}
   c.approval=null;c.draft=null;c.findings=[];c.status='investigation_failed';
   c.investigation={mode,summary:'Investigation failed. Previous approval was invalidated; retry or request internal review.',errorCode:error.code||'INVESTIGATION_FAILED',at:new Date().toISOString(),modelFindings:null};
   c.events.push(event('investigation_failed','No successful findings or prior approval carried forward'));store.put(c);
   if(['OLLAMA_UNAVAILABLE','AGENT_LIMIT','AGENT_VALIDATION'].includes(error.code))throw fail(error.code==='OLLAMA_UNAVAILABLE'?503:422,error.message);
   throw error;
  }finally{locks.delete(c.id);}
 }
 app.post('/api/cases/:id/investigate',async req=>runInvestigation(req.params.id,req.body?.mode||'demo'));
 app.post('/api/cases/:id/investigations',async(req,reply)=>{
  const c=get(req.params.id);const mode=req.body?.mode||'demo';
  if(!['demo','ollama'].includes(mode))throw fail(400,'Choose demo or ollama mode');
  if(locks.has(c.id)||c.sendState==='sending')throw fail(409,'Case action is already running');
  const job={id:randomUUID(),mode,status:'running',stage:'reading_sources',startedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  c.investigationJob=job;store.put(c);
  const task=runInvestigation(c.id,mode,job.id).catch(error=>app.log.warn({code:error.code},'Background investigation failed'));
  runningJobs.add(task);task.finally(()=>runningJobs.delete(task));
  return reply.code(202).send({job});
 });
 app.get('/api/cases/:id/investigations/:jobId',async req=>{
  const c=get(req.params.id);if(c.investigationJob?.id!==req.params.jobId)throw fail(404,'Investigation job not found in this case.');
  return {job:c.investigationJob,case:c};
 });
 const draftSchema={type:'object',properties:{to:{type:'string',maxLength:254},recipient:{type:'string',maxLength:254},subject:{type:'string',minLength:1,maxLength:200},body:{type:'string',minLength:1,maxLength:20000},reviewer:{type:'string',minLength:1,maxLength:100}},required:['subject','body'],additionalProperties:false};
 const setDraft=(c,b)=>{
  const recipient=b.recipient||b.to||c.draft?.to;
  if(!recipient||! /^[^\s@]+@[^\s@]+\.example$/.test(recipient)||/[\r\n]/.test(b.subject))throw fail(400,'Test recipient must use a .example address and subject must be one line');
  c.draft={to:recipient,recipient,subject:b.subject,body:b.body,attachments:[]};
 };
 app.patch('/api/cases/:id/draft',{schema:{body:draftSchema}},async req=>{const c=get(req.params.id);if(locks.has(c.id)||c.sendState==='sending')throw fail(409,'Case action running');currentInvestigation(c);setDraft(c,req.body);c.approval=null;c.events.push(event('draft_updated','Draft changed; prior approval invalidated'));store.put(c);return c;});
 app.post('/api/cases/:id/approve',{schema:{body:draftSchema}},async req=>{
  const c=get(req.params.id);if(locks.has(c.id)||c.sendState==='sending')throw fail(409,'Case action running');currentInvestigation(c);
  if(!req.body.reviewer?.trim())throw fail(400,'Reviewer name is required');
  setDraft(c,req.body);validateFindings(c,c.findings);
  checkRecipient(c,c.draft.to);
  c.approval={id:randomUUID(),reviewer:req.body.reviewer.trim(),approvedAt:new Date().toISOString(),hash:approvalHash(c)};c.status='approved';c.events.push(event('approved','Exact test message and evidence versions approved'));store.put(c);return c;
 });
 app.post('/api/cases/:id/send',{schema:{body:{type:'object',properties:{approvalId:{type:'string'}},required:['approvalId'],additionalProperties:false}}},async req=>{
  const c=get(req.params.id);
  currentInvestigation(c);
  checkRecipient(c,c.draft?.to);
  if(!c.approval||c.approval.id!==req.body.approvalId||c.approval.hash!==approvalHash(c))throw fail(409,'Approval is missing or stale');
  if(c.sentApprovalId===c.approval.id)return c;
  if(c.sendState==='sending'||c.sendState==='uncertain'||locks.has(c.id))throw fail(409,'Delivery is running or uncertain; inspect test inbox before retrying');
  c.sendState='sending';store.put(c);locks.add(c.id);
  try {const result=await transport.sendMail({from:'resolution@agency.example',to:c.draft.to,subject:c.draft.subject,text:c.draft.body,messageId:`<${c.approval.id}@invoice-resolution.example>`});c.sentApprovalId=c.approval.id;c.sendState='sent';c.status='sent';c.delivery={messageId:result.messageId,testOnly:true,at:new Date().toISOString()};c.events.push(event('sent','Approved message delivered to test SMTP inbox; invoice is not marked paid'));store.put(c);return c;}
  catch(error){c.sendState='uncertain';c.events.push(event('delivery_uncertain','SMTP result uncertain. Inspect test inbox before manual recovery.'));store.put(c);throw fail(503,'Test SMTP delivery failed or is uncertain; inspect inbox and logs');}finally{locks.delete(c.id);}
 });
 app.post('/api/demo/reset',async()=>{if(locks.size)throw fail(409,'An action is running');store.reset();return {cases:store.list()};});
 const dist=resolve('dist');if(existsSync(dist))await app.register(fastifyStatic,{root:dist});
 app.addHook('onClose',async()=>{await Promise.allSettled([...runningJobs]);store.close();});return app;
}
