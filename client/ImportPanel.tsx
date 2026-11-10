import React, {useState} from 'react';
import {EvidenceUpload} from './EvidenceUpload';

type Props={caseId?:string,onImported:(item:any)=>Promise<void>};
async function post(path:string,body:any){const r=await fetch('/api'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw new Error(result.error||'Import failed.');return result;}
export function ImportPanel({caseId,onImported}:Props){
 const [invoice,setInvoice]=useState<File|null>(null),[contract,setContract]=useState<File|null>(null);
 const [provenance,setProvenance]=useState('synthetic');
 const [busy,setBusy]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function run(kind:'invoice'|'contract'){
  setError('');setMessage('');setBusy(kind);
  try{
   if(kind==='invoice'){
    if(!invoice||invoice.size>262144)throw new Error('Choose a CSV no larger than 256 KB.');
    const result=await post('/imports/invoices',{csv:await invoice.text(),provenance});await onImported(result.cases[0]);setMessage(`${result.cases.length} invoice(s) imported. Add contract evidence to the selected case.`);
   }else{
    if(!contract||contract.size>5*1024*1024||!caseId)throw new Error('Choose a PDF up to 5 MB and select an invoice.');
    const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Could not read file.'));reader.readAsDataURL(contract);});
    await onImported(await post(`/cases/${caseId}/contracts`,{filename:contract.name,base64}));setMessage('Contract imported with page citations. Open the contract in Sources and confirm its billing clause before investigation.');
   }
  }catch(e){setError((e as Error).message);}finally{setBusy('');}
 }
 return <details className="import-panel panel"><summary>Import invoices and contract evidence</summary><div className="import-content"><p>Use synthetic or consented records. Imports never infer client acceptance.</p><div className="import-columns"><form onSubmit={e=>{e.preventDefault();void run('invoice');}}><h3>Invoice CSV</h3><label htmlFor="invoice-origin">Record origin</label><select id="invoice-origin" value={provenance} onChange={e=>setProvenance(e.target.value)} disabled={!!busy}><option value="synthetic">Synthetic test records</option><option value="consented">Consented records (declared)</option></select><p>Up to 100 invoices; 256 KB maximum. New cases are added to the queue.</p><label htmlFor="invoice-csv">Choose invoice CSV</label><input id="invoice-csv" type="file" accept=".csv,text/csv" onChange={e=>setInvoice(e.target.files?.[0]||null)} disabled={!!busy}/><details><summary>Required columns and example</summary><pre>invoiceNumber,customer,project,milestone,amount,currency,recipient,authorizedApprover,objection{`\n`}INV-100,Example Agency,Portal,M1,1500.00,USD,ap@client.example,approver@client.example,Acceptance requested</pre><p>Supported currencies: USD, PHP, EUR and GBP. Amounts use decimal major units and at most two decimal places. Recipients must end in .example for test delivery.</p></details><button className="secondary" disabled={!!busy||!invoice}>Import CSV</button></form><form onSubmit={e=>{e.preventDefault();void run('contract');}}><h3>Contract PDF</h3><p>Added to the selected invoice. Selectable text only; up to 30 pages and 5 MB.</p><label htmlFor="contract-pdf">Choose contract PDF</label><input id="contract-pdf" type="file" accept=".pdf,application/pdf" onChange={e=>setContract(e.target.files?.[0]||null)} disabled={!!busy}/><button className="secondary" disabled={!!busy||!contract||!caseId}>Add contract to selected invoice</button></form></div><EvidenceUpload caseId={caseId} onImported={onImported}/>{busy&&<p role="status">Importing {busy}…</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert" className="import-error">{error}</p>}</div></details>;
}
