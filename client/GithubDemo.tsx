import React,{useState} from 'react';
export function GithubDemo({current,onLoaded}:{current:any,onLoaded:(item:any)=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function run(mode:'live'|'cached',refresh=false){
  setBusy(true);setError('');try{
   const path=refresh?`/api/cases/${current.id}/github/refresh`:'/api/demo/github';
   const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Source lookup failed.');await onLoaded(data);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="github-demo panel" aria-labelledby="github-demo-title"><div><h2 id="github-demo-title">Live delivery evidence demonstration</h2><p>The invoice and client acceptance are synthetic. The linked public pull request is a real delivery artifact; a merge does not establish client acceptance.</p>{current?.githubDemo&&<p><strong>Current source: {current.githubMode==='live'?'Live GitHub lookup':'Cached GitHub snapshot'}</strong></p>}</div><div className="github-actions"><button className="secondary" disabled={busy} onClick={()=>void run('live')}>{busy?'Loading source…':'Load GitHub demo'}</button>{current?.githubDemo&&<><button className="secondary" disabled={busy} onClick={()=>void run('live',true)}>Refresh live</button><button className="secondary" disabled={busy} onClick={()=>void run('cached',true)}>Use cached snapshot</button></>}</div>{error&&<p role="alert" className="import-error">{error}</p>}</section>;
}
