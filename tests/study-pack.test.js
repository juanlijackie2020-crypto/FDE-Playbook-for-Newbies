import test from 'node:test';
import assert from 'node:assert/strict';
import {derivePDFKey,decryptStudyPack,prepareStudyPack} from '../study-pack.js';
import {DEMOS,CASE_FIELDS} from '../core.js';
test('private study pack resolves file digests to local IDs without trusting old IDs',()=>{
 const digest='a'.repeat(64),source={id:'source',digest,text:'PDF text',pages:10,chapter:1};
 const q={...DEMOS[0],id:'new-q',origin:'generated',status:'pending',sourceId:'source',pdfPage:3,evidence:'PDF',locator:'PDF 第 3 页'};
 const c={id:'c',title:'case',fields:Object.fromEntries(CASE_FIELDS.map(f=>[f,'待补充']))};
 const pack={format:'fde-study-pack',version:1,sources:[source],questions:[q],cases:[c],notes:{source:'note'}};
 assert.throws(()=>prepareStudyPack(pack,[]),/先导入/);
 const ready=prepareStudyPack(pack,[{id:'local',digest,ext:'pdf'}]);
 assert.equal(ready.questions[0].sourceId,'local');assert.equal(ready.notes.local,'note');
 assert.throws(()=>prepareStudyPack({...pack,questions:[{...q,status:'reviewed'}]},[{id:'local',digest,ext:'pdf'}]),/待审校/);
 assert.throws(()=>prepareStudyPack({...pack,questions:[{...q,pdfPage:100}]},[{id:'local',digest,ext:'pdf'}]),/页码/);
});
test('PDF key derivation enforces four chapters, decrypts authentic AES-GCM and rejects changed files',async()=>{
 const files=[1,2,3,4].map(ch=>new File([`synthetic-${ch}`],`CHAPTER 0${ch}.pdf`));
 await assert.rejects(derivePDFKey(files.slice(0,3)),/四份/);
 const key=await derivePDFKey(files);
 const prefix=new TextEncoder().encode('FDE-STUDY-PACK-v1\0'),material=new Uint8Array(prefix.length+128);material.set(prefix);
 for(let i=0;i<4;i++)material.set(new Uint8Array(await crypto.subtle.digest('SHA-256',await files[i].arrayBuffer())),prefix.length+i*32);
 const encoder=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',material),'AES-GCM',false,['encrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12)),data=await crypto.subtle.encrypt({name:'AES-GCM',iv},encoder,new TextEncoder().encode('{"private":"text"}'));
 const envelope={format:'fde-encrypted-study-pack',version:1,iv:Buffer.from(iv).toString('base64'),ciphertext:Buffer.from(data).toString('base64')};
 assert.deepEqual(await decryptStudyPack(envelope,key),{private:'text'});
 files[3]=new File(['changed'],'CHAPTER 04.pdf');
 await assert.rejects(decryptStudyPack(envelope,await derivePDFKey(files)),/解锁失败/);
});
