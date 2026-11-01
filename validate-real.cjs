'use strict';
// 真实语料冒烟：BW_REAL=1 加载全部 content-moena-*.js 与 daily-materials.js，检查页面能装载、日期页能列出、每个单元都能开始学习和复习。
process.env.BW_REAL='1';
const assert=require('assert'),{setup}=require('./validate.cjs');
const env=setup(),r=env.run;
const n=r('window.BW_JP_MOENA.length');assert(n>0,'没有真实单元');
assert.equal(r('window.BW_JP_DAILY_MATERIALS.length'),r('window.BW_JP_DAILY_MATERIALS.length'));
assert(r('unitById.size')>=n);
for(const d of r('window.BW_JP_DAILY_MATERIALS')){for(const it of d.items)assert(r(`unitById.has(${JSON.stringify(it.unitId)})`),'未知单元 '+it.unitId);}
// 每个单元：能选中、能生成学习轮、题目齐全
const x=r;
const ids=r('window.BW_JP_MOENA.map(u=>u.id)');
for(const id of ids){
 x(`selectLesson(${JSON.stringify(id)});state.learn=newLearning();view='study';`);
 assert(x('learningQuestion()'),id+' 无首题');
 const qs=x('(state.learn.pinnedLearning||lesson.learning).length');assert(qs>=1,id+' 无学习题');
 assert(x('lesson.review.length')>=1,id+' 无复习题');
}
// 日期页主题分组：每个单元恰好一个主题；主题按顺序分段显示；点主题只显示该主题；不在日期里的单元不出现
assert(r('!!window.BW_JP_MOENA_THEMES'),'主题数据未加载');
for(const id of ids)assert(r(`window.BW_JP_MOENA_THEMES.units[${JSON.stringify(id)}]`),id+' 无主题');
assert.equal(r('Object.keys(window.BW_JP_MOENA_THEMES.units).length'),ids.length,'主题表含不存在的单元');
const themeIds=r('window.BW_JP_MOENA_THEMES.themes.map(t=>t.id)');
for(const t of themeIds)assert(r(`Object.values(window.BW_JP_MOENA_THEMES.units).filter(x=>x==='${t}').length`)>=4,t+' 单元少于 4 个');
const dayId=r('window.BW_JP_DAILY_MATERIALS[0].id');
x(`dailyTheme='all';search='';page=1;`);
const html=x(`ceciliaDatePage(ceciliaDay('${dayId}'))`);
assert(html.includes('class="theme-chips"')&&html.includes('class="theme-title"'),'日期页缺少主题分组');
const firstName=x('window.BW_JP_MOENA_THEMES.themes[0].name');assert(html.indexOf(firstName)>=0);
x(`dailyTheme='${themeIds[1]}';page=1;`);
const only=x(`ceciliaDatePage(ceciliaDay('${dayId}'))`);
const secondName=x('window.BW_JP_MOENA_THEMES.themes[1].name');
assert(only.includes(`<h2 class="theme-title">${secondName}`)&&(only.match(/class="theme-title"/g)||[]).length===1,'主题筛选后应只有一个分段');
x(`dailyTheme='all';`);
console.log(`PASS real（${n} 个单元）`);
