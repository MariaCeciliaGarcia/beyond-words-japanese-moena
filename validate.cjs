const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=__dirname+'/';
function setup(legacy=null,saved=null,options={}){
 const map=options.map||new Map(),handlers={},listeners={},elements=new Map(),downloads=[],blobs=new Map();
 if(legacy)map.set('beyondwords.japanese.legacy-unused',JSON.stringify(legacy));
 if(saved)map.set('beyondwords.japanese.personal.v1',JSON.stringify(saved));
 const el=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',insertAdjacentHTML(_position,html){this.innerHTML+=html},textContent:'',value:'',hidden:true,open:false,classList:{add(){},remove(){}},querySelector(){return null},focus(){},setSelectionRange(){},select(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false}});return elements.get(id);};
 const history={state:null,entries:[],replaceState(state,_,url){this.state=state;this.entries[this.entries.length-1]={state,url};},pushState(state,_,url){this.state=state;this.entries.push({state,url});}};
 const ctx={window:{addEventListener:(t,f)=>listeners[t]=f,scrollTo(){}},localStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>{if(options.failWrites)throw Error('quota');if(options.failKey===k&&options.failCount>0){options.failCount--;throw Error('quota once');}map.set(k,v)},removeItem:k=>map.delete(k)},Blob:class{constructor(parts){this.parts=parts}},URL:{createObjectURL:b=>{const id='blob:test-'+blobs.size;blobs.set(id,b);return id},revokeObjectURL(){}},document:{body:{appendChild(){}},createElement:()=>({click(){downloads.push({filename:this.download,text:blobs.get(this.href).parts.join('')})},remove(){}}),getElementById:el,addEventListener:(t,f)=>handlers[t]=f},history,location:{pathname:'/',search:'',hash:''},crypto:require('crypto').webcrypto,setTimeout:()=>0,clearTimeout(){},Date,console};
 vm.createContext(ctx);
 const files=[...fs.readFileSync(root+'index.html','utf8').matchAll(/<script src="([^"?]+)/g)].map(x=>x[1]).filter(f=>!/^content-(builder|moena)/.test(f)||process.env.BW_REAL==='1');
  for(const file of files){
   if(file==='app.js'&&process.env.BW_FIXTURES){ // 仅供测试：旧版 5+5 单元，用来验证沿用功能（笔记、回看、日期、首页），不进网页
    vm.runInContext('window.BW_JP_MOENA=[...(window.BW_JP_MOENA||[]),...'+fs.readFileSync(root+'validate-fixtures.json','utf8')+']',ctx);
   }
   if(file==='edition-support.js'&&process.env.BW_REAL!=='1')vm.runInContext(fs.readFileSync(root+'validate-samples.js','utf8'),ctx,{filename:'validate-samples.js'}); // 测试专用样例
   vm.runInContext(fs.readFileSync(root+file,'utf8'),ctx,{filename:file});
   if(file==='content-builder.js')vm.runInContext('var BWJP=window.BWJP',ctx);
   if(file==='daily-materials.js'&&process.env.BW_REAL!=='1')vm.runInContext('window.BW_JP_DAILY_MATERIALS=[]',ctx); // 测试模式不用真实日期材料
  }
 return {ctx,map,handlers,listeners,history,el,downloads,run:source=>vm.runInContext(source,ctx)};
}
module.exports={setup};
if(require.main===module){
const env=setup();const r=env.run;
const click=(action,extra={})=>env.handlers.click({target:{closest:s=>s.startsWith('a[')?null:{dataset:{action,...extra}}}});
const total=r('units.length');assert(total>=4,'样例单元');assert.equal(r('new Set(units.map(u=>u.id)).size'),total);
// 只有小枝萌菜一个库，没有公共库
assert.deepEqual(Array.from(r('catalog.domains.map(d=>d.id)')),['moena']);
assert(r('units.every(u=>u.domain==="moena"&&u.domains.length===1&&u.domains[0]==="moena")'));
assert(!r('typeof window.JUJIAN_CORE!=="undefined"||typeof window.BW_JP_DAILY!=="undefined"||typeof window.BW_JP_WORK!=="undefined"'));
// 题数与结构：A 1-2 题，B 2 题，C 学习1+复习1
r(`for(const u of units){
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(u.id))throw Error('Backup-incompatible ID '+u.id);
  if(!['fixed','frame','compose'].includes(u.practiceProfile))throw Error('profile '+u.id);
  const all=[u.entry,...u.learning,...u.review];
  for(const q of all){if(q.type!=='input')throw Error('只许打字作答 '+u.id+q.id);if(!q.scene||!q.zh||!q.target||!q.answers.length||!q.lexicalHints.length||!q.grammarHints.length)throw Error('Question missing '+u.id+q.id);
   if(/[\\u3040-\\u30ff]/.test(q.scene+q.zh+q.target))throw Error('题面不能含日语 '+u.id+q.id);}
  if(u.practiceProfile==='fixed'&&!(u.learning.length>=1&&u.learning.length<=2&&u.review.length===u.learning.length))throw Error('A count '+u.id);
  if(u.practiceProfile==='frame'&&(u.learning.length!==2||u.review.length!==2))throw Error('B count '+u.id);
  if(u.skipEntry&&(u.learning.length!==1||u.review.length!==1||u.practiceProfile!=='compose'))throw Error('C count '+u.id);
 }`);
// 注意：A/B 的“对方说”台词会出现日语，但题面 scene 里的引号台词属于情境，已允许 → 放宽检查在样例上单独确认
const profile=id=>r(`unitById.get('${id}').practiceProfile`);
for(const id of r('units.map(u=>u.id)')){
  click('open-learn',{lesson:id});
  const kind=profile(id),skip=r('!!lesson.skipEntry');
  if(skip){assert.equal(r('state.learn.stage'),'intro');assert(!r('app.innerHTML').includes('entry-result-title'));assert(!r('app.innerHTML').includes('先尝试'));}
  else{assert.equal(r('state.learn.stage'),'entry');
  r('state.learn.q.input=learningQuestion().answers[0]');click('check');
  assert.equal(r('state.learn.stage'),'intro');assert(r('app.innerHTML').includes('entry-result-title'));}
  const n=r('state.learn.pinnedLearning.length');
  click('intro-next');
  if(kind==='compose'){
    assert.equal(r('state.learn.stage'),'exercise');
    for(let k=0;k<n;k++){r('state.learn.q.input=learningQuestion().answers[0]');click('check');assert(r('app.innerHTML').includes('答对了'));click('grade',{grade:'good'});}
    assert.equal(r('state.learn.stage'),'custom');
    r("state.draft={zh:'想联系也联系不上。',en:'連絡しようにも連絡できない。'}");click('save-custom');assert.equal(r('state.custom.length'),1);
    click('continue-create');click('finish-learn');
  }else{
    // A/B：初次作答计入第 1 题；A 只有 1 题就直接完成，有第 2 题则再练 1 题；绝不出现自建例句
    if(n>1){assert.equal(r('state.learn.stage'),'exercise');assert.equal(r('state.learn.index'),1);
      r('state.learn.q.input=learningQuestion().answers[0]');click('check');click('grade',{grade:'good'});}
    assert.equal(r('state.learn.results.length'),n);
    assert(!r('app.innerHTML').includes('id="custom-zh"'));
    assert.equal(r('state.custom.length'),0);
  }
  assert.equal(r('state.learn.stage'),'done');
  assert(r('app.innerHTML').includes('复习这个表达'));
  if(kind!=='compose'){assert(!r('app.innerHTML').includes('自己的例句'));assert(!r('app.innerHTML').includes('查看自己的例句'));}
  const m=r('state.review?state.review.queue.length:0');
  click('start-review');assert.equal(r('view'),'practice');
  const reviewCount=r('state.review.queue.length');
  const expected=kind==='compose'?Math.min(3,1+r('state.custom.length')):r('unitById.get(lesson.id).review.length');
  assert.equal(reviewCount,expected,id+' review queue');
  for(let k=0;k<reviewCount;k++){r('state.review.q.input=reviewQuestion().answers[0]');click('check');click('grade',{grade:'good'});}
  assert.equal(r('view'),'summary');assert.equal(r('state.review'),null);
}
// A/B 的学习轮在输入不匹配时仍计入第 1 题，不会把用户困在原题里
{const e2=setup(),r2=e2.run,c2=(action,extra={})=>e2.handlers.click({target:{closest:s=>s.startsWith('a[')?null:{dataset:{action,...extra}}}});
c2('open-learn',{lesson:'pj-heiso-gokouhai'});r2("state.learn.q.input='分かりません'");c2('check');
assert.equal(r2('state.learn.stage'),'intro');c2('intro-next');
assert.equal(r2('state.learn.results[0].grade'),'again');assert.equal(r2('state.learn.index'),1);assert.equal(r2('state.learn.stage'),'exercise');}
// 备份、存储键隔离
r('exportProgress()');const backup=JSON.parse(env.downloads.at(-1).text);assert.equal(backup.format,'beyondwords-japanese-personal-progress');
assert.throws(()=>r("parseProgressBackup(JSON.stringify({format:'beyondwords-japanese-progress',formatVersion:1,data:store}))"));
assert.throws(()=>r("parseProgressBackup(JSON.stringify({format:'jujian-progress',formatVersion:1,data:store}))"));
assert([...env.map.keys()].every(k=>k==='beyondwords.japanese.personal.v1'||k.startsWith('beyondwords.japanese.personal.')));
// 暂停后恢复，保留输入
r("selectLesson('pj-youni-mo-nai');state.learn=newLearning();view='study';state.learn.q.input='早く寝ようにも';save();");
const persisted=JSON.parse(env.map.get('beyondwords.japanese.personal.v1'));
const restored=setup(null,persisted);assert.equal(restored.run('state.learn.q.input'),'早く寝ようにも');
// 本轮题目快照不受后续内容修订影响
const pinned=setup(),pr=pinned.run;
pr("selectLesson('pj-youni-mo-nai');state.learn=newLearning();view='study';var originalEntry=JSON.stringify(learningQuestion());unitById.get('pj-youni-mo-nai').entry.target='日后修订的新题';");
assert.equal(pr('JSON.stringify(learningQuestion())'),pr('originalEntry'));
// 标点与全角空格
assert.equal(r("matches(' そうなんですね！',['そうなんですね。'])"),true);
// 损坏的存储只读不覆盖
const broken=setup(null,null,{map:new Map([['beyondwords.japanese.personal.v1','unreadable original']])});assert.equal(broken.run('progressReadOnly'),true);assert.equal(broken.map.get('beyondwords.japanese.personal.v1'),'unreadable original');
console.log(`PASS: ${total} units (A/B/C), full learning/review flows without custom for A/B, library isolation, backup format and storage.`);
}
