import {localized} from './i18n.js';
export const safeURL = value => { try {const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';} };
export function filterContent(items,{query='',topic='',sourceType='',category='',industry='',stage='',tag='',kind=''}={}) {
 const q=query.trim().toLocaleLowerCase();
 return items.filter(x=>(x.status==='published'||(x.status==='private'&&x.local===true))&&(!topic||x.topics?.includes(topic))&&(!sourceType||x.sourceType===sourceType)&&(!category||x.category===category)&&(!industry||x.industry===industry)&&(!stage||x.stage===stage)&&(!tag||x.tags?.includes(tag))&&(!kind||x.kind===kind)&&(!q||JSON.stringify([x.title,x.summary,x.tags,x.sections,x.problem,x.author]).toLocaleLowerCase().includes(q)));
}
export function demoReply(scenario, message, revealed, lang){
 const matched=scenario.dimensions.filter(d=>new RegExp(d.pattern,'i').test(message));
 const next=matched.find(d=>!revealed.includes(d.id));
 return next?{content:localized(next.reply,lang),dimension:next.id}:{content:localized(scenario.fallback,lang),dimension:null};
}
export function demoFeedback(scenario,messages){
 const users=messages.filter(m=>m.role==='user');
 return scenario.dimensions.map(d=>({id:d.id,quote:users.find(m=>new RegExp(d.pattern,'i').test(m.content))?.content||''}));
}
// Reject model-created references and feedback quotations that cannot be checked.
export function validateAnswer(answer,knowledge){
 if(!answer||typeof answer.answer!=='string'||typeof answer.inference!=='string'||!Array.isArray(answer.citations))throw Error('invalid_model_output');
 if(answer.answer.length>8000||answer.inference.length>4000||answer.citations.length>8)throw Error('invalid_model_output');
 for(const c of answer.citations){
  const doc=knowledge.find(d=>d.id===c.documentId&&d.status==='published');const section=doc?.sections?.find(s=>s.id===c.sectionId);
  if(!section||typeof c.quote!=='string'||c.quote.length<6||c.quote.length>2000||!Object.values(section.body).some(body=>body.includes(c.quote)))throw Error('invalid_citation');
 }
 if(!answer.citations.length)return {answer:'',inference:'',citations:[],insufficient:true};
 return {...answer,insufficient:false};
}
export function validateFeedback(value,messages,scenario){
 if(!value||!Array.isArray(value.dimensions)||value.dimensions.length!==scenario.dimensions.length)throw Error('invalid_feedback');
 const users=messages.filter(m=>m.role==='user').map(m=>m.content),customers=messages.filter(m=>m.role==='assistant').map(m=>m.content);
 const ids=new Set();
 for(const d of value.dimensions){
  if(!scenario.dimensions.some(s=>s.id===d.id)||ids.has(d.id)||typeof d.quote!=='string'||(d.quote&&!users.some(m=>m.includes(d.quote)))||typeof d.feedback!=='string'||typeof d.followup!=='string')throw Error('invalid_feedback');ids.add(d.id);
 }
 for(const key of ['facts','assumptions','openQuestions','nextSteps','englishAdvice'])if(!Array.isArray(value[key])||value[key].some(s=>typeof s!=='string'||s.length>2500)||value[key].length>10)throw Error('invalid_feedback');
 // Confirmed facts must be exact statements actually revealed by the customer.
 if(value.facts.some(f=>!customers.some(m=>m.includes(f))))throw Error('invalid_feedback');
 return value;
}
