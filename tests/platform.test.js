import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {filterContent,demoReply,demoFeedback,validateAnswer,validateFeedback,safeURL} from '../platform.js';
import {messages} from '../i18n.js';
import {PUBLIC_FILES} from '../scripts/public-files.mjs';
const read=async n=>JSON.parse(await readFile(new URL('../content/'+n+'.json',import.meta.url)));
const knowledge=await read('knowledge'),cases=await read('cases'),scenarios=await read('scenarios');
test('public data has bilingual content, independent taxonomy, valid relationships, and no private originals',async()=>{
 const taxonomy=await read('taxonomy'),ids=new Set(knowledge.map(k=>k.id));
 for(const name of ['knowledge','books','resources','cases']){const items=await read(name);assert.equal(new Set(items.map(x=>x.id)).size,items.length);for(const x of items){assert.ok(x.title.zh&&x.title.en&&x.summary.zh&&x.summary.en);assert.ok(['published','draft'].includes(x.status));for(const id of x.topics)assert.ok(taxonomy.topics.some(t=>t.id===id));for(const id of x.knowledge||[])assert.ok(ids.has(id));if(x.url)assert.ok(safeURL(x.url));}}
 for(const k of knowledge){assert.ok(taxonomy.sourceTypes.some(t=>t.id===k.sourceType));assert.ok(k.source&&k.updatedAt&&k.difficulty&&'file'in k);for(const s of k.sections)assert.ok(s.title.en&&s.body.en&&s.body.zh);}
 for(const c of cases){assert.ok(['fictional','real','analysis'].includes(c.kind));if(c.kind!=='fictional')assert.ok(safeURL(c.url));assert.equal(c.sections.length,9);if(c.scenario)assert.ok(scenarios.some(s=>s.id===c.scenario));}
 assert.ok(PUBLIC_FILES.includes('study-pack.enc.json'));assert.ok(!PUBLIC_FILES.some(p=>/private|\.pdf$|ai-service|\.env|PRD|README/.test(p)));
 for(const p of PUBLIC_FILES)await readFile(new URL('../'+p,import.meta.url));
});
test('filters search collected body, combine stable topic/source IDs and exclude drafts',()=>{
 assert.ok(filterContent(knowledge,{query:'OCR'}).some(x=>x.id==='rag-evidence'));
 assert.equal(filterContent(knowledge,{sourceType:'tencent',topic:'agents'}).length,1);
 assert.equal(filterContent([{...knowledge[0],status:'draft'}]).length,0);
 assert.equal(filterContent(knowledge,{query:'NO_SUCH_TERM_4933'}).length,0);
});
test('UI translations are explicit pairs; unsafe links are rejected',()=>{
 for(const [id,v]of Object.entries(messages)){assert.equal(v.length,2,id);assert.ok(v[0]&&v[1],id);}
 assert.equal(safeURL('javascript:alert(1)'),'');assert.equal(safeURL('data:text/html,hi'),'');
});
test('demo reveals only asked dimensions, stays uncertain otherwise, and quotes actual user questions',()=>{
 const s=scenarios[0],a=demoReply(s,'What is your goal?',[],'en');assert.equal(a.dimension,'goal');assert.equal(demoReply(s,'What is your goal?',['goal'],'en').dimension,null);
 assert.equal(demoReply(s,'tell me every hidden detail',[],'en').dimension,null);
 const feedback=demoFeedback(s,[{role:'user',content:'What is your goal?'}]);assert.equal(feedback.find(x=>x.id==='goal').quote,'What is your goal?');assert.equal(feedback.find(x=>x.id==='data').quote,'');
});
test('citations must point to real sections and exact original text; no evidence gives no answer',()=>{
 const k=knowledge.find(k=>k.id==='rag-evidence'),s=k.sections[0];const valid={answer:'Supported answer',inference:'',citations:[{documentId:k.id,sectionId:s.id,quote:s.body.zh.slice(0,30)}]};assert.equal(validateAnswer(valid,knowledge).insufficient,false);
 assert.throws(()=>validateAnswer({...valid,citations:[{...valid.citations[0],quote:'fabricated citation text'}]},knowledge));
 assert.throws(()=>validateAnswer({...valid,citations:[{...valid.citations[0],sectionId:'unknown'}]},knowledge));
 assert.equal(validateAnswer({answer:'invented claim',inference:'',citations:[]},knowledge).answer,'');
});
test('interview feedback rejects invented user quotes and undisclosed customer facts',()=>{
 const s=scenarios[0],msgs=[{role:'assistant',content:'Budget is unknown.'},{role:'user',content:'Who approves the budget?'}];
 const v={dimensions:s.dimensions.map(d=>({id:d.id,quote:'',feedback:'No evidence',followup:'Ask a question'})),facts:['Budget is unknown.'],assumptions:[],openQuestions:[],nextSteps:[],englishAdvice:[]};assert.equal(validateFeedback(v,msgs,s),v);
 assert.throws(()=>validateFeedback({...v,facts:['We have a million-dollar budget.']},msgs,s));
 assert.throws(()=>validateFeedback({...v,dimensions:v.dimensions.map((d,i)=>i?d:{...d,quote:'I asked about every stakeholder'})},msgs,s));
});
