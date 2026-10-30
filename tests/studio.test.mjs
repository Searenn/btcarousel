import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { build } from '../scripts/build.mjs';
const code = await build({write:false,testExports:true});
const makeConfig=ratio=>({slides:[{id:'one',blocks:[{id:'block-one',text:'Наследницы ==огня|marker:#ffcc00==',x:8,y:20,width:84,height:25,fontSize:20,fontWeight:'bold',isItalic:false,align:'center',hasCardBg:true,textEffect:'outline',textStrokeWidth:2.5,textStrokeColor:'#123456'}],backgroundImage:null,bgColor:null},{id:'two',blocks:[{id:'block-two',text:'Второй слайд',x:8,y:20,width:84,height:25,fontSize:20,fontWeight:'bold',isItalic:false,align:'center',hasCardBg:true}],backgroundImage:null,bgColor:null}],palette:{bg:'#faf0f2',text:'#3d2229',accent:'#e598a4',accentText:'#fff',cardBg:'rgba(255,255,255,.78)'},selectedGenre:'romantic',slideDuration:3,transitionDuration:.6,useUniformDuration:true,ratio,showTiktokHud:false,socialBadge:{enabled:true,text:'ТГ: @reyaburn',x:10,y:82,width:80,fontSize:14,textColor:'#ffffff',backgroundColor:'#18181b'}});
async function setup(config=makeConfig('3:4')) {
 const errors=[];const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>',{url:'https://searenn.github.io/btcarousel/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 const {window:w}=dom;
 w.IS_REACT_ACT_ENVIRONMENT=true;w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
 Object.defineProperty(w.document,'fonts',{value:{ready:Promise.resolve(),load:async()=>[{}],check:()=>true}});
 Object.defineProperty(w.HTMLLinkElement.prototype,'sheet',{get(){return {cssRules:[]}}});
 w.HTMLElement.prototype.setPointerCapture=function(){};w.HTMLElement.prototype.releasePointerCapture=function(){};
 w.HTMLElement.prototype.getBoundingClientRect=function(){const ratio=config.ratio;return {width:315,height:ratio==='3:4'?420:560,left:0,top:0,right:315,bottom:ratio==='3:4'?420:560,x:0,y:0,toJSON(){}}};
 w.localStorage.setItem('booktok_carousel_config',JSON.stringify(config));w.eval(code);
 const {React}=w.__btTest;React.act=async fn=>{await fn();await new Promise(r=>setTimeout(r,20));};await React.act(async()=>{await new Promise(r=>setTimeout(r,30));});
 const click=async el=>{assert(el,'click target exists');await React.act(async()=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true})));};
 const input=async(el,value)=>{assert(el,'input exists');await React.act(async()=>{Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));});};
 const pointer=async(el,type,x,y)=>{await React.act(async()=>{const ev=new w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});Object.defineProperty(ev,'pointerId',{value:1});el.dispatchEvent(ev);});};
 return {dom,w,click,input,pointer,errors,async close(){await React.act(async()=>w.__btTest.root.unmount());dom.window.close();}};
}
test('published editor: badge, drag, keyboard, persistence and both ratios',async()=>{
 for(const ratio of ['3:4','9:16']) {
 const app=await setup(makeConfig(ratio)); const {w,click,input,pointer}=app;const doc=w.document;
 try {
 const badge=()=>doc.querySelector('#phone-device-viewport [data-social-badge]');assert(badge());
 assert.equal(doc.querySelectorAll('[id^="export-slide-"] [data-social-badge]').length,2);
 await input(doc.querySelector('[aria-label="Надпись соцсетей"]'),'ВК: @author · Рея');assert(badge().textContent.includes('ВК: @author'));
 await pointer(badge(),'pointerdown',100,300);await pointer(badge(),'pointermove',80,200);await pointer(badge(),'pointerup',80,200);
 const top=parseFloat(badge().style.top);assert(top<70);assert(parseFloat(badge().style.left)<5);
 await w.__btTest.React.act(async()=>badge().dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true})));assert.equal(parseFloat(badge().style.top),top-1);
 const saved=JSON.parse(w.localStorage.getItem('booktok_carousel_config'));assert.equal(saved.socialBadge.text,'ВК: @author · Рея');
 assert.equal(w.__btTest.load().socialBadge.text,saved.socialBadge.text);
 const exportBadges=[...doc.querySelectorAll('[id^="export-slide-"] [data-social-badge]')];assert(exportBadges.every(b=>b.style.top===badge().style.top));
 assert.equal(exportBadges[0].tagName,'DIV');assert.equal(badge().tagName,'BUTTON');
 assert.equal(exportBadges[0].style.fontSize,`${14*1080/315}px`);
 await click(doc.querySelector('[aria-label="Показывать плашку соцсетей"]'));assert(!badge());assert.equal(doc.querySelectorAll('[id^="export-slide-"] [data-social-badge]').length,0);
 assert.deepEqual(app.errors,[]);
 }finally {await app.close();}
 }
});
test('outline controls integrate with existing text effects and exports',async()=>{
 const app=await setup();const {w,click,input}=app,doc=w.document;
 try {
 await click(doc.querySelector('#phone-device-viewport [data-block-id="block-one"]'));
 const stroke=doc.querySelector('[aria-label="Толщина обводки текста"]');assert(stroke);await input(stroke,'3');
 await input(doc.querySelector('[aria-label="Цвет обводки текста"]'),'#ff0000');
 let contents=[...doc.querySelectorAll('[data-block-id="block-one"] [data-block-content]')];assert(contents.length>=2);
 assert(contents.every(el=>el.style.webkitTextStroke===`${3*(1080/315)}px #ff0000`),JSON.stringify(contents.map(el=>el.style.webkitTextStroke)));
 await input(stroke,'0');assert(doc.querySelector('#export-slide-0 [data-block-content]').style.webkitTextStroke.startsWith('0px'));
 // Flat marker behavior from v7 is preserved.
 const marker=doc.querySelector('#export-slide-0 [data-block-content] span[style*="background-color"]');assert.equal(marker.style.borderRadius,'0');assert.equal(marker.style.backgroundColor,'rgb(255, 204, 0)');
 assert(doc.querySelector('[title="Заблокировать объект"]'));
 assert(doc.querySelector('[title="Эффект текста"]'));
 }finally{await app.close();}
});
test('18 selectable themes render their own decoration in preview and all exported slides',async()=>{
 const app=await setup();const {w}=app,doc=w.document;
 try {
 const select=[...doc.querySelectorAll('select')].find(el=>[...el.options].some(o=>o.value==='moon_tarot'));
 assert(select);assert.equal(select.options.length,18);
 const ids=['torn_diary','pop_comic','cinema_noir','neon_terminal','dark_academia','scrapbook','editorial','moon_tarot'];
 const designs=new Set();
 for(const id of ids){
  await w.__btTest.React.act(async()=>{select.value=id;select.dispatchEvent(new w.Event('change',{bubbles:true}));});
  const svg=doc.querySelector(`#export-slide-0 [data-theme-decor="${id}"]`);assert(svg);designs.add(svg.innerHTML);
  assert.equal(doc.querySelectorAll(`[id^="export-slide-"] [data-theme-decor="${id}"]`).length,2);
  assert(doc.querySelector(`#phone-device-viewport [data-theme-decor="${id}"]`));
  const saved=JSON.parse(w.localStorage.getItem('booktok_carousel_config'));assert.equal(saved.selectedGenre,id);assert.equal(saved.slides[0].blocks[0].x,8);assert.equal(saved.slides[0].blocks[0].textStrokeWidth,2.5);
  assert.equal(saved.socialBadge.text,'ТГ: @reyaburn');assert(saved.slides[0].blocks[0].text.includes('Наследницы'));
 }
 assert.equal(designs.size,8);
 }finally{await app.close();}
});
test('legacy projects do not get a badge; invalid coordinates stay inside either ratio',async()=>{
 const config=makeConfig('3:4');delete config.socialBadge;const app=await setup(config);
 try {
 assert.equal(app.w.document.querySelectorAll('[data-social-badge]').length,0);
 for(const ratio of ['3:4','9:16']){
 const layout=app.w.__btTest.layout({enabled:true,x:999,y:999,width:90,fontSize:32},ratio);assert.equal(layout.x,10);assert(layout.y+layout.height<=100.000001);
 const bad=app.w.__btTest.layout({x:'bad',y:NaN,width:'bad',fontSize:null},ratio);assert(Number.isFinite(bad.x));assert(Number.isFinite(bad.height));
 }
 }finally{await app.close();}
});
test('JSON import retains badge settings and importing an older project hides the badge',async()=>{
 const app=await setup();const {w}=app,doc=w.document;
 try {
 const fileInput=doc.querySelector('input[type="file"][accept=".json"]');assert(fileInput);
 const importConfig=async config=>{
   const file=new w.File([JSON.stringify(config)],'project.json',{type:'application/json'});
   Object.defineProperty(fileInput,'files',{value:[file],configurable:true});
   await w.__btTest.React.act(async()=>{fileInput.dispatchEvent(new w.Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,30));});
 };
 const imported=makeConfig('9:16');imported.socialBadge.text='Импортированная плашка';await importConfig(imported);
 assert.equal(doc.querySelector('#export-slide-0 [data-social-badge]').textContent,'Импортированная плашка');
 delete imported.socialBadge;await importConfig(imported);assert.equal(doc.querySelectorAll('[data-social-badge]').length,0);
 }finally{await app.close();}
});
test('new theme cards retain existing opacity control, including zero',async()=>{
 const config=makeConfig('3:4');config.selectedGenre='pop_comic';config.palette.cardBg='#ffffff';config.slides[0].blocks[0].cardBgOpacity=0;
 const app=await setup(config);
 try{
 const card=app.w.document.querySelector('#export-slide-0 [data-block-id="block-one"]');assert.equal(card.style.backgroundColor,'rgba(255, 255, 255, 0)');assert(card.style.border.includes('solid'));
 }finally{await app.close();}
});
