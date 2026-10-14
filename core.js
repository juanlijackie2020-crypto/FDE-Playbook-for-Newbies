export const TOPICS = ['ADP 产品与边界','需求与方案设计','RAG 知识库','行业解决方案','交付与实施','评测与运维'];
export const CASE_FIELDS = ['客户与行业背景','业务目标','需求与约束','适用与不适用条件','ADP 能力映射','方案与数据流','RAG 与工具集成','实施步骤','安全权限与风险','评测集与指标','验收标准','发布、运维与回滚','复盘与复用条件'];
export const freshState = () => ({version:1,sources:[],questions:[],attempts:[],cases:[],notes:{},tasks:{},exam:null});
export function scoreQuestion(q, selected = []) {
  const right = selected.length === q.answer.length && selected.every(x => q.answer.includes(x));
  return {right,score:right ? (q.type === 'single' ? 1.5 : 2) : 0};
}
export function validateQuestion(q, sourceIds) {
  if (!q || typeof q !== 'object' || !['single','multiple'].includes(q.type) || typeof q.stem !== 'string' || !q.stem.trim()) throw Error('题干或题型无效');
  if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 8 || q.options.some(x => typeof x !== 'string' || !x.trim())) throw Error('选项应为 2–8 个非空文本');
  if (!Array.isArray(q.answer) || !q.answer.length || new Set(q.answer).size !== q.answer.length || q.answer.some(x => !Number.isInteger(x) || x < 0 || x >= q.options.length) || (q.type === 'single' && q.answer.length !== 1)) throw Error('答案索引无效');
  if (!['official','generated','reference','demo'].includes(q.origin) || !['draft','reviewed','pending'].includes(q.status)) throw Error('来源标签或审校状态无效');
  if (typeof q.explanation !== 'string' || !Array.isArray(q.optionExplanations) || q.optionExplanations.length !== q.options.length || q.optionExplanations.some(x=>typeof x!=='string' || !x.trim())) throw Error('需提供总解析和每个选项的解析');
  if (!TOPICS.includes(q.topic)) throw Error('题目主题无效');
  if (q.origin !== 'demo' && (!sourceIds.includes(q.sourceId) || typeof q.locator !== 'string' || !q.locator.trim())) throw Error('题目必须关联已导入资料和页码／章节／时间戳');
  return q;
}
export function examPool(questions, mode='full') {
  const ready = questions.filter(q=>q.status==='reviewed' && q.origin!=='demo' && (mode==='full'||q.style==='scenario'||q.origin==='reference'));
  return {single:ready.filter(q=>q.type==='single'),multiple:ready.filter(q=>q.type==='multiple')};
}
export function makeExam(questions, now = Date.now(), mode='full') {
  if(!['full','mini'].includes(mode))throw Error('模拟模式无效');
  const singleCount=mode==='mini'?10:40,multipleCount=mode==='mini'?5:20,minutes=mode==='mini'?25:90;
  const pool=examPool(questions,mode);
  if(pool.single.length<singleCount || pool.multiple.length<multipleCount) throw Error(`已审校${mode==='mini'?'情境':'综合'}题库不足：需要 ${singleCount} 道单选和 ${multipleCount} 道多选`);
  const shuffle = xs => { const a=[...xs]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; };
  const spread=(items,n)=>{const groups=shuffle(TOPICS).map(topic=>shuffle(items.filter(q=>q.topic===topic))),picked=[];while(picked.length<n){for(const group of groups){if(group.length&&picked.length<n)picked.push(group.pop());}}return picked;};
  return {mode,totalScore:singleCount*1.5+multipleCount*2,questions:[...spread(pool.single,singleCount),...spread(pool.multiple,multipleCount)].map(q=>structuredClone(q)),answers:{},flags:[],index:0,startedAt:now,deadline:now+minutes*60000,submittedAt:null};
}
export function examResult(exam) {
  let score=0,right=0,unanswered=0;
  const rows=exam.questions.map(q=>{const selected=exam.answers[q.id] || [];const result=scoreQuestion(q,selected);score+=result.score;right+=Number(result.right);unanswered+=Number(!selected.length);return {q,selected,...result};});
  return {score,right,unanswered,rows};
}
export const DEMOS = [
 {id:'demo-single',type:'single',stem:'【功能示例】为了验证资料可追溯，生成练习题最应保留什么？',options:['仅保留正确答案','资料来源及具体定位','仅保留题目难度','删除原始资料'],answer:[1],explanation:'这是应用功能示例，用于验证单选与来源展示，不是腾讯考试知识或真题。',optionExplanations:['答案不能替代依据。','来源与定位支持复核。','难度不能证明题目准确。','删除原件不利于复核。'],topic:'需求与方案设计',origin:'demo',status:'reviewed',locator:'PRD 第 4.3 节'},
 {id:'demo-multiple',type:'multiple',stem:'【功能示例】在这个应用中，哪些动作帮助保留个人学习成果？',options:['导出数据备份','导出案例 Markdown','只依赖浏览器缓存永不清理','恢复备份并核对内容'],answer:[0,1,3],explanation:'这是应用功能示例。多选暂按全部选对得分；漏选、错选均为 0 分。',optionExplanations:['备份可恢复学习数据。','Markdown 适合长期整理。','浏览器数据可能被清理。','恢复验证确认备份可用。'],topic:'交付与实施',origin:'demo',status:'reviewed',locator:'PRD 第 5 节'}
];
