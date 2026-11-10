import {parse} from 'csv-parse/sync';
import {randomUUID, createHash} from 'node:crypto';
import {mkdir, writeFile, readFile, unlink} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {event} from './domain.js';

const invalid=message=>Object.assign(new Error(message),{statusCode:400});
const required=['invoiceNumber','customer','project','milestone','amount','currency','recipient','authorizedApprover','objection'];
const value=(row,key)=>{
 const v=row[key];
 if(typeof v!=='string'||!v.trim()||v.length>2000||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v))throw invalid(`Invalid or missing ${key}.`);
 return v.trim();
};
export function parseInvoiceCsv(csv,existing=[],provenance='synthetic') {
 if(!['synthetic','consented'].includes(provenance))throw invalid('Choose synthetic or consented records.');
 if(typeof csv!=='string'||!csv.trim()||Buffer.byteLength(csv)>262144)throw invalid('Provide a non-empty CSV smaller than 256 KB.');
 let rows;
 try{rows=parse(csv,{bom:true,columns:headers=>{if(new Set(headers).size!==headers.length||required.some(h=>!headers.includes(h)))throw invalid(`CSV requires unique columns: ${required.join(', ')}.`);return headers;},skip_empty_lines:true,max_record_size:16384});}
 catch(e){throw invalid(e.statusCode?e.message:'CSV could not be parsed. Check quoting and column counts.');}
 if(!rows.length||rows.length>100)throw invalid('Import between 1 and 100 invoices at once.');
 const keys=new Set(existing.map(c=>`${c.customer.toLowerCase()}\0${c.invoiceNumber.toLowerCase()}`));
 return rows.map(row=>{
  const data=Object.fromEntries(required.map(key=>[key,value(row,key)]));
  if(!/^\d{1,10}(\.\d{1,2})?$/.test(data.amount)||Number(data.amount)<=0)throw invalid('Amount must be positive, with at most two decimal places.');
  if(!['USD','PHP','EUR','GBP'].includes(data.currency))throw invalid('Supported currencies are USD, PHP, EUR and GBP, each using two decimal places.');
  if(!/^[^\s@]+@[^\s@]+\.example$/.test(data.recipient)||! /^[^\s@]+@[^\s@]+$/.test(data.authorizedApprover))throw invalid('Use a .example test recipient and a valid authorized approver email.');
  const key=`${data.customer.toLowerCase()}\0${data.invoiceNumber.toLowerCase()}`;
  if(keys.has(key))throw invalid('An invoice with this customer and number already exists in this import or workspace.');
  keys.add(key);
  const [whole,fraction='']=data.amount.split('.');const amountMinor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  return {id:randomUUID(),customer:data.customer,invoiceNumber:data.invoiceNumber,project:data.project,milestone:data.milestone,objection:data.objection,amount:amountMinor,amountMinor,currency:data.currency,recipient:data.recipient,authorizedApprovers:[data.authorizedApprover],status:'new',synthetic:provenance==='synthetic',dataOrigin:provenance,imported:true,evidence:[],documents:[],findings:[],draft:null,approval:null,investigation:null,sendState:null,events:[event('imported','Invoice imported from CSV; no acceptance inferred')]};
 });
}

export async function extractContractPdf(bytes) {
 if(!Buffer.isBuffer(bytes)||bytes.length<8||bytes.length>5*1024*1024||bytes.subarray(0,5).toString()!=='%PDF-')throw invalid('Provide a PDF no larger than 5 MB.');
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 let document,task;
 try{
  task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:true});
  document=await task.promise;
  if(document.numPages>30)throw invalid('Contracts are limited to 30 pages.');
  const pages=[];let total=0;
  for(let page=1;page<=document.numPages;page++){
   const content=await(await document.getPage(page)).getTextContent();
   const text=content.items.map(item=>typeof item.str==='string'?item.str+(item.hasEOL?'\n':' '):'').join('').trim();
   total+=text.length;if(total>100000)throw invalid('Extracted PDF text exceeds 100,000 characters.');
   if(text)pages.push({page,text});
  }
  if(!pages.length)throw invalid('No selectable text found. Scanned PDFs need OCR and are not supported yet.');
  return pages;
 }catch(e){throw invalid(e.statusCode?e.message:'PDF could not be read. Use an unencrypted text-based PDF.');}
 finally{await task?.destroy();}
}

export function registerImportRoutes(app,{store,get,locks,fail,dataDirectory=resolve('data')}) {
 app.post('/api/imports/invoices',{bodyLimit:300000,schema:{body:{type:'object',properties:{csv:{type:'string'},provenance:{enum:['synthetic','consented']}},required:['csv'],additionalProperties:false}}},async req=>{
  const cases=parseInvoiceCsv(req.body.csv,store.list(),req.body.provenance||'synthetic');store.putMany(cases);return {cases};
 });
 app.post('/api/cases/:id/contracts',{bodyLimit:8*1024*1024,schema:{body:{type:'object',properties:{filename:{type:'string',minLength:1,maxLength:150},base64:{type:'string',maxLength:7*1024*1024}},required:['filename','base64'],additionalProperties:false}}},async req=>{
  const c=get(req.params.id);
  if(locks.has(c.id)||c.sendState==='sending')throw fail(409,'Case action is running.');
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(req.body.base64)||req.body.base64.length%4!==0)throw invalid('Invalid PDF encoding.');
  locks.add(c.id);
  try{
   const bytes=Buffer.from(req.body.base64,'base64');const pages=await extractContractPdf(bytes);
   const id=randomUUID();const directory=join(dataDirectory,'documents');const path=join(directory,`${id}.pdf`);
   const filename=req.body.filename.replace(/[\\/\u0000-\u001F]/g,'_');
   const version=createHash('sha256').update(bytes).digest('hex');
   const documentUrl=`/api/cases/${encodeURIComponent(c.id)}/documents/${id}`;
   const sources=pages.map(p=>({id:`${id}-p${p.page}`,documentId:id,documentUrl,caseId:c.id,milestone:c.milestone,type:'contract',title:`${filename} - Page ${p.page}`,page:p.page,text:p.text,excerpt:p.text.slice(0,2500),version,mode:'uploaded',author:'Uploaded contract; identity not verified'}));
   await mkdir(directory,{recursive:true});await writeFile(path,bytes,{flag:'wx'});
   try{
    c.documents=[...(c.documents||[]),{id,filename,version,pages:pages.length,url:documentUrl}];c.evidence.push(...sources);
    c.contractReview=null;c.investigationJob=null;c.findings=[];c.draft=null;c.approval=null;c.investigation=null;c.status='new';
    c.events.push(event('contract_imported',`${filename} imported (${pages.length} text pages); prior approval invalidated`));store.put(c);
   }catch(e){await unlink(path);throw e;}
   return c;
  }finally{locks.delete(c.id);}
 });
 app.get('/api/cases/:id/documents/:documentId',async(req,reply)=>{
  const c=get(req.params.id);const id=req.params.documentId;
  if(!/^[a-f0-9-]{36}$/.test(id)||!(c.documents||[]).some(d=>d.id===id))throw fail(404,'Document not found in this case.');
  try{return reply.type('application/pdf').header('Content-Disposition','inline; filename="contract.pdf"').header('X-Content-Type-Options','nosniff').send(await readFile(join(dataDirectory,'documents',`${id}.pdf`)));}
  catch(e){if(e.code==='ENOENT')throw fail(404,'Document file is unavailable.');throw e;}
 });
}
