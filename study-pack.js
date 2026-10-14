import {validateQuestion,CASE_FIELDS} from './core.js';
export async function derivePDFKey(fileList){
  const ordered=new Map();
  for(const f of fileList){const m=f.name.match(/^CHAPTER\s+0?([1-4])(?:\b|\s)/i);if(!m||ordered.has(Number(m[1])))throw Error('请一次选择原始 CHAPTER 01、02、03、04 四份 PDF，不能重复章节');ordered.set(Number(m[1]),f);}
  if(ordered.size!==4)throw Error('解锁需要完全相同的四份原始 PDF');
  const prefix=new TextEncoder().encode('FDE-STUDY-PACK-v1\0');
  const material=new Uint8Array(prefix.length+128);material.set(prefix);
  for(let ch=1;ch<=4;ch++){const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',await ordered.get(ch).arrayBuffer()));material.set(hash,prefix.length+(ch-1)*32);}
  return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',material),'AES-GCM',false,['decrypt']);
}
export async function decryptStudyPack(envelope,key){
  if(envelope?.format!=='fde-encrypted-study-pack'||envelope.version!==1||typeof envelope.iv!=='string'||typeof envelope.ciphertext!=='string')throw Error('加密学习包格式无效');
  const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  try{const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(envelope.iv)},key,decode(envelope.ciphertext));return JSON.parse(new TextDecoder().decode(plaintext));}
  catch{throw Error('解锁失败：四份 PDF 与原件不完全相同，或学习包损坏。请勿重新打印或编辑 PDF 后再解锁。');}
}
export async function materializeStudySources(pack,localSources){
  if(!Array.isArray(pack?.sources))throw Error('学习包资料缺失');
  const additions=[];
  for(const source of pack.sources){
    if(localSources.some(s=>s.digest===source.digest))continue;
    if(!source.embeddedPDF)continue;
    if(typeof source.embeddedPDF!=='string'||source.embeddedPDF.length>30*1024*1024)throw Error('内嵌 PDF 无效或过大');
    let data;try{data=Uint8Array.from(atob(source.embeddedPDF),c=>c.charCodeAt(0));}catch{throw Error('内嵌 PDF 编码无效');}
    if(new TextDecoder().decode(data.slice(0,5))!=='%PDF-')throw Error('内嵌资料不是 PDF');
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(b=>b.toString(16).padStart(2,'0')).join('');
    if(digest!==source.digest)throw Error('内嵌 PDF 完整性校验失败');
    additions.push({meta:{id:crypto.randomUUID(),title:source.title,ext:'pdf',size:data.length,digest,topic:source.topic,importedAt:Date.now(),rights:source.rights},blob:new Blob([data],{type:'application/pdf'})});
  }
  return additions;
}
export function prepareStudyPack(pack, localSources) {
  if(pack?.format!=='fde-study-pack'||pack.version!==1||!Array.isArray(pack.sources)||!Array.isArray(pack.questions)||!Array.isArray(pack.cases)||!pack.notes)throw Error('学习包格式无效');
  const map=new Map(),updates=[];
  for(const s of pack.sources){
    if(typeof s.id!=='string'||map.has(s.id)||typeof s.digest!=='string'||!/^[a-f0-9]{64}$/.test(s.digest)||typeof s.text!=='string'||!Number.isInteger(s.pages)||s.pages<1)throw Error('学习包资料信息无效');
    const local=localSources.find(x=>x.digest===s.digest&&x.ext==='pdf');
    if(!local)throw Error('请先导入完全相同的 PDF：'+s.title);
    map.set(s.id,local.id);updates.push({id:local.id,chapter:s.chapter,courseId:s.sourceKind==='mock-reference'?null:4742,sourceKind:s.sourceKind,text:s.text,pages:s.pages,thinPages:s.thinPages||[],topic:s.topic,rights:s.rights});
  }
  const ids=pack.sources.map(s=>s.id),seen=new Set();
  const questions=pack.questions.map(q=>{
    validateQuestion(q,ids);
    if(typeof q.id!=='string'||!q.id||seen.has(q.id)||!['generated','reference'].includes(q.origin)||q.status!=='pending'||typeof q.evidence!=='string'||!q.evidence.trim())throw Error('学习包题目必须是带依据的唯一待审校题目');
    seen.add(q.id);const source=pack.sources.find(s=>s.id===q.sourceId);
    if(!Number.isInteger(q.pdfPage)||q.pdfPage<1||q.pdfPage>source.pages)throw Error('题目 PDF 页码无效');
    return {...q,sourceId:map.get(q.sourceId)};
  });
  const cases=pack.cases.map(c=>{if(typeof c.id!=='string'||typeof c.title!=='string'||!c.fields||CASE_FIELDS.some(f=>typeof c.fields[f]!=='string'))throw Error('学习包案例格式无效');return c;});
  const notes=Object.fromEntries(Object.entries(pack.notes).map(([id,text])=>{if(!map.has(id)||typeof text!=='string')throw Error('学习包索引无效');return [map.get(id),text];}));
  return {updates,questions,cases,notes};
}
