import PDFDocument from 'pdfkit';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {validateCurrentInvestigation} from './investigation-validation.js';

const require=createRequire(import.meta.url);
const fonts=join(dirname(require.resolve('pdfjs-dist/package.json')),'standard_fonts');

/** Text-based PDF; no browser, remote renderer, HTML execution or paid service. */
export async function renderEvidencePdf(c,baseUrl='http://localhost:3000'){
 validateCurrentInvestigation(c);
 const doc=new PDFDocument({size:'A4',margin:48,compress:true,info:{Title:'Ledgerly evidence pack - '+c.invoiceNumber,Author:'Ledgerly',Subject:'Invoice reconciliation evidence snapshot'}});
 const chunks=[];
 const complete=new Promise((resolve,reject)=>{doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 doc.registerFont('Body',join(fonts,'LiberationSans-Regular.ttf'));
 doc.registerFont('Bold',join(fonts,'LiberationSans-Bold.ttf'));
 const text=(value,size=10,color='#273049')=>{doc.font('Body').fontSize(size).fillColor(color).text(String(value??'').replace(/\r\n?/g,'\n'),{lineGap:3});doc.moveDown(.4);};
 const heading=(value,reserve=110)=>{if(doc.y>doc.page.height-reserve)doc.addPage();doc.moveDown(.6);doc.font('Bold').fontSize(15).fillColor('#3438a0').text(value);doc.moveDown(.5);};
 const link=(label,url)=>{doc.font('Body').fontSize(9).fillColor('#394fbd').text(label,{link:url,underline:true});doc.moveDown(.5);};
 try{
  doc.font('Bold').fontSize(25).fillColor('#232943').text('Ledgerly');
  text('RECONCILIATION EVIDENCE PACK',11,'#585db8');
  text(c.invoiceNumber+' | '+c.customer,13);
  text(c.project+' | '+c.milestone);
  text('Invoice value: '+c.currency+' '+((c.amountMinor??c.amount)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' (not recovered cash)');
  text('Origin: '+(c.synthetic?'Synthetic test records':'Consented upload (declared)'));
  text('Investigation: '+c.investigation.mode+' | Workflow: '+c.status);
  text('Snapshot generated: '+new Date().toISOString(),9);
  text('This PDF is not proof of payment. It is not automatically attached to email. Sender and reviewer identity declarations are not independently verified.',9);
  heading('Findings and outstanding evidence');
  for(const f of c.findings){
   doc.font('Bold').fontSize(11).fillColor('#232943').text(f.requirement+' - '+f.status.toUpperCase());doc.moveDown(.3);
   text(f.explanation);
   for(const q of f.citations||[]){text('Exact citation ['+q.evidenceId+']:',9,'#586078');text(q.quote,10);}
   text('Source references: '+(f.evidenceIds.join(', ')||'No supporting source'),8,'#586078');
  }
  heading('Reviewed billing clause');
  text('Reviewer: '+(c.contractReview?.reviewer||'Not reviewed')+' | '+(c.contractReview?.reviewedAt||''));
  text(c.contractReview?.quote||'No current reviewed clause');
  heading('Current correspondence and approval',220);
  text('To: '+(c.draft?.to||'No draft'));
  text('Subject: '+(c.draft?.subject||''));
  text(c.draft?.body||'No correspondence prepared');
  text('Exact-message approval: '+(c.approval?.approvedAt||'Not approved'));
  text('Email delivery: '+(c.delivery?.at||'Not sent')+' (test inbox only)');
  heading('Source records');
  for(const e of c.evidence){
   if(doc.y>doc.page.height-160)doc.addPage();
   doc.font('Bold').fontSize(12).fillColor('#232943').text(e.title||e.id);doc.moveDown(.3);
   text('ID: '+e.id,8);
   text('Type: '+e.type+' | Mode: '+e.mode+' | Page: '+(e.page||'Not paginated'),9);
   text('Declared author: '+(e.author||'Not supplied')+' | Source date: '+(e.timestamp||e.fetchedAt||'Not supplied'),9);
   text('Version: '+(e.version||'Not supplied'),8);
   if(e.review){text('Source review: '+e.review.reviewer+' | '+e.review.decision+' | '+e.review.reviewedAt,9);text('Reviewed quote: '+e.review.quote,9);}
   text(e.text||e.excerpt||'');
   if(e.originalText&&e.originalText!==e.text){text('Original uploaded text and headers:',9,'#586078');text(e.originalText,9);}
   if(/^https:\/\//.test(e.url||''))link('Open original source',e.url);
   if(e.documentId&&c.documents?.some(d=>d.id===e.documentId)){
    const url=new URL('/api/cases/'+encodeURIComponent(c.id)+'/documents/'+encodeURIComponent(e.documentId)+'#page='+(Number(e.page)||1),baseUrl).href;
    link('Open original PDF page (requires local Ledgerly)',url);
   }
  }
  heading('Case activity');
  for(const e of c.events)text(e.at+' | '+e.type+' | '+e.message,9);
  doc.end();
  return await complete;
 }catch(error){doc.destroy();throw error;}
}
