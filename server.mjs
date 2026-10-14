import http from 'node:http';
import {readFile} from 'node:fs/promises';
const port=Number(process.env.PORT||4173);
const allowed=new Map([['index.html','text/html; charset=utf-8'],['style.css','text/css; charset=utf-8'],['app.js','text/javascript; charset=utf-8'],['core.js','text/javascript; charset=utf-8'],['sw.js','text/javascript; charset=utf-8'],['manifest.json','application/manifest+json'],['icon.svg','image/svg+xml'],['course.json','application/json; charset=utf-8'],['study-pack.js','text/javascript; charset=utf-8'],['study-pack.enc.json','application/json; charset=utf-8']]);
const server=http.createServer(async(req,res)=>{
 try {
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
  if(!['GET','HEAD'].includes(req.method)||!allowed.has(name)){res.writeHead(404);res.end('Not found');return;}
  const data=await readFile(new URL(name,import.meta.url));
  res.writeHead(200,{'Content-Type':allowed.get(name),'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:data);
 } catch {res.writeHead(400);res.end('Bad request');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port is busy. Stop the existing server or choose a different PORT.':e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`FDE Playbook running at http://127.0.0.1:${port} — Ctrl+C to stop.`));
