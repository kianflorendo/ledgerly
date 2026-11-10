import { createHash, randomUUID } from 'node:crypto';
export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const event = (type, message) => ({ id: randomUUID(), type, message, at: new Date().toISOString() });
export function evidenceMatchesCase(e,c){
 return e.caseId===c.id&&e.milestone===c.milestone&&
  (!e.project||e.project===c.project)&&(!e.invoiceNumber||e.invoiceNumber===c.invoiceNumber)&&
  (e.contractVersion===undefined||e.contractVersion===c.contractVersion)&&e.isCurrent!==false&&
  !(e.type==='acceptance'&&e.acceptanceScope==='partial');
}
const contractContext = c => ({id:c.id,milestone:c.milestone,project:c.project,invoiceNumber:c.invoiceNumber,authorizedApprovers:c.authorizedApprovers});
export function contractReviewFor(c, source, quote, reviewer) {
 if(!source||source.type!=='contract'||!evidenceMatchesCase(source,c)||typeof quote!=='string'||!quote.trim()||
   !(source.text||source.excerpt||'').includes(quote)||typeof reviewer!=='string'||!reviewer.trim())throw new Error('Review requires an exact clause from this case and a reviewer name.');
 const clause=quote.replace(/\s+/g,' ');
 if(!/\b(billable|billing|payment|invoice|invoicing)\b/i.test(clause)||!/\b(delivery|delivered|deliverables)\b/i.test(clause)||!/\bwritten\s+(?:client\s+)?acceptance\b/i.test(clause))
   throw new Error('This clause does not document the supported billing condition: delivery and written acceptance. Other terms require internal review.');
 return {sourceId:source.id,sourceHash:hash(source),contextHash:hash(contractContext(c)),quote,reviewer:reviewer.trim(),reviewedAt:new Date().toISOString(),rule:'delivery_and_written_acceptance'};
}
export function reviewedContract(c,source){
 const r=c.contractReview;
 return r?.rule==='delivery_and_written_acceptance'&&r.sourceId===source.id&&r.sourceHash===hash(source)&&r.contextHash===hash(contractContext(c))&&
   typeof r.reviewer==='string'&&r.reviewer.trim()&&typeof r.reviewedAt==='string'&&typeof r.quote==='string'&&r.quote.trim()&&(source.text||source.excerpt||'').includes(r.quote);
}
export const investigationHash = c => hash({context:contractContext(c),evidence:c.evidence,contractReview:c.contractReview});
const sourceReviewHash = e => {const {review,accepted,...source}=e;return hash(source);};
export function sourceReviewFor(c,source,{quote,reviewer,decision}) {
 if(!source||!['delivery','acceptance'].includes(source.type)||!evidenceMatchesCase(source,c)||
   typeof quote!=='string'||!quote.trim()||!source.text.includes(quote)||typeof reviewer!=='string'||!reviewer.trim())
   throw new Error('Choose an exact quote from this case and provide a reviewer.');
 if(source.type==='delivery'?decision!=='delivery':!['accepted','rejected','not_acceptance'].includes(decision))
   throw new Error('Choose a valid review decision for this source.');
 if(decision==='accepted'&&!c.authorizedApprovers.includes(source.author))throw new Error('This sender does not match a configured authorized approver.');
 return {quote,reviewer:reviewer.trim(),decision,sourceHash:sourceReviewHash(source),contextHash:hash(contractContext(c)),reviewedAt:new Date().toISOString()};
}
function sourceReviewed(c,e) {
 return e.mode!=='uploaded'||(e.review?.sourceHash===sourceReviewHash(e)&&e.review.contextHash===hash(contractContext(c))&&
   typeof e.review.quote==='string'&&e.review.quote.trim()&&e.text.includes(e.review.quote));
}
export function seedCases() {
 return [true,false].map((accepted,index) => {
  const id = accepted ? 'northstar' : 'harbor';
  const customer = accepted ? 'Northstar Studio' : 'Harbor Collective';
  const milestone = 'M2 - Client portal';
  const common = {caseId:id,milestone,mode:'synthetic',version:'fixture-v1',page:1,url:null};
  const evidence = [
   {...common,id:`${id}-contract`,type:'contract',title:'Statement of Work - Clause 4.2',excerpt:'Milestone M2 is billable following portal delivery and written acceptance by the named client approver.',author:'Contract parties'},
   {...common,id:`${id}-delivery`,type:'delivery',title:'GitHub delivery snapshot - PR #42',excerpt:'Client portal implementation merged. Delivery recorded; client acceptance is a separate requirement.',author:'agency-developer',mode:'cached'},
   ...(accepted ? [{...common,id:`${id}-acceptance`,type:'acceptance',title:'Client acceptance - Email',excerpt:'I have reviewed milestone M2, the client portal, and accept the deliverable for billing.',author:`approver@${id}.example`,accepted:true}] : [])
  ].map(e=>({...e,text:e.excerpt}));
  const c = {id,customer,invoiceNumber:`INV-2026-00${index+1}`,amount:1500000,amountMinor:1500000,currency:'USD',project:'Client portal rebuild',milestone,objection:'Please provide the milestone acceptance record before AP can clear this invoice.',authorizedApprovers:[`approver@${id}.example`],recipient:`ap@${id}.example`,status:'new',synthetic:true,evidence,findings:[],draft:null,approval:null,events:[event('created','Synthetic demonstration case loaded')],investigation:null,sendState:null};
  c.contractReview=contractReviewFor(c,evidence[0],evidence[0].text,'Synthetic fixture author');
  return c;
 });
}
export function evaluateEvidence(c) {
 const belongs = e => evidenceMatchesCase(e,c);
 const contracts=c.evidence.filter(e=>belongs(e)&&e.type==='contract');
 const contract=contracts.find(e=>reviewedContract(c,e));
 const deliveries=c.evidence.filter(e=>belongs(e)&&e.type==='delivery');
 const delivery=deliveries.find(e=>sourceReviewed(c,e)&&(e.mode!=='uploaded'||e.review.decision==='delivery'));
 const candidates=c.evidence.filter(e=>belongs(e)&&e.type==='acceptance');
 const acceptance=candidates.find(e=>sourceReviewed(c,e)&&e.accepted===true&&(e.mode!=='uploaded'||e.review.decision==='accepted')&&c.authorizedApprovers.includes(e.author));
 const conflict=candidates.some(e=>sourceReviewed(c,e)&&e.accepted===false&&(e.mode!=='uploaded'||e.review.decision==='rejected'));
 const pendingAcceptance=candidates.some(e=>e.mode==='uploaded'&&!sourceReviewed(c,e));
 return [
  {id:'contract',requirement:'Contract requirement',status:contract?'supported':contracts.length?'unknown':'missing',explanation:contract?'The reviewed billing clause requires delivery and written client acceptance.':contracts.length?'Contract uploaded, but its billing clause needs current human review.':'Contract evidence is missing.',evidenceIds:contract?[contract.id]:[]},
  {id:'delivery',requirement:'Delivery artifact',status:delivery?'supported':deliveries.length?'unknown':'missing',explanation:delivery?'A delivery record exists; it does not establish acceptance.':deliveries.length?'Uploaded delivery evidence needs current human review.':'Delivery evidence is missing.',evidenceIds:delivery?[delivery.id]:[]},
  {id:'acceptance',requirement:'Authorized client acceptance',status:conflict?'conflicting':pendingAcceptance?'unknown':acceptance?'supported':'missing',explanation:conflict?'Acceptance records conflict; internal review is required.':pendingAcceptance?'Uploaded acceptance evidence needs current human review before prior acceptance can be relied on.':acceptance?'Written acceptance matches the configured client approver.':'No qualifying written acceptance by an authorized client approver was found.',evidenceIds:conflict?candidates.filter(e=>sourceReviewed(c,e)).map(e=>e.id):pendingAcceptance?[]:acceptance?[acceptance.id]:[]}
 ];
}
export function validateFindings(c,findings){
 const required=['contract','delivery','acceptance'];
 if(!Array.isArray(findings)||findings.length!==3||new Set(findings.map(f=>f.id)).size!==3||
   findings.some(f=>!required.includes(f.id)||!['supported','missing','unknown','conflicting'].includes(f.status)||!Array.isArray(f.evidenceIds)))
   throw new Error('A complete investigation requires exactly three valid findings.');
 for(const f of findings) for(const id of f.evidenceIds||[]) {
  const e=c.evidence.find(e=>e.id===id);
  if(!e||!evidenceMatchesCase(e,c)||typeof e.text!=='string'||(e.excerpt&&!e.text.includes(e.excerpt))) throw new Error('Invalid or mismatched evidence citation');
 }
 for(const f of findings){
   if(f.status==='supported'&&(!f.evidenceIds.length||!f.evidenceIds.some(id=>c.evidence.find(e=>e.id===id)?.type===f.id)))throw new Error('Supported findings require matching source evidence.');
   for(const citation of f.citations||[]){
     const e=c.evidence.find(e=>e.id===citation.evidenceId);
     if(!e||!f.evidenceIds.includes(e.id)||typeof citation.quote!=='string'||!citation.quote.trim()||!e.text.includes(citation.quote))throw new Error('Invalid exact source quotation.');
   }
 }
}
export function validateInvestigation(c){
 if(!c.investigation?.completedAt||c.investigation.errorCode||!['review_ready','needs_evidence','approved','sent'].includes(c.status)||
   c.investigation.evidenceHash!==investigationHash(c))throw new Error('A successful current investigation is required; investigate again.');
 validateFindings(c,c.findings);
 const policy=evaluateEvidence(c);
 if(c.findings.some(f=>f.status!==policy.find(p=>p.id===f.id)?.status))throw new Error('Findings no longer match current evidence; investigate again.');
}
export const approvalHash=c=>hash({draft:c.draft,evidence:c.evidence,findings:c.findings,contractReview:c.contractReview,investigation:c.investigation});
export function reconcileFindings(policy, model) {
 return policy.map(p=>{
  const m=model.find(m=>m.requirement===p.id);
  if(m?.status===p.status)return {...p,explanation:m.explanation,citations:m.citations};
  return {...p,status:'unknown',explanation:`Human review required: application evidence checks report ${p.status}; model reports ${m?.status||'no finding'}.`,disagreement:{policy:p.status,model:m?.status||'absent'},modelFinding:m||null};
 });
}
export function makeDraft(c){
 const ready=c.findings.length===3&&c.findings.every(f=>f.status==='supported');
 const evidenceLines=c.findings.map(f=>f.requirement+': '+f.evidenceIds.map(id=>{const e=c.evidence.find(e=>e.id===id);const quote=f.id==='contract'?c.contractReview?.quote:e?.review?.quote||f.citations?.find(q=>q.evidenceId===id)?.quote||e?.excerpt;return (e?.title||id)+(quote?' ? '+quote.slice(0,600):'');}).join('; ')).join('\n\n');
 const nextAction={contract:'Open the contract source and review the exact billing clause.',delivery:'Locate a delivery record for this milestone and have it reviewed.',acceptance:'Locate explicit written acceptance from the configured client approver, or resolve conflicting records.'};
 return {to:ready?c.recipient:'project-manager@agency.example',recipient:ready?c.recipient:'project-manager@agency.example',subject:ready?`Reconciliation pack - ${c.invoiceNumber}`:`Evidence review needed - ${c.invoiceNumber}`,body:ready?`Hello,\n\nWe have assembled the milestone delivery and approval records for ${c.invoiceNumber} (${c.milestone}) for your AP team's review.\n\n${evidenceLines}\n\nPlease let us know whether any additional documentation is needed to clear the hold.\n\nThank you.`:`Hello,\n\nBefore we contact the client about ${c.invoiceNumber}, please review the outstanding evidence for ${c.milestone}.\n\n${c.findings.filter(f=>f.status!=='supported').map(f=>f.requirement+': '+f.explanation+' '+nextAction[f.id]).join('\n')}\n\nA delivery record alone is insufficient. Contract terms require review and client acceptance must be separately documented.\n\nThe invoice remains under internal review.\n\nThank you.`,attachments:[]};
}
