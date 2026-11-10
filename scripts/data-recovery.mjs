import {backupWorkspace,restoreWorkspace,verifyWorkspaceBackup} from '../server/recovery.js';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
const [action,file,confirmation]=process.argv.slice(2);
const source=process.env.DATA_PATH||'data/cases.sqlite';
const root=resolve(dirname(source),'backups');
const path=resolve(root,file||'');
const rel=relative(root,path);
if(!file||!rel||rel==='..'||rel.startsWith('..\\')||rel.startsWith('../')||isAbsolute(rel))throw new Error('Provide a new backup directory name inside the workspace backups folder.');
if(action==='backup')console.log(backupWorkspace(source,path));
else if(action==='verify')console.log(verifyWorkspaceBackup(path));
else if(action==='restore'){
 if(confirmation!=='--app-stopped')throw new Error('Stop the app before restore and pass --app-stopped.');
 console.log(restoreWorkspace(path,source));
}else throw new Error('Use backup, verify, or restore.');
