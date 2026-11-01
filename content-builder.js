'use strict';
// 个人版单元生成器：content-moena-*.js 用 BWJP.A / BWJP.B / BWJP.C 写单元，统一生成 BW_JP_MOENA 的数据结构。
// 本文件只定义写法，不含任何语料。每日语料 SOP 见 AGENTS.md。
(()=>{
 const hint=(support,target)=>({lexicalHints:support.map(text=>({text,role:'support'})),grammarHints:target.map(text=>({text,role:'target'}))});
 const q=(id,o)=>{
  const r={id,type:'input',feedback:'',target:o.zh,...o,hint:[...(o.lex||[]),...(o.gram||[])].join('；'),...hint(o.lex||[],o.gram||[])};
  delete r.lex;delete r.gram;return r;
 };
 const base=o=>{
  const {q:qs,examples,example,covers,folds,...rest}=o;
  return {collection:'moena',domain:'moena',domains:['moena'],pilot:true,formula:o.expression,
   examples:(examples||(example?[example]:[])).map(e=>({zh:e.zh,en:e.en||e.ja})),sourceItems:covers||[],foldedItems:folds||[],...rest};
 };
 const mk=(o,ids)=>o.q.map((x,i)=>q(ids[i],x));
 window.BW_JP_MOENA=window.BW_JP_MOENA||[];
 const push=u=>window.BW_JP_MOENA.push(u);
 window.BWJP={
  // A 定型表达：学习 1 题；有相近表达时 2 题，复习固定 1 题（第 2 题 tag 为“相近表达 · 换个场合”，scene 以“和上一题不同：”开头）
  A(o){
   const [a,b]=mk(o,['entry','l2']);
   push({...base(o),practiceProfile:'fixed',entry:a,learning:[{...a,id:'l1'},...(b?[b]:[])],review:[{...(b||a),id:'r1'}]}); // 独立表达复习只出 1 题：有相近表达时考辨别那题，否则考原题
  },
  // B 框架表达：q 必须 2 题；第 1 题回忆整个框架（空位用〇〇），第 2 题具体场景（尽量对客户、合作方）
  B(o){
   const [a,b]=mk(o,['entry','l2']);
   push({...base(o),practiceProfile:'frame',entry:a,learning:[{...a,id:'l1'},b],review:[{...a,id:'r1'},{...b,id:'r2'}]});
  },
  // C 可造句表达：q 必须 2 题（学习题、复习题），无初次尝试题
  C(o){
   const [a,b]=mk(o,['l1','r1']);
   push({...base(o),practiceProfile:'compose',skipEntry:true,learning:[a],review:[b]});
  }
 };
})();
