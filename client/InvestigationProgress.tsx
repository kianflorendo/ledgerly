import {useEffect,useState} from 'react';
export function InvestigationProgress({job,onRetry}:{job:any,onRetry:()=>void}){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{if(job.status!=='running')return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[job.status]);
 const labels:Record<string,string>={reading_sources:'Reading case sources',sources_read:'Sources read',writing_findings:'Preparing model findings',validating:'Checking citations and policy',completed:'Investigation complete',failed:'Investigation failed'};
 return <div className="investigation-progress">
  <strong role="status" aria-live="polite">{labels[job.stage]||'Investigation in progress'}</strong>
  <p>{job.mode==='ollama'?'Local model · Ollama':'Rules demonstration · no AI inference'}{job.status==='running'?' · '+Math.max(0,Math.round((now-Date.parse(job.startedAt))/1000))+' s elapsed':''}</p>
  {job.status==='running'&&<p>You can reload this page and resume viewing this investigation. Approval is unavailable until it completes.</p>}
  {job.status==='failed'&&<><p>{job.error}</p><button type="button" className="secondary" onClick={onRetry}>Retry investigation</button></>}
 </div>;
}
