import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';
import {backupWorkspace,verifyWorkspaceBackup,restoreWorkspace} from '../server/recovery.js';
import {createStore} from '../server/store.js';import {buildApp} from '../server/app.js';
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const source=process.env.DATA_PATH||'data/rehearsal.sqlite';const backup=resolve('data/backups',`rehearsal-${stamp}`);
const root=resolve('test-results/recovery',stamp);mkdirSync(root,{recursive:true});
const report={source,backup,createdAt:new Date().toISOString()};
report.backup=backupWorkspace(source,backup);report.verified=verifyWorkspaceBackup(backup);
const target=resolve(root,'cases.sqlite');report.restored=restoreWorkspace(backup,target);
const store=createStore(target);const docs=store.list().flatMap(c=>(c.documents||[]).map(d=>({caseId:c.id,...d})));
assert.ok(docs.length,'Rehearsal must contain at least one imported PDF.');
const app=await buildApp({store,dataDirectory:root});
try{
 const response=await app.inject({method:'GET',url:`/api/cases/${docs[0].caseId}/documents/${docs[0].id}`});
 assert.equal(response.statusCode,200);assert.equal(response.headers['content-type'],'application/pdf');
 assert.equal(response.rawPayload.subarray(0,5).toString(),'%PDF-');
 report.restoredPdfRoute='passed';report.northstarState=store.get('northstar')?.status;report.passed=true;
}finally{await app.close();}
writeFileSync(resolve(root,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
