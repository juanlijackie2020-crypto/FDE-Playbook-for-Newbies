import {freshState,validateQuestion,CASE_FIELDS} from './core.js';
import {derivePDFKey,decryptStudyPack,materializeStudySources,prepareStudyPack} from './study-pack.js';
const KEY='fde-state-v1';
export let storageBroken=false;
export let state;
try{state=JSON.parse(localStorage.getItem(KEY))||freshState();for(const k of ['sources','questions','attempts','cases'])if(!Array.isArray(state[k]))throw Error();if(!state.notes||!state.tasks)throw Error();}catch{state=freshState();storageBroken=true;}
export function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));storageBroken=false;}catch{storageBroken=true;throw Error('storageError');}}
const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('fde-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}).catch(()=>null);
export async function fileOp(op,id,blob){if(!db)throw Error('storageError');return new Promise((resolve,reject)=>{const tx=db.transaction('files',op==='get'?'readonly':'readwrite'),s=tx.objectStore('files'),r=op==='get'?s.get(id):op==='put'?s.put(blob,id):s.delete(id);tx.oncomplete=()=>resolve(r.result);tx.onerror=tx.onabort=()=>reject(Error('storageError'));});}
const hash=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(b=>b.toString(16).padStart(2,'0')).join('');
export async function importFiles(list){
 for(const f of list){const ext=f.name.split('.').pop().toLowerCase();if(!['pdf','txt','md','mp4','webm','ogg'].includes(ext)||f.size>30*1024*1024)throw Error('fileLimit');const bytes=await f.arrayBuffer(),digest=await hash(bytes);if(state.sources.some(s=>s.digest===digest))continue;
 const id=crypto.randomUUID();await fileOp('put',id,new Blob([bytes],{type:{pdf:'application/pdf',txt:'text/plain',md:'text/plain',mp4:'video/mp4',webm:'video/webm',ogg:'video/ogg'}[ext]}));
 state.sources.push({id,title:f.name,ext,size:f.size,digest,topic:'FDE 基础',sourceType:'personal',topics:['foundations'],tags:[],difficulty:'beginner',status:'private',sourceLanguage:'unknown',updatedAt:new Date().toISOString().slice(0,10),rights:'private',importedAt:Date.now(),text:['txt','md'].includes(ext)?await f.text():''});
 try{persist();}catch(e){state.sources.pop();await fileOp('delete',id);throw e;}
 }
}
export async function importPack(pack){
 const additions=await materializeStudySources(pack,state.sources),next=structuredClone(state);next.sources.push(...additions.map(a=>a.meta));const p=prepareStudyPack(pack,next.sources);
 for(const u of p.updates)Object.assign(next.sources.find(s=>s.id===u.id),u);
 for(const q of p.questions)if(!next.questions.some(x=>x.id===q.id))next.questions.push(q);
 for(const c of p.cases)if(!next.cases.some(x=>x.id===c.id))next.cases.push(c);
 for(const [id,note] of Object.entries(p.notes))if(!next.notes[id])next.notes[id]=note;
 next.studyEdition=pack.edition;const previous=state,stored=[];
 try{for(const a of additions){await fileOp('put',a.meta.id,a.blob);stored.push(a.meta.id);}state=next;persist();}catch(e){state=previous;for(const id of stored)await fileOp('delete',id);throw e;}
}
export async function unlock(list){try{const key=await derivePDFKey(list);let r;try{r=await fetch('./study-pack.enc.json?edition=mock-style-2026-10-14',{cache:'no-store'});if(!r.ok)throw Error();}catch{r=await fetch('./study-pack.enc.json');}const pack=await decryptStudyPack(await r.json(),key);await importFiles(list);await importPack(pack);}catch(e){if(e.message==='storageError')throw e;throw Error('unlockError');}}
export async function updatePack(){const list=[];for(let chapter=1;chapter<=4;chapter++){const s=state.sources.find(x=>x.courseId===4742&&x.chapter===chapter),b=s&&await fileOp('get',s.id);if(!b)throw Error('missingPDF');list.push(new File([b],`CHAPTER 0${chapter}.pdf`,{type:'application/pdf'}));}await unlock(list);}
export function importQuestions(data){try{if(!Array.isArray(data.questions)||data.questions.length>5000)throw Error();const seen=new Set(state.questions.map(q=>q.id));for(const q of data.questions){validateQuestion(q,state.sources.map(s=>s.id));if(typeof q.id!=='string'||!q.id||seen.has(q.id))throw Error();seen.add(q.id);}state.questions.push(...data.questions);persist();}catch(e){throw Error(e.message==='storageError'?'storageError':'invalidQuestions');}}
export async function createBackup(){const files=[];for(const s of state.sources){const blob=await fileOp('get',s.id);if(!blob)throw Error('fileMissing');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});files.push({id:s.id,data});}return {format:'fde-backup',version:1,state,files};}
export async function restoreBackup(b){
 let next,decoded=[];
 try{if(b?.format!=='fde-backup'||b.version!==1||b.state?.version!==1||!Array.isArray(b.files))throw Error();next=b.state;
 for(const key of ['sources','questions','attempts','cases'])if(!Array.isArray(next[key]))throw Error();if(!next.notes||typeof next.notes!=='object'||!next.tasks||typeof next.tasks!=='object')throw Error();
 const ids=next.sources.map(s=>s.id);if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw Error();
 for(const q of next.questions)validateQuestion(q,ids);if(new Set(next.questions.map(q=>q.id)).size!==next.questions.length)throw Error();
 for(const c of next.cases)if(typeof c.id!=='string'||typeof c.title!=='string'||!c.fields||typeof c.fields!=='object')throw Error();
 if(next.exam){const e=next.exam;if(!Array.isArray(e.questions)||e.questions.length!==(e.mode==='mini'?15:60)||!Number.isFinite(e.deadline)||!Number.isInteger(e.index)||e.index<0||e.index>=e.questions.length||!e.answers||!Array.isArray(e.flags))throw Error();for(const q of e.questions)validateQuestion(q,ids);}
 for(const s of next.sources){if(typeof s.title!=='string'||!['pdf','txt','md','mp4','webm','ogg'].includes(s.ext))throw Error();const f=b.files.find(x=>x.id===s.id);if(typeof f?.data!=='string'||!/^data:[^,]*;base64,/.test(f.data))throw Error();const blob=await (await fetch(f.data)).blob();if(await hash(await blob.arrayBuffer())!==s.digest)throw Error();decoded.push({id:s.id,blob});}
 }catch{throw Error('invalidBackup');}
 const previous=state,old=new Map();for(const f of decoded)old.set(f.id,await fileOp('get',f.id));
 try{for(const f of decoded)await fileOp('put',f.id,f.blob);state=next;persist();}
 catch(e){state=previous;for(const [id,b] of old){if(b)await fileOp('put',id,b);else await fileOp('delete',id);}throw e;}
 for(const s of previous.sources)if(!next.sources.some(x=>x.id===s.id))await fileOp('delete',s.id);
}
export function caseMarkdown(c){return `# ${c.title}\n\n${c.kind||''}\n${c.source||''}\n\n`+Object.entries(c.fields||{}).map(([k,v])=>`## ${k}\n\n${v||''}`).join('\n\n');}
export {CASE_FIELDS};
