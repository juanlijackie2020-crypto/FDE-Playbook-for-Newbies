import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreQuestion,validateQuestion,makeExam,examResult,DEMOS} from '../core.js';
test('single choice and multiple choice require exact answers',()=>{
 assert.deepEqual(scoreQuestion(DEMOS[0],[1]),{right:true,score:1.5});
 assert.equal(scoreQuestion(DEMOS[0],[0]).score,0);
 assert.equal(scoreQuestion(DEMOS[1],[0,1]).score,0);
 assert.equal(scoreQuestion(DEMOS[1],[0,1,2,3]).score,0);
 assert.equal(scoreQuestion(DEMOS[1],[3,0,1]).score,2);
 assert.equal(scoreQuestion(DEMOS[1],[]).score,0);
});
test('reviewed generated questions need valid references and option explanations',()=>{
 const q={...DEMOS[0],origin:'generated',sourceId:'source',locator:'p.1'};
 assert.equal(validateQuestion(q,['source']),q);
 assert.throws(()=>validateQuestion(q,[]),/关联/);
 assert.throws(()=>validateQuestion({...q,answer:[9]},['source']),/答案/);
 assert.throws(()=>validateQuestion({...q,optionExplanations:[]},['source']),/解析/);
});
test('mock exam excludes demo and pending questions, captures snapshot and scores 100',()=>{
 assert.throws(()=>makeExam(DEMOS),/不足/);
 const questions=Array.from({length:60},(_,i)=>({...DEMOS[i<40?0:1],id:'q'+i,origin:'generated',sourceId:'s'}));
 const e=makeExam(questions,1000);
 assert.equal(e.deadline,5401000);assert.equal(e.questions.length,60);
 assert.equal(e.questions.filter(q=>q.type==='single').length,40);
 e.questions.forEach(q=>e.answers[q.id]=[...q.answer]);
 assert.equal(examResult(e).score,100);assert.equal(examResult(e).unanswered,0);
 questions[0].stem='changed';assert.ok(e.questions.every(q=>q.stem!=='changed'));
 assert.throws(()=>makeExam(questions.map(q=>({...q,status:'pending'}))),/不足/);
});
