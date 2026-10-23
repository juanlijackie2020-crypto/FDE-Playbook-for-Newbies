import {mkdir,copyFile,writeFile,rm,readFile} from 'node:fs/promises';
import {PUBLIC_FILES} from './public-files.mjs';
await rm(new URL('../_site/',import.meta.url),{recursive:true,force:true});
for(const file of PUBLIC_FILES){const dest=new URL('../_site/'+file,import.meta.url);await mkdir(new URL('.',dest),{recursive:true});if(/^content\/(knowledge|books|resources|cases)\.json$/.test(file)){const data=JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));await writeFile(dest,JSON.stringify(data.filter(x=>x.status==='published'),null,2)+'\n');}else await copyFile(new URL('../'+file,import.meta.url),dest);}
await writeFile(new URL('../_site/.nojekyll',import.meta.url),'');
console.log(`Prepared ${PUBLIC_FILES.length} explicit public assets. Private files and AI service excluded.`);
