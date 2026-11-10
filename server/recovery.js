import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,existsSync,readFileSync,writeFileSync,lstatSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {createHash} from 'node:crypto';

export function backupDatabase(source,destination){
 if(resolve(source)===resolve(destination)||existsSync(destination))throw new Error('Choose a new backup file; existing data is never overwritten.');
 mkdirSync(dirname(destination),{recursive:true});
 const db=new DatabaseSync(source,{readOnly:true});
 try{db.prepare('VACUUM INTO ?').run(resolve(destination));}finally{db.close();}
 return verifyBackup(destination);
}
export function verifyBackup(path){
 const db=new DatabaseSync(path,{readOnly:true});
 try{
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Backup integrity check failed.');
  const rows=db.prepare('SELECT id,data FROM cases').all();
  for(const row of rows){const c=JSON.parse(row.data);if(c.id!==row.id||!Array.isArray(c.evidence))throw new Error('Backup case schema invalid.');}
  return {integrity:'ok',cases:rows.length};
 }finally{db.close();}
}
export function restoreDatabase(source,target){
 verifyBackup(source);
 const saved=new DatabaseSync(source,{readOnly:true});const db=new DatabaseSync(target);
 try{
  const rows=saved.prepare('SELECT id,data FROM cases').all();
  db.exec('BEGIN IMMEDIATE');
  try{db.exec('CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY,data TEXT NOT NULL);DELETE FROM cases');
   const insert=db.prepare('INSERT INTO cases(id,data) VALUES (?,?)');for(const row of rows)insert.run(row.id,row.data);
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
 }finally{saved.close();db.close();}
 return verifyBackup(target);
}

const checksum=bytes=>createHash('sha256').update(bytes).digest('hex');
const checkedBytes=path=>{
 if(!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink())throw new Error('Backup and document files must be regular files.');
 return readFileSync(path);
};
function referencedDocuments(database){
 const db=new DatabaseSync(database,{readOnly:true});
 try{
  const docs=new Map();
  for(const row of db.prepare('SELECT data FROM cases').all()){
   const c=JSON.parse(row.data);
   for(const d of c.documents||[]){
    if(!/^[a-f0-9-]{36}$/.test(d.id)||! /^[a-f0-9]{64}$/.test(d.version))throw new Error('Invalid document reference in database.');
    if(docs.has(d.id)&&docs.get(d.id)!==d.version)throw new Error('Conflicting document versions in database.');
    docs.set(d.id,d.version);
   }
   for(const e of c.evidence||[]){
    if(e.documentId&&!c.documents?.some(d=>d.id===e.documentId&&d.version===e.version))throw new Error('Evidence references an unknown document version.');
   }
  }
  return docs;
 }finally{db.close();}
}

/** New directory containing consistent SQLite snapshot and every referenced PDF. */
export function backupWorkspace(source,destination,documents=join(dirname(resolve(source)),'documents')){
 const target=resolve(destination);
 if(existsSync(target))throw new Error('Choose a new backup directory; existing data is never overwritten.');
 mkdirSync(dirname(target),{recursive:true});mkdirSync(target);
 const database=join(target,'cases.sqlite');backupDatabase(source,database);
 const referenced=referencedDocuments(database);mkdirSync(join(target,'documents'));
 const entries=[];
 for(const [id,version] of referenced){
  const bytes=checkedBytes(join(documents,`${id}.pdf`));
  if(checksum(bytes)!==version)throw new Error('Source PDF checksum does not match its database version.');
  writeFileSync(join(target,'documents',`${id}.pdf`),bytes,{flag:'wx'});entries.push({id,sha256:version,bytes:bytes.length});
 }
 const manifest={format:'invoice-workspace-backup-v1',createdAt:new Date().toISOString(),database:{file:'cases.sqlite',sha256:checksum(checkedBytes(database))},documents:entries};
 writeFileSync(join(target,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
 return verifyWorkspaceBackup(target);
}

export function verifyWorkspaceBackup(directory){
 const root=resolve(directory);const manifest=JSON.parse(checkedBytes(join(root,'manifest.json')).toString('utf8'));
 if(manifest.format!=='invoice-workspace-backup-v1'||manifest.database?.file!=='cases.sqlite'||!Array.isArray(manifest.documents))throw new Error('Invalid workspace backup manifest.');
 const database=join(root,'cases.sqlite');
 if(checksum(checkedBytes(database))!==manifest.database.sha256)throw new Error('Backup database checksum mismatch.');
 const result=verifyBackup(database);const referenced=referencedDocuments(database);const seen=new Set();
 for(const entry of manifest.documents){
  if(!/^[a-f0-9-]{36}$/.test(entry.id)||seen.has(entry.id)||referenced.get(entry.id)!==entry.sha256)throw new Error('Backup manifest does not match database document references.');
  seen.add(entry.id);const bytes=checkedBytes(join(root,'documents',`${entry.id}.pdf`));
  if(bytes.length!==entry.bytes||checksum(bytes)!==entry.sha256)throw new Error('Backup PDF checksum mismatch.');
 }
 if(seen.size!==referenced.size)throw new Error('Backup is missing referenced documents.');
 return {...result,documents:seen.size,format:manifest.format};
}

/** Caller must stop the app. Verify all files before copying, then replace cases transactionally. */
export function restoreWorkspace(directory,target,documents=join(dirname(resolve(target)),'documents')){
 const verified=verifyWorkspaceBackup(directory);const root=resolve(directory);
 const manifest=JSON.parse(checkedBytes(join(root,'manifest.json')).toString('utf8'));
 const pending=[];
 for(const entry of manifest.documents){
  const destination=join(documents,`${entry.id}.pdf`);const bytes=checkedBytes(join(root,'documents',`${entry.id}.pdf`));
  if(existsSync(destination)){
   if(checksum(checkedBytes(destination))!==entry.sha256)throw new Error('Restore refuses to overwrite a differing existing document.');
  }else pending.push({destination,bytes});
 }
 mkdirSync(documents,{recursive:true});mkdirSync(dirname(resolve(target)),{recursive:true});
 // Immutable files first: database references never point to PDFs not yet restored.
 for(const file of pending)writeFileSync(file.destination,file.bytes,{flag:'wx'});
 restoreDatabase(join(root,'cases.sqlite'),target);
 return verified;
}
