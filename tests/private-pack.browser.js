import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const root=process.env.FDE_PRIVATE_DIR;
if(!root)throw Error('Set FDE_PRIVATE_DIR to a local private material directory; no course files are bundled with tests.');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const payloads=await Promise.all(manifest.map(async m=>({name:m.originalName,mimeType:'application/pdf',buffer:await readFile(path.join(root,m.filename))})));
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const ctx=await browser.newContext(),page=await ctx.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
try{
 await page.goto('http://127.0.0.1:4173/#course');
 await page.getByRole('button',{name:'选择原四份 PDF，解锁学习包'}).waitFor();
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 await page.locator('#unlock-pdfs').setInputFiles(payloads);
 await page.getByText(/学习包已导入：98 道题/).waitFor({timeout:60000});
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fde-state-v1')));
 assert.equal(saved.sources.length,5);assert.equal(saved.sources.reduce((n,s)=>n+s.pages,0),299);
 assert.equal(saved.questions.length,98);assert.ok(saved.questions.every(q=>q.status==='pending'&&['generated','reference'].includes(q.origin)));
 assert.equal(saved.cases.length,6);assert.equal(Object.keys(saved.notes).length,5);assert.equal(saved.questions.filter(q=>q.origin==='reference').length,14);assert.ok(!saved.questions.some(q=>q.id==='mock-reference-12'));assert.ok(saved.questions.filter(q=>q.origin==='reference').every(q=>q.provenance.includes('未经官方')));
 assert.equal(await page.getByRole('button',{name:'阅读本机 PDF 与知识索引'}).count(),4);
 await page.getByRole('button',{name:'阅读本机 PDF 与知识索引'}).first().click();
 assert.ok((await page.locator('#source-note').inputValue()).includes('Embedding'));
 await page.locator('#source-note').fill('我自己的学习笔记');await page.getByRole('button',{name:'保存笔记',exact:true}).click();
 await page.locator('nav a[href="#course"]').click();
 await page.locator('#unlock-pdfs').setInputFiles(payloads);
 await page.getByText(/学习包已导入：98 道题/).waitFor({timeout:60000});
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fde-state-v1')));assert.equal(saved.questions.length,98);assert.equal(saved.cases.length,6);assert.ok(Object.values(saved.notes).includes('我自己的学习笔记'));
 await page.getByRole('link',{name:'核验生成题'}).click();
 await page.getByRole('heading',{name:'先核对依据，再采纳题目。'}).waitFor();
 await page.locator('details').first().locator('summary').click();
 await page.getByRole('button',{name:'已核对原文，采纳'}).first().click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('fde-state-v1')).questions.filter(q=>q.status==='reviewed').length===1);
 await page.locator('#review-origin').selectOption('reference');assert.equal(await page.locator('details').count(),14);
 await page.locator('nav a[href="#practice"]').click();
 await page.getByRole('heading',{name:/工程师把所有判断规则/}).waitFor();
 await page.locator('input[name=choice][value="0"]').check();await page.getByRole('button',{name:'提交答案'}).click();await page.getByRole('heading',{name:'回答正确 · 1.5 分'}).waitFor();
 // Explicit test fixture for a previously reviewed scenario set; production pack stays pending.
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('fde-state-v1'));let single=0,multiple=0;for(const q of s.questions.filter(q=>q.style==='scenario')){if((q.type==='single'&&single<10)||(q.type==='multiple'&&multiple<5)){q.status='reviewed';q.reviewedBy='browser-test-fixture';if(q.type==='single')single++;else multiple++;}}localStorage.setItem('fde-state-v1',JSON.stringify(s));});
 await page.reload();await page.locator('nav a[href="#practice"]').click();await page.locator('#style-filter').selectOption('scenario');await page.locator('#origin-filter').selectOption('reference');
 const referenceStems=await page.evaluate(()=>JSON.parse(localStorage.getItem('fde-state-v1')).questions.filter(q=>q.origin==='reference'&&q.status==='reviewed').map(q=>({type:q.type,stem:q.stem})));
 await page.getByRole('heading',{name:referenceStems.find(q=>q.type==='single').stem,exact:true}).waitFor();
 await page.locator('#kind-filter').selectOption('multiple');await page.getByRole('heading',{name:referenceStems.find(q=>q.type==='multiple').stem,exact:true}).waitFor();
 await page.locator('nav a[href="#exam"]').click();await page.locator('#exam-mode').selectOption('mini');await page.getByRole('button',{name:'开始 25 分钟情境短练'}).click();
 let active=await page.evaluate(()=>JSON.parse(localStorage.getItem('fde-state-v1')).exam);assert.equal(active.questions.length,15);assert.equal(active.totalScore,25);assert.equal(new Set(active.questions.map(q=>q.id)).size,15);const deadline=active.deadline;
 await page.reload();await page.locator('#exam-clock').waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fde-state-v1')).exam.deadline),deadline);
 // Fill the isolated test exam via normal radio/checkbox controls.
 for(let i=0;i<active.questions.length;i++){await page.locator(`[data-exam-index="${i}"]`).first().click();await page.getByRole('heading',{name:active.questions[i].stem,exact:true}).waitFor();for(const answer of active.questions[i].answer)await page.locator(`input[name=choice][value="${answer}"]`).check();}
 page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'交卷',exact:true}).click();await page.getByText(/得分 25 \/ 25/).waitFor();await page.getByRole('heading',{name:'薄弱主题与复习方向'}).waitFor();
 await ctx.setOffline(true);await page.reload();
 await page.locator('nav a[href="#course"]').click();await page.getByRole('button',{name:'阅读本机 PDF 与知识索引'}).first().click();
 assert.equal(await page.locator('#source-note').inputValue(),'我自己的学习笔记');
 assert.ok(requests.every(r=>r.method==='GET'));
 // Native Chromium PDF viewer loads bundled chrome resources, not network uploads.
 const unexpected=requests.filter(r=>!r.url.startsWith('http://127.0.0.1:4173/')&&!r.url.startsWith('blob:')&&!r.url.startsWith('chrome://resources/')&&!r.url.startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/'));
 assert.equal(unexpected.length,0,JSON.stringify(unexpected.slice(0,5)));
 assert.deepEqual(errors,[]);
 console.log('PASS real private pack: four-PDF key unlocks five local sources, 98 pending questions, 14 uncertain reference records, source/type/style filters, 15-question 25-minute scenario exam, reload recovery, score/weakness report, offline notes and no uploads.');
}finally{await browser.close();}
