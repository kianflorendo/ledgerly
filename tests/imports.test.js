import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import Fastify from 'fastify';
import {parseInvoiceCsv,extractContractPdf,registerImportRoutes} from '../server/imports.js';

const csv=await readFile(new URL('../samples/sample-invoices.csv',import.meta.url),'utf8');
const pdf=await readFile(new URL('../samples/sample-contract.pdf',import.meta.url));
test('CSV import preserves decimal amount and never creates acceptance',()=>{
 const [c]=parseInvoiceCsv(csv);assert.equal(c.amountMinor,150000);assert.equal(c.evidence.length,0);assert.equal(c.approval,null);assert.deepEqual(c.authorizedApprovers,['approver@client.example']);
});
test('CSV rejects duplicates, invalid amounts and production email before writing',()=>{
 assert.throws(()=>parseInvoiceCsv(csv,parseInvoiceCsv(csv)),/already exists/);
 for(const amount of ['-1','1.123','0','NaN'])assert.throws(()=>parseInvoiceCsv(csv.replace('1500.00',amount)),/Amount/);
 assert.throws(()=>parseInvoiceCsv(csv.replace('ap@client.example','ap@client.com')),/test recipient/);
 assert.throws(()=>parseInvoiceCsv('customer\nAcme'),/columns/);
});
test('CSV rejects unsupported zero-decimal and unknown currencies',()=>{
 for(const currency of ['JPY','XYZ'])assert.throws(()=>parseInvoiceCsv(csv.replace(',USD,',`,${currency},`)),/Supported currencies/);
 for(const currency of ['USD','PHP','EUR','GBP'])assert.equal(parseInvoiceCsv(csv.replace(',USD,',`,${currency},`))[0].amountMinor,150000);
});
test('text PDF extraction retains page boundaries and exact text',async()=>{
 const pages=await extractContractPdf(pdf);assert.equal(pages.length,2);assert.equal(pages[1].page,2);assert.match(pages[0].text,/Billing requires written acceptance/);assert.match(pages[1].text,/delivery evidence only/);
});
test('non-PDF upload is rejected',async()=>{await assert.rejects(extractContractPdf(Buffer.from('not a pdf')),/PDF/);});
test('PDF without selectable text is rejected rather than inventing evidence',async()=>{
 const blank=Buffer.from(pdf.toString('latin1').replace(/\([^)]*\) Tj/g,m=>'('+ ' '.repeat(m.length-5)+') Tj'),'latin1');
 await assert.rejects(extractContractPdf(blank),/No selectable text/);
});
test('import routes isolate documents, invalidate approval and preserve cases',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'ira-imports-'));const app=Fastify();const records=new Map();let writes=0;
 const store={list:()=>[...records.values()],putMany:cs=>{writes++;for(const c of cs)records.set(c.id,c);},put:c=>records.set(c.id,c)};
 const fail=(statusCode,message)=>Object.assign(new Error(message),{statusCode});const get=id=>{if(!records.has(id))throw fail(404,'Case missing');return structuredClone(records.get(id));};
 registerImportRoutes(app,{store,get,locks:new Set(),fail,dataDirectory:directory});
 try{
  const invalidBatch=csv.trimEnd()+'\n'+csv.trimEnd().split('\n')[1].replace('INV-100','INV-101').replace(',USD,',',JPY,')+'\n';
  const rejected=await app.inject({method:'POST',url:'/api/imports/invoices',payload:{csv:invalidBatch}});assert.equal(rejected.statusCode,400);assert.equal(writes,0);assert.equal(records.size,0);
  let r=await app.inject({method:'POST',url:'/api/imports/invoices',payload:{csv}});assert.equal(r.statusCode,200);const c=r.json().cases[0];
  r=await app.inject({method:'POST',url:'/api/imports/invoices',payload:{csv}});assert.equal(r.statusCode,400);assert.equal(writes,1);assert.equal(records.size,1);
  records.get(c.id).approval={id:'stale'};
  r=await app.inject({method:'POST',url:`/api/cases/${c.id}/contracts`,payload:{filename:'contract.pdf',base64:pdf.toString('base64')}});assert.equal(r.statusCode,200,r.body);const next=r.json();assert.equal(next.approval,null);assert.equal(next.evidence.length,2);assert.equal(next.evidence[1].page,2);
  const url=next.evidence[1].documentUrl;r=await app.inject(url);assert.equal(r.headers['content-type'],'application/pdf');assert.equal(r.rawPayload.length,pdf.length);
  records.set('other',{id:'other',documents:[]});r=await app.inject(url.replace(c.id,'other'));assert.equal(r.statusCode,404);
 }finally{await app.close();await rm(directory,{recursive:true,force:true});}
});
