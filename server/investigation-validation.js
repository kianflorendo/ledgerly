import {validateInvestigation} from './domain.js';
import {validateAgentFindings} from './agent.js';

export function validateCurrentInvestigation(c){
 validateInvestigation(c);
 if(c.investigation.mode==='ollama'){
  try{
   // The investigation hash binds this exact source snapshot. Recheck persisted
   // output under today's citation rules before approval, delivery or export.
   const sourceIds=new Set(c.evidence.map(source=>source.id));
   validateAgentFindings({summary:c.investigation.summary,findings:c.investigation.modelFindings},c,c.evidence,sourceIds);
   validateAgentFindings({summary:c.investigation.summary,findings:c.findings.map(f=>({...f,requirement:f.id}))},c,c.evidence,sourceIds);
  }catch(error){throw new Error('Saved model findings require current citation validation; investigate again. '+error.message);}
 }
}
