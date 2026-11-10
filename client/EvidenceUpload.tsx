import {useState} from 'react';

export function EvidenceUpload({caseId,onImported}:{caseId?:string,onImported:(c:any)=>Promise<void>}){
 const [file,setFile]=useState<File|null>(null),[kind,setKind]=useState('delivery'),[author,setAuthor]=useState(''),[timestamp,setTimestamp]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <form className="evidence-upload" onSubmit={async e=>{
  e.preventDefault();if(!file||!caseId)return;setBusy(true);setError('');
  try{
   if(file.size>100000)throw new Error('Choose a text file up to 100 KB.');
   const response=await fetch('/api/cases/'+encodeURIComponent(caseId)+'/sources',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name,content:await file.text(),kind,author,timestamp})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Upload failed.');
   await onImported(result);setFile(null);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }}>
  <h3>Add delivery or acceptance evidence</h3>
  <p>Added only to the selected case. Open the uploaded source in Sources to review it before investigation. Plain-text .eml and .txt only; 100 KB maximum.</p>
  <div className="pilot-form-grid">
   <label>Evidence category<select value={kind} onChange={e=>setKind(e.target.value)} disabled={busy}><option value="delivery">Delivery record</option><option value="acceptance">Client acceptance / rejection</option></select></label>
   <label>Declared author or sender<input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="For .txt; .eml uses its From header" disabled={busy}/></label>
   <label>Source timestamp<input type="datetime-local" value={timestamp} onChange={e=>setTimestamp(e.target.value)} disabled={busy}/></label>
   <label>Evidence file<input type="file" accept=".txt,.eml,text/plain,message/rfc822" onChange={e=>setFile(e.target.files?.[0]||null)} disabled={busy}/></label>
  </div>
  <p>Email headers and typed authors are declarations, not verified identities. Uploading a record never establishes acceptance.</p>
  {error&&<p role="alert">{error}</p>}
  <button type="submit" className="secondary" disabled={busy||!file||!caseId}>{busy?'Uploading…':'Add evidence to selected case'}</button>
 </form>;
}
