import {seedCases,sourceReviewFor,contractReviewFor} from './domain.js';
import {parseSource} from './pilot.js';
const fixture=(id,mutate,acceptance='supported',expectedContractQuote)=>{
 const input=seedCases()[0];mutate(input);
 const expected={contract:'supported',delivery:'supported',acceptance};
 return {id,split:'readiness-regression',input,expected,expectedReady:Object.values(expected).every(s=>s==='supported'),expectedContractQuote};
};
const upload=(c,content,author=c.authorizedApprovers[0])=>{
 const e=parseSource({filename:'followup.txt',content,kind:'acceptance',author},c);c.evidence.push(e);return e;
};
const billing='Milestone M2 is billable only after portal delivery and written client acceptance.';
export const readinessCases=[
 fixture('25-pending-withdrawal',c=>upload(c,'I withdraw acceptance of milestone M2. It is rejected.'),'unknown'),
 fixture('26-reviewed-withdrawal',c=>{
  const e=upload(c,'I withdraw acceptance of milestone M2. It is rejected.');
  e.review=sourceReviewFor(c,e,{quote:e.text,reviewer:'Synthetic regression reviewer',decision:'rejected'});e.accepted=false;
 },'conflicting'),
 fixture('27-dismissed-followup',c=>{
  const e=upload(c,'Automated reminder: acceptance is required. This is not a client response.','robot@agency.example');
  e.review=sourceReviewFor(c,e,{quote:e.text,reviewer:'Synthetic regression reviewer',decision:'not_acceptance'});
 }),
 fixture('28-heading-citation',c=>{
  const e=c.evidence.find(e=>e.type==='contract');
  e.id='d591b5f5-f275-4680-9511-f6c945a0a628-p1';
  e.text=e.excerpt='Synthetic pilot contract\nInvoice INV-2026-001\n'+billing;
  e.mode='uploaded';e.version='synthetic-readiness-28';
  c.contractReview=contractReviewFor(c,e,billing,'Synthetic regression reviewer');
 },'supported',billing),
];
