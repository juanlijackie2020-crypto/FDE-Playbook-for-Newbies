import {readFile,writeFile} from 'node:fs/promises';
import {createHash,createCipheriv,randomBytes} from 'node:crypto';
const root=new URL('../',import.meta.url),privateRoot=new URL('private/official-materials/',root);
const manifest=JSON.parse(await readFile(new URL('manifest.json',privateRoot),'utf8')).sort((a,b)=>a.chapter-b.chapter);
if(manifest.length!==4)throw Error('Expected four original chapters');
const hashes=[];
for(const m of manifest){const bytes=await readFile(new URL(m.filename,privateRoot));const hash=createHash('sha256').update(bytes).digest();if(hash.toString('hex')!==m.sha256)throw Error('PDF integrity mismatch');hashes.push(hash);}
const key=createHash('sha256').update(Buffer.concat([Buffer.from('FDE-STUDY-PACK-v1\0'),...hashes])).digest();
const plaintext=await readFile(new URL('study-pack.json',privateRoot));
const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
const encrypted=Buffer.concat([cipher.update(plaintext),cipher.final(),cipher.getAuthTag()]);
await writeFile(new URL('study-pack.enc.json',root),JSON.stringify({format:'fde-encrypted-study-pack',version:1,iv:iv.toString('base64'),ciphertext:encrypted.toString('base64')}));
console.log('Encrypted private pack created. Key and PDF digests were not written into public files.');
