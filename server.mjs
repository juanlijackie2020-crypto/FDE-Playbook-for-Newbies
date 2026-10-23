import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {PUBLIC_FILES} from './scripts/public-files.mjs';
const allowed=new Set(PUBLIC_FILES),types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',svg:'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';if(!['GET','HEAD'].includes(req.method)||!allowed.has(name)){res.writeHead(404);res.end('Not found');return;}const data=await readFile(new URL(name,import.meta.url));res.writeHead(200,{'Content-Type':types[name.split('.').at(-1)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(400);res.end('Bad request');}});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port busy. Choose another PORT.':e.message);process.exitCode=1;});server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('FDE Playbook preview server ready.'));
