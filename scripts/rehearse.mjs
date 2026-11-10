import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = process.env.BASE_URL || 'http://127.0.0.1:3100';
const inbox = process.env.MAILPIT_URL || 'http://127.0.0.1:8025';
const output = resolve('test-results/rehearsal');
await mkdir(output,{recursive:true});
const report={base,inbox,startedAt:new Date().toISOString(),runs:[],limitations:['Rules-demo rehearsal; real model quality is evaluated separately.','All sent email uses the local Mailpit test inbox.']};
const json=async(path,method='GET',body)=>{
 const response=await fetch(base+path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 const result=await response.json();assert.equal(response.ok,true,`${method} ${path}: ${JSON.stringify(result)}`);return result;
};
const inboxCount=async()=>Number((await(await fetch(inbox+'/api/v1/messages')).json()).total);
const save=()=>writeFile(output+'/report.json',JSON.stringify(report,null,2));
const browser=await chromium.launch({headless:true});
try {
 for(let round=1;round<=3;round++){
  const run={round,startedAt:new Date().toISOString(),checks:[],errors:[]};report.runs.push(run);await save();
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>run.errors.push(e.message));
  const check=(name)=>run.checks.push(name);
  try {
   await page.goto(base);await page.getByRole('button',{name:/INV-2026-001/}).click();
   await page.locator('#mode').selectOption('demo');
   await page.getByRole('button',{name:/^Investigate/}).click();
   await page.getByRole('checkbox').waitFor();
   let c=await json('/api/cases/northstar');assert.equal(c.status,'review_ready');assert.equal(c.investigation.mode,'demo');check('Northstar investigation ready; no AI claim');
   const citation=page.locator('.finding-list .source-link').first();await citation.click();
   await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
   assert.equal(await citation.evaluate(e=>e===document.activeElement),true);check('Citation opens; Escape closes and returns focus');
   assert.equal(await page.getByRole('button',{name:/Send to test inbox/}).isDisabled(),true);
   await page.getByRole('checkbox').check();
   let approvedResponse=page.waitForResponse(r=>r.url().endsWith('/api/cases/northstar/approve'));
   await page.getByRole('button',{name:'Approve this message'}).click();assert.equal((await approvedResponse).status(),200);
   await page.getByRole('button',{name:/Send to test inbox/}).waitFor({state:'visible'});
   c=await json('/api/cases/northstar');assert.ok(c.approval?.id);
   const oldApproval=c.approval.id;
   await page.locator('#body').fill(c.draft.body+'\nReviewed rehearsal '+round);
   assert.equal(await page.getByRole('button',{name:/Send to test inbox/}).isDisabled(),true);
   const edited={recipient:c.draft.to,subject:c.draft.subject,body:c.draft.body+'\nSaved draft revision '+round};
   await json('/api/cases/northstar/draft','PATCH',edited);
   const stale=await fetch(base+'/api/cases/northstar/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({approvalId:oldApproval})});
   assert.equal(stale.status,409);check('Edited draft blocks UI send and stale server approval');
   await page.reload();await page.getByRole('button',{name:/INV-2026-001/}).click();
   await page.getByRole('checkbox').check();approvedResponse=page.waitForResponse(r=>r.url().endsWith('/api/cases/northstar/approve'));
   await page.getByRole('button',{name:'Approve this message'}).click();assert.equal((await approvedResponse).status(),200);
   c=await json('/api/cases/northstar');const before=await inboxCount();
   await page.getByRole('button',{name:/Send to test inbox/}).click();
   await page.getByRole('status').filter({hasText:/Message delivered/}).waitFor();
   c=await json('/api/cases/northstar');assert.equal(c.status,'sent');assert.equal(await inboxCount(),before+1);
   await json('/api/cases/northstar/send','POST',{approvalId:c.approval.id});assert.equal(await inboxCount(),before+1);check('Approved send reaches Mailpit exactly once; resend idempotent');
   await page.getByRole('button',{name:/INV-2026-002/}).click();await page.getByRole('button',{name:/^Investigate/}).click();
   await page.getByRole('checkbox').waitFor();assert.equal(await page.locator('#recipient').inputValue(),'project-manager@agency.example');check('Harbor exception routes internally');
   const csv=await readFile('samples/sample-invoices.csv','utf8');
   const unique='REHEARSAL-'+Date.now()+'-'+round;
   await page.locator('.import-panel > summary').click();
   await page.locator('#invoice-csv').setInputFiles({name:'rehearsal.csv',mimeType:'text/csv',buffer:Buffer.from(csv.replace('INV-100',unique))});
   const importResponse=page.waitForResponse(r=>r.url().endsWith('/api/imports/invoices')&&r.request().method()==='POST');
   await page.getByRole('button',{name:'Import CSV',exact:true}).click();const imported=await(await importResponse).json();assert.equal(imported.cases.length,1);
   const importedId=imported.cases[0].id;
   await page.locator('#contract-pdf').setInputFiles('samples/sample-contract.pdf');
   const pdfResponse=page.waitForResponse(r=>r.url().endsWith(`/api/cases/${importedId}/contracts`));
   await page.getByRole('button',{name:'Add contract to selected invoice'}).click();const pdfCase=await(await pdfResponse).json();assert.ok(pdfCase.documents.length);check('UI CSV import adds unique invoice; text PDF import attaches page evidence');
   await page.locator('.source-library > summary').click();await page.locator('.source-library button').first().click();
   const pdfLink=page.getByRole('link',{name:/Open PDF at page/});await pdfLink.waitFor();assert.match(await pdfLink.getAttribute('href'),/#page=1$/);
   const pdf=await fetch(base+pdfCase.documents[0].url);assert.equal(pdf.status,200);assert.match(pdf.headers.get('content-type'),/application\/pdf/);
   await page.keyboard.press('Escape');check('Imported PDF page citation opens original PDF');
   await page.getByRole('button',{name:'Load GitHub demo',exact:true}).click();await page.getByText('Current source: Live GitHub lookup',{exact:true}).waitFor({timeout:20000});
   const live=await json('/api/cases/demo-photostrip');const liveSource=live.evidence.find(e=>e.type==='delivery');assert.equal(liveSource.mode,'live');assert.equal(liveSource.accepted,false);assert.ok(liveSource.fetchedAt);assert.ok(liveSource.version);check('Real public GitHub PR retrieved; synthetic billing disclosure retained');
   await page.getByRole('button',{name:'Use cached snapshot'}).click();await page.getByText('Current source: Cached GitHub snapshot',{exact:true}).waitFor();
   const cached=await json('/api/cases/demo-photostrip');const cachedSource=cached.evidence.find(e=>e.type==='delivery');assert.equal(cachedSource.version,liveSource.version);assert.equal(cachedSource.fetchedAt,liveSource.fetchedAt);assert.equal(cachedSource.mode,'cached');check('Explicit cached replay preserves timestamp/version and visible provenance');
   await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);check('390px mobile viewport has no horizontal overflow');
   assert.deepEqual(run.errors,[]);check('No page JavaScript errors');
   await page.screenshot({path:output+`/round-${round}.png`,fullPage:true});run.passed=true;
  }catch(e){run.passed=false;run.failure=e.stack||e.message;await page.screenshot({path:output+`/round-${round}-failure.png`,fullPage:true}).catch(()=>{});throw e;}
  finally{run.completedAt=new Date().toISOString();await save();await page.close();}
 }
 report.passed=report.runs.every(r=>r.passed);report.completedAt=new Date().toISOString();await save();console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
