import {useState,useId} from 'react';

export function SourceReview({caseId,source,onReviewed}:{caseId:string,source:any,onReviewed:(c:any)=>Promise<void>}){
 const id=useId(),[quote,setQuote]=useState(''),[reviewer,setReviewer]=useState('Kian'),[confirmed,setConfirmed]=useState(false);
 const [decision,setDecision]=useState(source.type==='delivery'?'delivery':'not_acceptance'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <form className="contract-review" onSubmit={async e=>{
  e.preventDefault();setBusy(true);setError('');
  try{
   const r=await fetch('/api/cases/'+encodeURIComponent(caseId)+'/sources/'+encodeURIComponent(source.id)+'/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quote,reviewer,confirmed,decision})});
   const data=await r.json();if(!r.ok)throw new Error(data.error||'Review failed.');await onReviewed(data);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }}>
  <h3>Review this {source.type} record</h3>
  <p>Declared sender: {source.author}. Identity is not verified. Check the source, milestone and configured approver before confirming.</p>
  <label htmlFor={id+'quote'}>Exact supporting quote</label><textarea id={id+'quote'} rows={4} value={quote} onChange={e=>{setQuote(e.target.value);setConfirmed(false);}} maxLength={6000} required disabled={busy}/>
  <label htmlFor={id+'decision'}>Review decision</label><select id={id+'decision'} value={decision} onChange={e=>{setDecision(e.target.value);setConfirmed(false);}} disabled={busy}>
   {source.type==='delivery'?<option value="delivery">Delivery recorded; acceptance remains separate</option>:<><option value="not_acceptance">Does not establish acceptance</option><option value="accepted">Explicit acceptance by the configured approver</option><option value="rejected">Explicit rejection / withdrawn acceptance</option></>}
  </select>
  <label htmlFor={id+'name'}>Reviewer name</label><input id={id+'name'} value={reviewer} onChange={e=>setReviewer(e.target.value)} maxLength={100} required disabled={busy}/>
  <label className="review-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/><span>I checked the exact record and its scope for this milestone.</span></label>
  {error&&<p role="alert">{error}</p>}
  <button className="secondary" disabled={busy||!confirmed||!quote.trim()||!reviewer.trim()}>{busy?'Saving…':'Confirm source review'}</button>
 </form>;
}
