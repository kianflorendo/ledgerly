import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { seedCases } from './domain.js';
export function createStore(path) {
 if(path!==':memory:') mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path);
 db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS benchmark_runs (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)');
 const put=c=>db.prepare('INSERT INTO cases(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(c.id,JSON.stringify(c));
 const list=()=>db.prepare('SELECT data FROM cases ORDER BY id DESC').all().map(r=>JSON.parse(r.data));
 const get=id=>{const r=db.prepare('SELECT data FROM cases WHERE id=?').get(id); return r?JSON.parse(r.data):null;};
 const putMany=cases=>{db.exec('BEGIN');try{cases.forEach(put);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}};
 const reset=()=>{db.exec('BEGIN');try{seedCases().forEach(put);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}};
 const putBenchmarkRun=run=>db.prepare('INSERT INTO benchmark_runs(id,data,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').run(run.id,JSON.stringify(run),run.updatedAt);
 const getBenchmarkRun=id=>{const r=db.prepare('SELECT data FROM benchmark_runs WHERE id=?').get(id);return r?JSON.parse(r.data):null;};
 const listBenchmarkRuns=(limit=20)=>db.prepare('SELECT data FROM benchmark_runs ORDER BY updated_at DESC LIMIT ?').all(Math.max(1,Math.min(50,limit))).map(r=>JSON.parse(r.data));
 if(!list().length) reset();
 return {put,putMany,list,get,reset,putBenchmarkRun,getBenchmarkRun,listBenchmarkRuns,close:()=>db.close()};
}
