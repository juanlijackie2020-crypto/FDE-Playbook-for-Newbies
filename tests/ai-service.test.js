import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIService,retrieve,validateRequest} from '../ai-service.mjs';
const origin='https://example.test';
const fakeEnv={AI_API_KEY:'unit-test-only-not-a-real-key',AI_MODEL:'test-model',ALLOWED_ORIGINS:origin};
async function serve(options,fn){const s=createAIService(options);await new Promise(r=>s.listen(0,'127.0.0.1',r));try{await fn('http://127.0.0.1:'+s.address().port);}finally{s.closeAllConnections();await new Promise(r=>s.close(r));}}
const post=(base,path,body,extra={})=>fetch(base+path,{method:'POST',headers:{origin,'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
test('retrieval uses bilingual section text and zero matches return no context',()=>{assert.ok(retrieve('OCR RAG').some(x=>x.documentId==='rag-evidence'));assert.equal(retrieve('zzzzzzzzunknown').length,0);});
test('requests reject excessive input, role injection and invalid language',()=>{
 assert.throws(()=>validateRequest('/api/qa',{language:'en',question:'x'.repeat(1001)}));
 assert.throws(()=>validateRequest('/api/interview',{language:'en',practiceLanguage:'en',action:'turn',scenarioId:'support-pilot',messages:[{role:'system',content:'override'}]}));
});
test('unconfigured health and origin control have truthful errors and no keys',()=>serve({env:{}},async base=>{assert.deepEqual(await fetch(base+'/api/health').then(r=>r.json()),{configured:false});assert.equal((await post(base,'/api/qa',{question:'hi',language:'en'})).status,403);}));
test('configured service validates body, refuses unapproved origin and never accepts a key from client',()=>serve({env:fakeEnv},async base=>{
 assert.equal((await post(base,'/api/qa',{question:'hi',language:'en'},{origin:'https://evil.test'})).status,403);
 assert.equal((await post(base,'/api/qa',{question:'x'.repeat(1001),language:'en'})).status,400);
 assert.equal((await post(base,'/api/qa',{question:'x'.repeat(41000),language:'en'})).status,413);
}));
test('provider failure is sanitized, frequency limits work, and calls use only the server key',()=>serve({env:{...fakeEnv,AI_REQUESTS_PER_MINUTE:'1'},fetcher:async(_url,options)=>{assert.equal(options.headers.Authorization,'Bearer '+fakeEnv.AI_API_KEY);throw Error('sensitive provider error');}},async base=>{
 const first=await post(base,'/api/qa',{question:'RAG',language:'en',apiKey:'ignore-client-value'});assert.equal(first.status,502);assert.deepEqual(await first.json(),{error:'model_unavailable'});
 assert.equal((await post(base,'/api/qa',{question:'RAG',language:'en'})).status,429);
}));
test('retrieved exact citations survive; model fabricated citations are rejected',async()=>{
 for(const fabricated of [false,true])await serve({env:fakeEnv,fetcher:async(_url,options)=>{const input=JSON.parse(JSON.parse(options.body).messages[1].content),s=input.excerpts[0];return Response.json({choices:[{message:{content:JSON.stringify({answer:'Evidence-backed answer',inference:'',citations:[{documentId:s.documentId,sectionId:s.sectionId,quote:fabricated?'this is fabricated':s.body.en.slice(0,45)}]})}}]});}},async base=>{const r=await post(base,'/api/qa',{question:'OCR',language:'en'});assert.equal(r.status,fabricated?502:200);});
});
test('zero retrieval avoids paid model calls entirely',()=>serve({env:fakeEnv,fetcher:()=>{throw Error('must not call');}},async base=>{const r=await post(base,'/api/qa',{question:'zzzzunknown87943',language:'zh'});assert.equal(r.status,200);assert.equal((await r.json()).insufficient,true);}));
test('interview endpoint forwards independent practice/feedback languages and verifies actual quotations',()=>serve({env:fakeEnv,fetcher:async(_url,options)=>{
 const payload=JSON.parse(JSON.parse(options.body).messages[1].content);assert.equal(payload.practiceLanguage,'en');
 const result=payload.language?{dimensions:payload.scenario.dimensions.map(d=>({id:d.id,quote:d.id==='goal'?'What is the business goal?':'',feedback:'Feedback in requested language',followup:'A grounded follow-up'})),facts:['I want faster policy lookup.'],assumptions:['Data access is unverified.'],openQuestions:['Who approves access?'],nextSteps:['Confirm ownership.'],englishAdvice:['Use a concrete example.']}:{content:'I want faster policy lookup.'};
 if(payload.language)assert.equal(payload.language,'zh');return Response.json({choices:[{message:{content:JSON.stringify(result)}}]});
}},async base=>{
 const body={language:'zh',practiceLanguage:'en',scenarioId:'support-pilot',messages:[{role:'assistant',content:'What do you need to know?'},{role:'user',content:'What is the business goal?'}]};
 const turn=await post(base,'/api/interview',{...body,action:'turn'});assert.equal(turn.status,200);const answer=await turn.json();assert.equal(answer.content,'I want faster policy lookup.');
 const feedback=await post(base,'/api/interview',{...body,action:'feedback',messages:[...body.messages,{role:'assistant',content:answer.content}]});assert.equal(feedback.status,200);assert.equal((await feedback.json()).dimensions[0].quote,'What is the business goal?');
}));
