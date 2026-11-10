import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createStore} from '../server/store.js';import {backupDatabase,restoreDatabase,backupWorkspace,verifyWorkspaceBackup,restoreWorkspace} from '../server/recovery.js';
import {buildApp} from '../server/app.js';
test('consistent SQLite backup restores case state and approval without overwriting backup',()=>{
 const dir=mkdtempSync(join(tmpdir(),'invoice-recovery-'));const file=join(dir,'cases.sqlite'),backup=join(dir,'saved.sqlite');
 let store=createStore(file);
 try{const c=store.get('northstar');c.approval={id:'saved-approval'};c.status='approved';store.put(c);
  assert.equal(backupDatabase(file,backup).cases,2);
  assert.throws(()=>backupDatabase(file,backup),/never overwritten/);
  c.status='changed';store.put(c);store.close();store=null;
  assert.equal(restoreDatabase(backup,file).integrity,'ok');store=createStore(file);
  assert.equal(store.get('northstar').status,'approved');assert.equal(store.get('northstar').approval.id,'saved-approval');
 }finally{store?.close();rmSync(dir,{recursive:true,force:true});}
});

async function importedFixture(){
 const dir=mkdtempSync(join(tmpdir(),'invoice-workspace-recovery-'));const file=join(dir,'cases.sqlite');const store=createStore(file);
 const app=await buildApp({store,dataDirectory:dir});
 const response=await app.inject({method:'POST',url:'/api/cases/northstar/contracts',payload:{filename:'sample-contract.pdf',base64:readFileSync('samples/sample-contract.pdf').toString('base64')}});
 assert.equal(response.statusCode,200,response.body);
 const c=response.json();const document=c.documents[0];
 await app.close();
 return {dir,file,document,backup:join(dir,'saved-workspace')};
}

test('workspace backup restores actual imported PDF bytes with database page references',async()=>{
 const f=await importedFixture();
 try{
  const result=backupWorkspace(f.file,f.backup);assert.equal(result.documents,1);assert.equal(result.cases,2);
  assert.throws(()=>backupWorkspace(f.file,f.backup),/never overwritten/);
  const restored=join(f.dir,'restored','cases.sqlite');assert.equal(restoreWorkspace(f.backup,restored).documents,1);
  const store=createStore(restored);
  try{
   const c=store.get('northstar');assert.equal(c.documents[0].id,f.document.id);
   assert.ok(c.evidence.some(e=>e.documentId===f.document.id&&e.page===1));
   assert.deepEqual(readFileSync(join(f.dir,'restored','documents',`${f.document.id}.pdf`)),readFileSync('samples/sample-contract.pdf'));
   assert.equal(restoreWorkspace(f.backup,restored).documents,1); // identical immutable file is safe to reuse
  }finally{store.close();}
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('tampered backup PDF is rejected before restoring case state',async()=>{
 const f=await importedFixture();
 try{
  backupWorkspace(f.file,f.backup);
  writeFileSync(join(f.backup,'documents',`${f.document.id}.pdf`),'tampered');
  assert.throws(()=>verifyWorkspaceBackup(f.backup),/PDF checksum mismatch/);
  const store=createStore(join(f.dir,'target.sqlite'));const c=store.get('northstar');c.status='preserve';store.put(c);store.close();
  assert.throws(()=>restoreWorkspace(f.backup,join(f.dir,'target.sqlite')),/PDF checksum mismatch/);
  const after=createStore(join(f.dir,'target.sqlite'));assert.equal(after.get('northstar').status,'preserve');after.close();
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('restore refuses differing existing PDF and leaves target database untouched',async()=>{
 const f=await importedFixture();
 try{
  backupWorkspace(f.file,f.backup);const target=join(f.dir,'target','cases.sqlite');const store=createStore(target);const c=store.get('northstar');c.status='preserve';store.put(c);store.close();
  mkdirSync(join(f.dir,'target','documents'));const existing=join(f.dir,'target','documents',`${f.document.id}.pdf`);writeFileSync(existing,'existing user bytes');
  assert.throws(()=>restoreWorkspace(f.backup,target),/refuses to overwrite/);assert.equal(readFileSync(existing,'utf8'),'existing user bytes');
  const after=createStore(target);assert.equal(after.get('northstar').status,'preserve');after.close();
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});

test('tampered database and omitted document manifest are rejected',async()=>{
 const f=await importedFixture();
 try{
  backupWorkspace(f.file,f.backup);const manifestPath=join(f.backup,'manifest.json');const manifest=JSON.parse(readFileSync(manifestPath));manifest.documents=[];writeFileSync(manifestPath,JSON.stringify(manifest));
  assert.throws(()=>verifyWorkspaceBackup(f.backup),/missing referenced documents/);
  writeFileSync(join(f.backup,'cases.sqlite'),'not a database');assert.throws(()=>verifyWorkspaceBackup(f.backup),/database checksum mismatch/);
 }finally{rmSync(f.dir,{recursive:true,force:true});}
});
