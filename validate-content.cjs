'use strict';
// 真实语料内容校验：node validate-content.cjs [文件...] [--coverage=1-345 --skip=253,254]
// 默认检查全部 content-moena-*.js（含单元结构、题面不含日语、答案/提示、来源条目不重复；--coverage 时检查每个条目都有去向）。
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=__dirname+'/';
const args=process.argv.slice(2);
const files=args.filter(a=>!a.startsWith('--'));
const flag=n=>(args.find(a=>a.startsWith('--'+n+'='))||'').split('=')[1];
const list=files.length?files:fs.readdirSync(root).filter(f=>/^content-moena-.*\.js$/.test(f)).sort();
const ctx={window:{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root+'content-builder.js','utf8'),ctx);ctx.BWJP=ctx.window.BWJP;
for(const f of list)vm.runInContext(fs.readFileSync(root+f,'utf8'),ctx,{filename:f});
const units=ctx.window.BW_JP_MOENA;
const errors=[],warn=[];
const err=(u,m)=>errors.push(`${u.id||'?'}: ${m}`);
const kana=/[\u3040-\u309f\u30a0-\u30ff]/;
const norm=s=>String(s).normalize('NFKC').replace(/[\s　「」『』（）()。、，,.！!？?～〜~…・〇○]/g,'');
const ids=new Set(),src=new Map();
for(const u of units){
 if(!u.id||!/^pj-[a-z0-9-]+$/.test(u.id))err(u,'id 必须是 pj-小写字母数字-');
 if(ids.has(u.id))err(u,'id 重复');ids.add(u.id);
 for(const k of ['meaning','expression','explanation','boundary','checkpoint'])if(!u[k]||typeof u[k]!=='string')err(u,'缺少 '+k);
 if(kana.test(u.meaning||''))err(u,'meaning 不应含日语假名');
 if(!u.examples?.length||u.examples.some(e=>!e.zh||!e.en))err(u,'examples 需要 zh 和 ja');
 if(!['fixed','frame','compose'].includes(u.practiceProfile))err(u,'practiceProfile');
 const qs=u.practiceProfile==='compose'?[...u.learning,...u.review]:[u.entry,...u.learning.slice(1)];
 const qn=u.practiceProfile==='fixed'?u.learning.length:2;
 if(u.practiceProfile==='fixed'&&![1,2].includes(u.learning.length))err(u,'A 类只能 1 或 2 题');
 if(u.practiceProfile==='frame'&&u.learning.length!==2)err(u,'B 类必须 2 题');
 if(u.practiceProfile==='compose'&&(u.learning.length!==1||u.review.length!==1||!u.skipEntry||u.entry))err(u,'C 类需 skipEntry、学习 1、复习 1，无 entry');
 if(u.practiceProfile!=='compose'&&u.skipEntry)err(u,'非 C 不能 skipEntry');
 qs.forEach((q,i)=>{
  const w=`${q.id}`;
  for(const k of ['scene','zh'])if(!q[k]||typeof q[k]!=='string')err(u,w+' 缺少 '+k);
  for(const k of ['scene','zh','intent'])if(kana.test(q[k]||''))err(u,`${w} 的 ${k} 含日语假名（题面不能出现日语；对方的话放 dialogue）`);
  if(!Array.isArray(q.answers)||q.answers.length<2||q.answers.some(a=>!a||!a.trim()))err(u,w+' answers 需要 2 个以上自然的答案');
  const a0=norm(q.answers?.[0]||'');
  if(norm(q.scene||'').includes(a0)&&a0.length>3)err(u,w+' scene 泄露了答案');
  for(const h of q.grammarHints||[])if(h.role==='target'&&norm(h.text).includes(a0)&&a0.length>4)err(u,w+' 目标提示露出了完整答案');
  if(!q.lexicalHints?.length&&!q.grammarHints?.length)err(u,w+' 缺少提示');
  for(const h of [...(q.lexicalHints||[]),...(q.grammarHints||[])])if(!/[：:]/.test(h.text))warn.push(`${u.id}: ${w} 提示建议“线索：内容”格式：${h.text}`);
  if(u.practiceProfile==='fixed'&&i===1){
   if(q.tag!=='相近表达 · 换个场合')err(u,'A 类第 2 题 tag 必须是“相近表达 · 换个场合”');
   if(!/^和上一题不同：/.test(q.scene||''))err(u,'A 类第 2 题 scene 必须以“和上一题不同：”开头');
  }
  if(q.tag&&!(u.practiceProfile==='fixed'&&i===1))err(u,w+' 不应有 tag');
 });
 if(u.practiceProfile==='frame'&&!/〇/.test(u.formula))warn.push(`${u.id}: B 类 formula 建议用〇〇表示空位`);
 for(const n of [...(u.sourceItems||[]),...(u.foldedItems||[])]){
  if(!Number.isInteger(n))err(u,'covers/folds 必须是整数条目号');
  if(src.has(n))err(u,`条目 #${n} 已被 ${src.get(n)} 使用`);src.set(n,u.id);
 }
 if(!(u.sourceItems||[]).length)err(u,'covers 不能为空');
}
const cov=flag('coverage');
if(cov){
 const [a,b]=cov.split('-').map(Number),skip=(flag('skip')||'').split(',').filter(Boolean).map(Number);
 const miss=[];for(let n=a;n<=b;n++)if(!src.has(n)&&!skip.includes(n))miss.push(n);
 if(miss.length)errors.push('未处理的条目：'+miss.join(','));
}
const sel=flag('only');
if(sel){const set=new Set(sel.split(',').flatMap(x=>{const [p,q]=x.split('-').map(Number);return q?Array.from({length:q-p+1},(_,i)=>p+i):[p];}));
 const out=[...src.keys()].filter(n=>!set.has(n));if(out.length)errors.push('使用了本批以外的条目：'+out.join(','));
 const miss=[...set].filter(n=>!src.has(n));if(miss.length)errors.push('本批尚未处理的条目：'+miss.join(','));}
const t={fixed:0,frame:0,compose:0};units.forEach(u=>t[u.practiceProfile]++);
console.log(`单元 ${units.length}（A ${t.fixed} / B ${t.frame} / C ${t.compose}），已分配条目 ${src.size}`);
if(warn.length){console.log('提示（不阻塞）'+warn.length+' 条');warn.slice(0,15).forEach(w=>console.log('  '+w));}
if(errors.length){console.log('\n错误 '+errors.length+' 条');errors.slice(0,80).forEach(e=>console.log('  '+e));process.exit(1);}
console.log('PASS');
