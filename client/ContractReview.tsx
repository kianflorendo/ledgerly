import { useId, useState } from 'react';

export function ContractReview({caseId,source,onReviewed}:{caseId:string,source:{id:string,text?:string},onReviewed:(item:any)=>Promise<void>}) {
  const id=useId();
  const [quote,setQuote]=useState('');
  const [reviewer,setReviewer]=useState('Kian');
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const candidates=(source.text||'').split(/(?<=[.!?])\s+(?=[A-Z])/u).filter(q=>/billing|billable|payment/i.test(q)&&/delivery/i.test(q)&&/written\s+(?:client\s+)?acceptance/i.test(q)).slice(0,4);
  return <form className="contract-review" onSubmit={async event=>{
    event.preventDefault();setBusy(true);setError('');
    try {
      const response=await fetch('/api/cases/'+encodeURIComponent(caseId)+'/contract-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceId:source.id,quote,reviewer,confirmed})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Contract review failed.');
      await onReviewed(result);
    } catch(error){setError((error as Error).message);} finally{setBusy(false);}
  }}>
    <h3>Review billing requirements</h3>
    <p>An upload alone does not verify its terms. Copy the exact clause from the source above, preserving line breaks.</p>
    <div className="clause-candidates">{candidates.length>0&&<p>Suggested exact text ? review its meaning before confirming:</p>}{candidates.map((q,i)=><button key={i} type="button" className="secondary" onClick={()=>{setQuote(q.trim());setConfirmed(false);}} disabled={busy}>{q.trim().slice(0,180)}{q.length>180?'?':''}</button>)}</div><label htmlFor={id+'quote'}>Exact billing clause</label>
    <textarea id={id+'quote'} rows={5} value={quote} onChange={e=>{setQuote(e.target.value);setConfirmed(false);}} required maxLength={6000} disabled={busy}/>
    <label htmlFor={id+'reviewer'}>Reviewer name</label>
    <input id={id+'reviewer'} value={reviewer} onChange={e=>setReviewer(e.target.value)} required maxLength={100} disabled={busy}/>
    <label className="review-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/><span>I reviewed this clause for the selected milestone. Billing requires delivery and written client acceptance.</span></label>
    <p>Other billing conditions remain under internal review. This records your review; it does not prove delivery, acceptance, or the reviewer's identity.</p>
    {error&&<p role="alert">{error}</p>}
    <button className="secondary" type="submit" disabled={busy||!confirmed||!quote.trim()||!reviewer.trim()}>{busy?'Saving review…':'Confirm billing clause'}</button>
  </form>;
}
