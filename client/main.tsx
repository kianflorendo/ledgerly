import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ImportPanel } from './ImportPanel';
import { GithubDemo } from './GithubDemo';
import { Mascot } from './Mascot';
import { ContractReview } from './ContractReview';
import {SourceReview} from './SourceReview';
import {InvestigationProgress} from './InvestigationProgress';
import {BenchmarkWorkspace} from './BenchmarkWorkspace';

type RecordData = Record<string, any>;
async function request(path: string, body?: RecordData) {
  const response = await fetch('/api' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'The request could not be completed.');
  return data;
}
const words = (value: any) => String(value || 'Open').replaceAll('_', ' ').replaceAll('-', ' ');
const money = (item: RecordData) => new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD', maximumFractionDigits: 0 }).format((item.amountMinor ?? item.amountCents ?? item.amount ?? 0) / (item.amountMinor !== undefined || item.amountCents !== undefined ? 100 : 1));

function App() {
  const [workspace,setWorkspace] = useState<'benchmark'|'resolution'>('benchmark');
  const [cases, setCases] = useState<RecordData[]>([]);
  const [current, setCurrent] = useState<RecordData | null>(null);
  const [selectedSource, setSelectedSource] = useState<RecordData | null>(null);
  const sourceOpener = useRef<HTMLElement | null>(null);
  const sourceDialog = useRef<HTMLDialogElement | null>(null);
  function showSource(source: RecordData, opener: HTMLElement) { sourceOpener.current=opener; setSelectedSource(source); }
  const [mode, setMode] = useState('demo');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState({ recipient: '', subject: '', body: '' });
  const [reviewed, setReviewed] = useState(false);
  const [theme, setTheme] = useState<'light'|'dark'>(() => (localStorage.getItem('ira-theme') as 'light'|'dark') || 'light');
  const [queueFilter, setQueueFilter] = useState<'all'|'review'|'new'>('all');
  const [queueSearch, setQueueSearch] = useState('');
  const [sideTab, setSideTab] = useState<'cases'|'sources'|'activity'>('cases');
  const [sidebarHidden, setSidebarHidden] = useState(() => localStorage.getItem('ira-sidebar-hidden') === 'true');
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('ira-theme', theme); }, [theme]);
  useEffect(() => { document.documentElement.dataset.sidebar = sidebarHidden ? 'hidden' : 'shown'; localStorage.setItem('ira-sidebar-hidden', String(sidebarHidden)); }, [sidebarHidden]);

  function adopt(item: RecordData) {
    setCurrent(item); setReviewed(false); setSelectedSource(null);
    const d = item.draft || {};
    setDraft({ recipient: d.recipient || d.to || '', subject: d.subject || '', body: d.body || '' });
  }
  async function refresh() { const data = await request('/cases'); setCases(data.cases || data); }
  useEffect(() => { (async () => { try { const data = await request('/cases'); const list = data.cases || data; setCases(list); if (list[0]) adopt(await request('/cases/' + list[0].id)); } catch (e) { setError((e as Error).message); } })(); }, []);
  useEffect(() => {
    if (!selectedSource) return;
    const dialog=sourceDialog.current;
    dialog?.showModal();
    return () => { dialog?.close(); sourceOpener.current?.focus(); };
  }, [selectedSource]);
  useEffect(()=>{
    const caseId=current?.id,job=current?.investigationJob;
    if(!caseId||job?.status!=='running')return;
    let cancelled=false;let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      try{
        const result=await request('/cases/'+caseId+'/investigations/'+job.id);
        if(cancelled)return;
        if(result.job.status==='running')setCurrent(result.case);else adopt(result.case);
        if(result.job.status!=='running'){
          await refresh();
          if(result.job.status==='failed')setError(result.job.error||'Investigation failed.');
          else {setError('');setNotice('Investigation complete. Review the findings and next action.');}
          return;
        }
      }catch(e){if(cancelled)return;setError('Could not refresh investigation status. Retrying; do not start another investigation.');}
      if(!cancelled)timer=setTimeout(poll,1000);
    };
    void poll();return()=>{cancelled=true;clearTimeout(timer);};
  },[current?.id,current?.investigationJob?.id,current?.investigationJob?.status]);
  async function open(id: string) { setBusy('Loading case'); setError(''); setNotice(''); try { adopt(await request('/cases/' + id)); } catch(e) { setError((e as Error).message); } finally { setBusy(''); } }
  async function action(kind: string, investigationMode=mode) {
    if (!current) return;
    setBusy(kind === 'investigate' ? 'Investigating evidence' : kind === 'approve' ? 'Recording approval' : 'Sending to test inbox'); setError(''); setNotice('');
    try {
      if(kind==='investigate'){
        await request('/cases/'+current.id+'/investigations',{mode:investigationMode});
        adopt(await request('/cases/'+current.id));await refresh();setNotice('Investigation started. Progress is saved for page reloads.');return;
      }
      const payload = kind === 'investigate' ? { mode } : kind === 'approve' ? { ...draft, reviewer: 'Kian' } : { approvalId: current.approval?.id || current.approvalId };
      const next = await request('/cases/' + current.id + '/' + kind, payload); adopt(next); await refresh();
      setNotice(kind === 'send' ? 'Message delivered to the local test inbox. This is not customer delivery or payment.' : kind === 'approve' ? 'Approval recorded for this exact message and evidence version.' : 'Investigation complete. Review each finding before approving a next action.');
    } catch(e) { setError((e as Error).message); try { adopt(await request('/cases/' + current.id)); await refresh(); } catch { /* Keep the original actionable inference error visible. */ } } finally { setBusy(''); }
  }
  const sources: RecordData[] = current?.evidence || current?.sources || [];
  const caseEvents: RecordData[] = current?.events || [];
  const findings: RecordData[] = current?.findings || [];
  const approval = current?.approval;
  const investigationComplete=!!current?.investigation?.completedAt&&!current?.investigation?.errorCode&&findings.length===3&&['review_ready','needs_evidence','approved','sent'].includes(current?.status);
  const draftChanged = current && (draft.body !== (current.draft?.body || '') || draft.subject !== (current.draft?.subject || '') || draft.recipient !== (current.draft?.recipient || current.draft?.to || ''));
  const status = words(current?.status);
  const investigationRunning=current?.investigationJob?.status==='running';
  const visibleCases = cases.filter(item => {
    const state = words(item.status).toLowerCase();
    const matchesFilter = queueFilter === 'all' || (queueFilter === 'review' ? /review|evidence|conflict/.test(state) : /new|open/.test(state));
    const query = queueSearch.trim().toLowerCase();
    return matchesFilter && (!query || `${item.invoiceNumber} ${item.customer} ${item.project} ${item.milestone}`.toLowerCase().includes(query));
  });
  return <div className="app-shell">
    <a className="skip-link" href="#workspace">Skip to case workspace</a>
    <aside className="sidebar" id="brand-sidebar" aria-hidden={sidebarHidden}>
      <div className="brand"><Mascot className="brand-mascot"/><a className="brand-name brand-home" href="/" aria-label="Ledgerly home">Ledgerly<small>AGENT BENCHMARKING</small></a></div>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav className="workspace-nav" aria-label="Workspace"><button className={workspace==='benchmark'?'active':''} onClick={()=>setWorkspace('benchmark')}>Agent benchmark</button><button className={workspace==='resolution'?'active':''} onClick={()=>setWorkspace('resolution')}>Resolution desk</button></nav>
      <div className="nav-current"><span>▣</span> Resolution desk <span className="count">{cases.length}</span></div>
      <div className="sidebar-note"><h3>{workspace === 'benchmark' ? 'Same task. Measured performance.' : 'Evidence before action.'}</h3><p>{workspace === 'benchmark' ? 'Compare agent strategies on identical synthetic tasks.' : 'Every finding has a source. Every message has your approval.'}</p></div>
      <div className="sidebar-bottom"><span className="avatar">K</span><div>Kian's workspace<small>Local development · Solo builder</small></div></div>
    </aside>
    <button type="button" className="panel-edge-toggle" aria-controls="brand-sidebar" aria-expanded={!sidebarHidden} aria-label={sidebarHidden?'Show navigation panel':'Hide navigation panel'} onClick={()=>setSidebarHidden(!sidebarHidden)} title={sidebarHidden?'Show navigation panel':'Hide navigation panel'}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={sidebarHidden?'m9 6 6 6-6 6':'m15 6-6 6 6 6'}/></svg></button>
    <main id="workspace">
      <header className="topbar"><div className="topbar-leading"><span>Ledgerly <span className="breadcrumb">/</span> {workspace === 'benchmark' ? 'Agent benchmark' : 'Resolution desk'}</span></div><div className="topbar-actions"><span className="environment"><i/> Local test workspace</span><button className="theme-toggle" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label={`Switch to ${theme==='light'?'dark':'light'} mode`}>{theme==='light'?'☾':'☀'}<span>{theme==='light'?'Dark':'Light'} mode</span></button></div></header>
      {workspace === 'benchmark' ? <BenchmarkWorkspace/> : <div className="resolution-workspace">
      <section className="page-heading"><div><div className="eyebrow">THE RESOLUTION DESK</div><h1>Move the conversation forward.</h1><p>Find the evidence. Clear the blocker. Keep the relationship.</p></div><span className="local-badge">↳ Runs locally</span></section>
      <section className="summary-strip" aria-label="Workspace summary"><div><span>Invoices in workspace</span><strong>{String(cases.length).padStart(2,'0')}</strong></div><div><span>Invoice values by currency</span><strong className="summary-totals">{Object.entries(cases.reduce((totals:Record<string,number>,c)=>{const currency=c.currency||'USD';totals[currency]=(totals[currency]||0)+(c.amountMinor??c.amountCents??Math.round((c.amount||0)*100));return totals;},{})).map(([currency,amountMinor])=>money({currency,amountMinor})).join(' / ')}</strong></div><div className="summary-principle"><span className="shield">✓</span><p><strong>You stay in control</strong><span>Investigation never sends a message automatically.</span></p></div></section>
      {error && <div className="alert error" role="alert">{error}</div>}
      {notice && <div className="alert success" role="status">{notice}</div>}
      {busy && <div className="working" role="status"><span className="pulse"/>{busy}…</div>}
      <GithubDemo current={current} onLoaded={async item=>{await refresh();adopt(item);}}/>
      <ImportPanel caseId={current?.id} onImported={async item=>{await refresh();adopt(item);}}/>
      <div className="desk-grid">
        <section className="case-list panel" aria-label="Case side panel"><div className="side-tabs" role="tablist" aria-label="Workspace side panel">{([['cases','Cases'],['sources','Sources'],['activity','Activity']] as const).map(([id,label])=><button key={id} role="tab" id={`tab-${id}`} aria-selected={sideTab===id} aria-controls="side-tab-panel" onClick={()=>setSideTab(id)}>{label}{id==='cases'&&<span>{cases.length}</span>}{id==='sources'&&<span>{sources.length}</span>}{id==='activity'&&<span>{caseEvents.length}</span>}</button>)}</div><div id="side-tab-panel" role="tabpanel" aria-labelledby={`tab-${sideTab}`} className="side-tab-content">{sideTab==='cases'?<><div className="panel-heading"><h2 id="queue-title">Dispute queue</h2><span>{visibleCases.length} of {cases.length}</span></div><div className="queue-tools"><label className="sr-only" htmlFor="queue-search">Search invoices</label><input id="queue-search" type="search" placeholder="Search by invoice or customer" value={queueSearch} onChange={event=>setQueueSearch(event.target.value)}/><div className="queue-filters" aria-label="Filter cases">{([['all','All'],['review','Needs review'],['new','New']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={queueFilter===value} onClick={()=>setQueueFilter(value)}>{label}</button>)}</div></div><div className="case-list-items">{visibleCases.map((item,index) => <button key={item.id} className={'case-card ' + (current?.id === item.id ? 'selected' : '')} onClick={() => open(item.id)} disabled={!!busy}><div className="case-card-top"><span className="case-number">{item.invoiceNumber || item.invoice?.number || 'CASE 0'+(index+1)}</span><span className="status-dot"/></div><h3>{item.customer || item.customerName || item.client || 'Customer'}</h3><p>{item.project || item.projectName || item.milestone}</p><div className="case-card-bottom"><strong>{money(item)}</strong><span className="pill">{words(item.status)}</span></div></button>)}</div>{visibleCases.length===0&&<p className="queue-empty">No invoices match this view.</p>}<div className="queue-footnote">Evidence-led review. Human-controlled communication.</div></>:sideTab==='sources'?<div className="side-records">{sources.length?sources.map(source=><button key={source.id} onClick={event=>showSource(source,event.currentTarget)}><strong>{source.title||source.name||source.type||source.id}</strong><span>{words(source.mode||source.provenance||'synthetic fixture')}{source.page?` · Page ${source.page}`:''}</span></button>):<p className="side-empty">No sources are attached to this case yet.</p>}</div>:<ol className="side-activity">{caseEvents.length?caseEvents.map((event:RecordData,i:number)=><li key={event.id||i}><strong>{words(event.type||event.action)}</strong><time>{new Date(event.timestamp||event.createdAt||event.at).toLocaleString()}</time>{event.message&&<p>{event.message}</p>}</li>):<li className="side-empty">No activity recorded for this case.</li>}</ol>}</div></section>
        {current ? <section className="case-workspace panel" aria-labelledby="case-title"><div className="case-header"><div><div className="eyebrow"><span className="origin-label">{current.synthetic?'Synthetic':'Consented upload (declared)'}</span> {current.invoiceNumber || current.id} <span> / </span> {words(current.status)}</div><h2 id="case-title">{current.customer || current.customerName || current.client}</h2><p>{current.project || current.projectName} {current.milestone && ' · '+current.milestone}</p></div><strong className="case-amount">{money(current)}<small>Invoice value · not recovered cash</small></strong></div>
          <div className="objection"><span className="quote-mark">“</span><div><span className="field-caption">CUSTOMER'S PAYMENT HOLD</span><p>{current.objection || current.customerObjection || 'Review the available delivery and acceptance evidence.'}</p></div></div>
          <div className="investigation-bar"><div><h3>Investigate the hold</h3><p>Correlate requirements, delivery, and authorized acceptance.</p></div><div className="investigation-controls"><label className="sr-only" htmlFor="mode">Investigation mode</label><select id="mode" value={mode} onChange={e => setMode(e.target.value)} disabled={!!busy||investigationRunning}><option value="demo">Rules demo · no AI</option><option value="ollama">Local model · Ollama</option></select><button className="primary" onClick={() => action('investigate')} disabled={!!busy||investigationRunning}>Investigate <span>↗</span></button></div>{current.investigationJob&&<InvestigationProgress job={current.investigationJob} onRetry={()=>{setMode(current.investigationJob.mode);void action('investigate',current.investigationJob.mode);}}/>}</div>
          <div className="case-review-row">
          <div className="evidence-area">{investigationComplete&&<div className="pack-actions"><a className="secondary" href={'/api/cases/'+current.id+'/pack'} download>Download evidence pack (PDF)</a><span>PDF document with findings and source records</span></div>}<div className="section-heading"><h3>Evidence checklist</h3><span>{findings.length ? findings.length+' findings' : 'Ready to investigate'}</span></div>{current.investigation && <div className="investigation-result"><strong>{current.investigation.mode === 'ollama' ? 'Local model investigation' : 'Rules demonstration · no AI inference'}</strong><p>{current.investigation.summary}</p>{current.investigation.toolCalls?.length > 0 && <details><summary>Tool activity · {current.investigation.toolCalls.length} calls</summary><pre>{JSON.stringify(current.investigation.toolCalls,null,2)}</pre></details>}</div>}{findings.length ? <div className="finding-list">{findings.map((finding,i) => <div className="finding" key={finding.id || i}><span className={'finding-symbol '+finding.status}>{finding.status === 'supported' ? '✓' : finding.status === 'missing' ? '!' : '?'}</span><div><div className="finding-title"><h4>{finding.requirement || finding.title || finding.label}</h4><span className={'finding-status '+finding.status}>{words(finding.status)}</span></div><p>{finding.explanation || finding.reason || finding.summary}</p>{(finding.evidenceIds || finding.sourceIds || (finding.evidenceId ? [finding.evidenceId] : [])).map((id: string) => { const src = sources.find(s => s.id === id); return src ? <button className="source-link" key={id} onClick={event => showSource(src,event.currentTarget)}>↗ {src.title || src.name || src.type || id}</button> : <span className="source-link" key={id}>Source: {id}</span>; })}</div></div>)}</div> : <div className="empty-state"><Mascot className="empty-mascot"/><h4>Start with the evidence.</h4><p>Run an investigation to see what supports this invoice and what still needs a human.</p></div>}
          </div>
          {current.draft && <section className="draft-area" aria-labelledby="draft-title"><div className="section-heading"><h3 id="draft-title">Review the next action</h3><span className="pill">{approval && !draftChanged ? 'Approved' : 'Your approval required'}</span></div><p className="draft-description">{!investigationComplete&&'Run a new investigation before approving or sending. '}Review the recipients and wording. Any change requires a fresh approval.</p><label htmlFor="recipient">To</label><input id="recipient" type="email" value={draft.recipient} onChange={e => {setDraft({...draft,recipient:e.target.value});setReviewed(false);}} disabled={!!busy}/><label htmlFor="subject">Subject</label><input id="subject" value={draft.subject} onChange={e => {setDraft({...draft,subject:e.target.value});setReviewed(false);}} disabled={!!busy}/><label htmlFor="body">Message</label><textarea id="body" rows={9} value={draft.body} onChange={e => {setDraft({...draft,body:e.target.value});setReviewed(false);}} disabled={!!busy}/><label className="review-check"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)}/><span>I reviewed the evidence, recipient, and exact message.</span></label><div className="draft-actions"><button className="secondary" onClick={() => action('approve')} disabled={!!busy || !investigationComplete || !reviewed || !draft.body || !draft.recipient}>Approve this message</button><button className="primary" onClick={() => action('send')} disabled={!!busy || !investigationComplete || !approval || !!draftChanged || status === 'sent'}>Send to test inbox <span>↗</span></button></div><p className="test-note">Test delivery only. No customer is contacted and no payment is moved.</p></section>}
          </div>
        </section> : <section className="panel empty-state"><h2>Your workspace is loading</h2><p>Select a case once the local server is ready.</p></section>}
      </div>
      <footer>Built for careful decisions.<span>Delivery ≠ acceptance. Prepared ≠ paid.</span></footer>
      </div>}
    </main>
    {selectedSource && <dialog ref={sourceDialog} className="source-overlay" aria-labelledby="source-title" onCancel={event => {event.preventDefault();setSelectedSource(null);}} onClick={event => {if(event.target===event.currentTarget)setSelectedSource(null);}}><section className="source-dialog" onClick={e => e.stopPropagation()}><button autoFocus className="close-button" onClick={() => setSelectedSource(null)} aria-label="Close source">×</button><div className="eyebrow">SOURCE RECORD</div><h2 id="source-title">{selectedSource.title || selectedSource.name || selectedSource.id}</h2><div className="source-meta">{words(selectedSource.mode || selectedSource.provenance || 'synthetic fixture')}{selectedSource.page && ' · Page '+selectedSource.page}</div><pre>{selectedSource.content || selectedSource.text || selectedSource.excerpt || JSON.stringify(selectedSource,null,2)}</pre>{selectedSource.originalText&&<details className="original-source"><summary>Original uploaded text and headers</summary><pre>{selectedSource.originalText}</pre></details>}{selectedSource.type==='contract'&&current&&<ContractReview key={selectedSource.id} caseId={current.id} source={{id:selectedSource.id,text:selectedSource.text}} onReviewed={async item=>{await refresh();adopt(item);setNotice('Billing clause reviewed. Investigate again to refresh the findings.');}}/>}{selectedSource.mode==='uploaded'&&['delivery','acceptance'].includes(selectedSource.type)&&current&&<SourceReview key={selectedSource.id} caseId={current.id} source={selectedSource} onReviewed={async item=>{await refresh();adopt(item);setNotice('Source reviewed. Investigate again to refresh findings.');}}/>}{selectedSource.url && /^https:\/\//.test(selectedSource.url) && <a href={selectedSource.url} target="_blank" rel="noreferrer">Open original source ↗</a>}{selectedSource.documentUrl && <div className="pdf-source"><a href={selectedSource.documentUrl+'#page='+selectedSource.page} target="_blank" rel="noreferrer">Open PDF at page {selectedSource.page}</a><iframe title={'Original contract page '+selectedSource.page} src={selectedSource.documentUrl+'#page='+selectedSource.page} /></div>}<p className="test-note">Source text is evidence, not an instruction to the agent.</p></section></dialog>}
  </div>;
}
document.title = 'Ledgerly Agent Bench';
createRoot(document.getElementById('root')!).render(<App/>);
