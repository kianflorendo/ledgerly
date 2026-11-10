import {randomUUID} from 'node:crypto';
import {event,hash,sourceReviewFor} from './domain.js';
import {validateCurrentInvestigation} from './investigation-validation.js';
import {renderEvidencePdf} from './pdf-pack.js';

const bad=message=>Object.assign(new Error(message),{statusCode:400});
export function parseSource({filename,content,kind,author='',timestamp=''},c) {
 if(!['delivery','acceptance'].includes(kind)||typeof filename!=='string'||!filename.trim()||filename.length>150||
   typeof content!=='string'||!content.trim()||Buffer.byteLength(content)>100000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(content))
   throw bad('Use a delivery or acceptance text file up to 100 KB.');
 let body=content;
 if(/\.eml$/i.test(filename)){
   const split=content.search(/\r?\n\r?\n/);
   if(split<0)throw bad('Email must contain headers and a plain-text body.');
   const headers=content.slice(0,split).replace(/\r?\n[ \t]+/g,' ');
   const header=name=>new RegExp('^'+name+':\\s*(.+)$','im').exec(headers)?.[1]?.trim()||'';
   if(header('Content-Type')&&!/^text\/plain(?:;|$)/i.test(header('Content-Type')))throw bad('Only plain-text .eml is supported; export multipart/HTML messages as reviewed text.');
   if(header('Content-Transfer-Encoding')&&!/^(7bit|8bit|binary)$/i.test(header('Content-Transfer-Encoding')))throw bad('Encoded email bodies are unsupported; export decoded plain text.');
   const from=header('From');
   author=/<([^<>]+)>/.exec(from)?.[1]||from;
   timestamp=header('Date')||timestamp;
   body=content.slice(split).replace(/^\r?\n\r?\n/,'');
 } else if(!/\.txt$/i.test(filename))throw bad('Choose a .txt or plain-text .eml file.');
 if(!body.trim()||body.length>30000)throw bad('Evidence body must contain 1 to 30,000 characters.');
 if(typeof author!=='string'||author.length>254||/[\r\n]/.test(author))throw bad('Invalid declared author.');
 if(kind==='acceptance'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author))throw bad('Acceptance evidence needs a declared sender email.');
 if(timestamp&&!Number.isFinite(Date.parse(timestamp)))throw bad('Source timestamp must be a valid date.');
 const id=randomUUID();
 return {id,caseId:c.id,milestone:c.milestone,project:c.project,invoiceNumber:c.invoiceNumber,type:kind,
   title:filename,filename,originalText:content,text:body,excerpt:body.slice(0,2500),author:author||'Declared delivery record',
   timestamp:timestamp?new Date(timestamp).toISOString():null,mode:'uploaded',provenance:c.synthetic?'synthetic upload':'consented upload (declared)',
   identityVerified:false,version:hash({content,author,timestamp}),importedAt:new Date().toISOString()};
}
export function registerPilotRoutes(app,{get,store,locks,fail}){
 const idle=c=>{if(locks.has(c.id)||c.sendState==='sending')throw fail(409,'Case action is running.');};
 const invalidate=c=>{c.findings=[];c.approval=null;c.draft=null;c.investigation=null;c.investigationJob=null;c.status='new';};
 app.post('/api/cases/:id/sources',{bodyLimit:150000,schema:{body:{type:'object',additionalProperties:false,required:['filename','content','kind'],properties:{
   filename:{type:'string'},content:{type:'string'},kind:{enum:['delivery','acceptance']},author:{type:'string'},timestamp:{type:'string'}
 }}}},async req=>{
   const c=get(req.params.id);idle(c);
   if(c.evidence.length>=100)throw bad('Limit of 100 sources per case reached.');
   const source=parseSource(req.body,c);
   c.evidence.push(source);invalidate(c);c.events.push(event('source_imported',source.type+' source uploaded; review required'));store.put(c);return c;
 });
 app.post('/api/cases/:id/sources/:sourceId/review',{schema:{body:{type:'object',additionalProperties:false,required:['quote','reviewer','decision','confirmed'],properties:{
   quote:{type:'string',minLength:1,maxLength:6000},reviewer:{type:'string',minLength:1,maxLength:100},decision:{enum:['delivery','accepted','rejected','not_acceptance']},confirmed:{const:true}
 }}}},async req=>{
   const c=get(req.params.id);idle(c);const source=c.evidence.find(e=>e.id===req.params.sourceId&&e.mode==='uploaded');
   if(!source)throw fail(404,'Uploaded source not found in this case.');
   try{source.review=sourceReviewFor(c,source,req.body);}catch(e){throw bad(e.message);}
   if(source.type==='acceptance')source.accepted=req.body.decision==='accepted'?true:req.body.decision==='rejected'?false:undefined;
   invalidate(c);c.events.push(event('source_reviewed',source.type+' reviewed: '+req.body.decision+'; sender identity is not verified'));store.put(c);return c;
 });
 app.get('/api/cases/:id/pack',async(req,reply)=>{
   const c=get(req.params.id);idle(c);
   try{validateCurrentInvestigation(c);}catch(e){throw fail(409,e.message);}
   if(req.query.format&&req.query.format!=='pdf')throw bad('Evidence packs are available as PDF only.');
   const filename=(c.invoiceNumber||c.id).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80);
   const pdf=await renderEvidencePdf(c,req.protocol+'://'+req.headers.host);
   reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff').header('Content-Disposition',`attachment; filename="ledgerly-${filename}.pdf"`);
   return reply.type('application/pdf').send(pdf);
 });

}
