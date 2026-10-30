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
 w.Range.prototype.getBoundingClientRect=()=>({left:100,top:200,width:80,height:20});
 w.HTMLElement.prototype.setPointerCapture=function(){};w.HTMLElement.prototype.releasePointerCapture=function(){};
 w.HTMLElement.prototype.getBoundingClientRect=function(){const ratio=config.ratio;return {width:315,height:ratio==='3:4'?420:560,left:0,top:0,right:315,bottom:ratio==='3:4'?420:560,x:0,y:0,toJSON(){}}};
 w.localStorage.setItem('booktok_carousel_config',JSON.stringify(config));w.eval(code);
 const {React}=w.__btTest;React.act=async fn=>{await fn();await new Promise(r=>setTimeout(r,20));};await React.act(async()=>{await new Promise(r=>setTimeout(r,30));});
 const click=async el=>{assert(el,'click target exists');await React.act(async()=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true})));};
 const input=async(el,value)=>{assert(el,'input exists');await React.act(async()=>{Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));});};
 const pointer=async(el,type,x,y)=>{await React.act(async()=>{const ev=new w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});Object.defineProperty(ev,'pointerId',{value:1});el.dispatchEvent(ev);});};
 return {dom,w,click,input,pointer,errors,async close(){await React.act(async()=>w.__btTest.root.unmount());dom.window.close();}};
}
async function editBadge(app,text) {
 const {w}=app,doc=w.document;
 const badge=doc.querySelector('#phone-device-viewport [data-social-badge]');
 await w.__btTest.React.act(async()=>badge.dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true})));
 const editor=doc.getElementById('editable-div-__bt_social_badge__');assert(editor,'same inline editor as a normal block');
 await w.__btTest.React.act(async()=>{editor.textContent=text;editor.dispatchEvent(new w.FocusEvent('focusout',{bubbles:true}));});
}
test('shared social TextBlock: editing, drag, keyboard and persistence in both ratios',async()=>{
 for(const ratio of ['3:4','9:16']) {
 const app=await setup(makeConfig(ratio));const {w,click,pointer}=app,doc=w.document;
 try {
 const badge=()=>doc.querySelector('#phone-device-viewport [data-social-badge]');assert(badge());
 assert(!doc.querySelector('[aria-label="Плашка соцсетей"]'),'no badge design panel in sidebar');
 assert.equal(doc.querySelectorAll('[id^="export-slide-"] [data-social-badge]').length,2);
 await editBadge(app,'ВК: @author · Рея');assert(badge().textContent.includes('ВК: @author'));
 await pointer(badge(),'pointerdown',100,300);await pointer(w,'pointermove',80,200);await pointer(w,'pointerup',80,200);
 const top=parseFloat(badge().style.top);assert(top<70);assert(parseFloat(badge().style.left)<5);
 await w.__btTest.React.act(async()=>badge().dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true})));assert.equal(parseFloat(badge().style.top),top-1);
 const saved=JSON.parse(w.localStorage.getItem('booktok_carousel_config'));assert.equal(saved.socialBadge.text,'ВК: @author · Рея');
 assert.equal(w.__btTest.load().socialBadge.text,saved.socialBadge.text);
 const exports=[...doc.querySelectorAll('[id^="export-slide-"] [data-social-badge]')];assert(exports.every(b=>b.style.top===badge().style.top));
 assert.equal(exports[0].querySelector('[data-block-content]').style.fontSize,`${14*(1080/315)}px`);
 await click(doc.querySelector('[aria-label="Показывать блок соцсетей"]'));assert(!badge());assert.equal(doc.querySelectorAll('[id^="export-slide-"] [data-social-badge]').length,0);
 assert.deepEqual(app.errors,[]);
 }finally{await app.close();}
 }
});
test('social block uses normal formatting, effects, colors, resize and delete toolbar',async()=>{
 const app=await setup();const {w,click,input,pointer}=app,doc=w.document;
 try {
 const badge=()=>doc.querySelector('#phone-device-viewport [data-social-badge]');
 await click(badge());
 await click([...doc.querySelectorAll('button')].find(b=>b.textContent==='A+'));
 assert.equal(JSON.parse(w.localStorage.getItem('booktok_carousel_config')).socialBadge.fontSize,15);
 const effect=doc.querySelector('[title="Эффект текста"]');assert(effect);
 await w.__btTest.React.act(async()=>{effect.value='outline';effect.dispatchEvent(new w.Event('change',{bubbles:true}));});
 await input(doc.querySelector('[aria-label="Толщина обводки текста"]'),'2');
 await input(doc.querySelector('[aria-label="Цвет обводки текста"]'),'#ff0000');
 await input(doc.querySelector('[aria-label="Цвет текста блока"]'),'#eeccaa');
 await input(doc.querySelector('[aria-label="Цвет подложки блока"]'),'#223344');
 const saved=JSON.parse(w.localStorage.getItem('booktok_carousel_config'));
 assert.equal(saved.socialBadge.textStrokeWidth,2);assert.equal(saved.socialBadge.textColor,'#eeccaa');assert.equal(saved.socialBadge.cardBgColor,'#223344');
 assert(saved.slides.every(slide=>!slide.blocks.some(b=>b.id==='__bt_social_badge__')),'shared badge never copied into slide content');
 const exported=[...doc.querySelectorAll('[id^="export-slide-"] [data-social-badge]')];assert(exported.every(b=>b.querySelector('[data-block-content]').style.webkitTextStroke===`${2*(1080/315)}px #ff0000`));
 const handle=badge().querySelector('[title="Тяните для изменения размера"]');assert(handle);
 await pointer(handle,'pointerdown',100,300);await pointer(w,'pointermove',80,320);await pointer(w,'pointerup',80,320);
 assert(JSON.parse(w.localStorage.getItem('booktok_carousel_config')).socialBadge.width<80);
 await click(doc.querySelector('[title="Удалить блок"]'));assert(!badge());
 }finally{await app.close();}
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
test('28 themes preserve user photographs without slide-wide decoration',async()=>{
 const config=makeConfig('3:4');const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCWQAAAAASUVORK5CYII=';
 config.slides.forEach(slide=>{slide.backgroundImage=image;slide.backgroundZoom=1.4;slide.backgroundX=12;});
 const app=await setup(config);const {w}=app,doc=w.document;
 try {
 const select=[...doc.querySelectorAll('select')].find(el=>[...el.options].some(o=>o.value==='shadow_vow'));assert(select);assert.equal(select.options.length,28);
 const ids=[...select.options].map(option=>option.value);
 const designs=new Set();
 for(const id of ids){
  await w.__btTest.React.act(async()=>{select.value=id;select.dispatchEvent(new w.Event('change',{bubbles:true}));});
  assert.equal(doc.querySelectorAll('[data-theme-decor]').length,0,'no full-slide decorative layer');
  const exported=doc.querySelector('#export-slide-0');assert.equal(exported.querySelector('img').getAttribute('src'),image);
  assert.equal(exported.querySelectorAll('svg').length,0,'no ornaments above user images');assert.equal(exported.querySelectorAll(':scope > .pointer-events-none').length,0,'no slide-wide frames above photographs');
  designs.add(exported.querySelector('[data-block-id="block-one"]').getAttribute('style'));
  const saved=JSON.parse(w.localStorage.getItem('booktok_carousel_config'));assert.equal(saved.selectedGenre,id);assert.equal(saved.slides[0].blocks[0].x,8);assert.equal(saved.slides[0].blocks[0].textStrokeWidth,2.5);assert.equal(saved.slides[0].backgroundImage,image);assert.equal(saved.slides[0].backgroundZoom,1.4);assert.equal(saved.slides[0].backgroundX,12);
  assert.equal(saved.socialBadge.text,'ТГ: @reyaburn');assert(saved.slides[0].blocks[0].text.includes('Наследницы'));
 }
 assert(designs.size>=16,'card designs differ beyond palette');
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

test('empty social text remains editable but is absent from exports',async()=>{
 const config=makeConfig('3:4');config.socialBadge.text='';const app=await setup(config);
 try {assert(app.w.document.querySelector('#phone-device-viewport [data-social-badge]'));assert.equal(app.w.document.querySelectorAll('[id^="export-slide-"] [data-social-badge]').length,0);}
 finally{await app.close();}
});

test('v8 badge migration leaves enough room for normal block padding',async()=>{
 const config=makeConfig('3:4');config.socialBadge.height=(14*1.4+16)/420*100;
 const app=await setup(config);
 try{
  const badge=app.w.document.querySelector('#export-slide-0 [data-social-badge]');const height=parseFloat(badge.style.height)/100*1440;
  assert(height>=(24+14*1.35)*(1080/315),'legacy badge text must not be clipped by normal block padding');
  assert.equal(badge.style.backgroundColor,'rgb(24, 24, 27)');
 }finally{await app.close();}
});

async function highlightMenu(app,word) {
 const {w}=app,doc=w.document;let editor=doc.querySelector('[contenteditable="true"]');
 if(!editor){const block=doc.querySelector('#phone-device-viewport [data-block-id="block-one"]');await w.__btTest.React.act(async()=>block.dispatchEvent(new w.MouseEvent('dblclick',{bubbles:true})));editor=doc.querySelector('[contenteditable="true"]');}
 const walker=doc.createTreeWalker(editor,w.NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode())if(node.textContent.includes(word))break;
 assert(node,'target text present');const start=node.textContent.indexOf(word),range=doc.createRange();range.setStart(node,start);range.setEnd(node,start+word.length);
 await w.__btTest.React.act(async()=>{const selection=w.getSelection();selection.removeAllRanges();selection.addRange(range);editor.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));});
 assert(doc.querySelector('[aria-label="Форма цветового выделения"]'),'formatting menu exposes highlight shape');return editor;
}
async function commitInlineEditor(app,editor){
 const {w}=app;await w.__btTest.React.act(async()=>w.document.body.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true})));
 await w.__btTest.React.act(async()=>editor.dispatchEvent(new w.FocusEvent('focusout',{bubbles:true})));
}
test('per-fragment highlight shape, padding and offset survive editing and export',async()=>{
 const config=makeConfig('3:4');config.slides[0].blocks[0].text='До ==первый|#ffcc00== и **второй** после';
 const app=await setup(config);const {w,input}=app,doc=w.document;
 try {
 const editor=await highlightMenu(app,'второй');
 await input(doc.querySelector('[aria-label="Объём выделения по горизонтали"]'),'0.65');
 await input(doc.querySelector('[aria-label="Объём выделения по вертикали"]'),'0.25');
 const shape=doc.querySelector('[aria-label="Форма цветового выделения"]');await w.__btTest.React.act(async()=>{shape.value='offset';shape.dispatchEvent(new w.Event('change',{bubbles:true}));});
 await input(doc.querySelector('[aria-label="Смещение выделения X"]'),'0.2');
 await input(doc.querySelector('[aria-label="Смещение выделения Y"]'),'0.15');
 await input(doc.querySelector('[aria-label="Цвет выделения"]'),'#aa44cc');
 assert.equal(w.getSelection().toString(),'второй','slider operations retain the original selection');
 await commitInlineEditor(app,editor);
 const saved=JSON.parse(w.localStorage.getItem('booktok_carousel_config'));const tokens=w.__btTest.parse(saved.slides[0].blocks[0].text);
 const changed=tokens.find(t=>t.text==='второй');assert(changed.isBold);assert.equal(changed.highlightMeta.shape,'offset');assert.equal(changed.highlightMeta.padX,.65);assert.equal(changed.highlightMeta.padY,.25);assert.equal(changed.highlightMeta.offsetX,.2);assert.equal(changed.highlightMeta.offsetY,.15);assert.equal(changed.highlightColor,'#aa44cc');
 assert(!tokens.find(t=>t.text==='первый').highlightMeta,'other highlights retain their own style');
 const exported=doc.querySelector('#export-slide-0 [data-highlight-shape="offset"]');assert(exported);assert.equal(exported.style.padding,'0.25em 0.65em');assert.equal(exported.style.backgroundPosition,'0.2em 0.15em');assert(exported.querySelector('strong'));
 assert.equal(w.__btTest.parse(JSON.parse(JSON.stringify(saved)).slides[0].blocks[0].text).find(t=>t.text==='второй').highlightMeta.shape,'offset');
 }finally{await app.close();}
});
test('editing a fragment inside an existing highlight leaves the surrounding letters unchanged',async()=>{
 const config=makeConfig('9:16');config.slides[0].blocks[0].text='==первый|#ffcc00==';const app=await setup(config);const {w}=app,doc=w.document;
 try{
 const editor=await highlightMenu(app,'ерв');const shape=doc.querySelector('[aria-label="Форма цветового выделения"]');
 await w.__btTest.React.act(async()=>{shape.value='square';shape.dispatchEvent(new w.Event('change',{bubbles:true}));});
 await commitInlineEditor(app,editor);
 const saved=JSON.parse(w.localStorage.getItem('booktok_carousel_config'));const tokens=w.__btTest.parse(saved.slides[0].blocks[0].text);
 assert.equal(tokens.map(t=>t.text).join(''),'первый');assert.equal(tokens.find(t=>t.text==='ерв').highlightMeta.shape,'square');assert(!tokens.find(t=>t.text==='п').highlightMeta);assert(!tokens.find(t=>t.text==='ый').highlightMeta);
 }finally{await app.close();}
});
test('all highlight forms round-trip through editor HTML without losing token formatting',async()=>{
 const app=await setup();const {w}=app;
 try{
 for(const shape of ['rounded','square','offset','marker','underline']){
 const original=[{text:'Моя любовь',isHighlighted:true,isBold:true,isItalic:true,highlightColor:'#abcdef',textColor:'#123456',highlightMeta:{shape,padX:.2,padY:.1,radius:.4,offsetX:.15,offsetY:.2}}];
 const text=w.__btTest.encode(original);const html=w.__btTest.editorHtml(text,'#eeaabb','#fff');const stored=w.__btTest.encode(w.__btTest.readEditor(html));const token=w.__btTest.parse(stored)[0];
 assert.equal(token.highlightMeta.shape,shape);assert.equal(token.text,'Моя любовь');assert(token.isBold&&token.isItalic);assert.equal(token.textColor,'#123456');assert.equal(token.highlightMeta.padX,.2);
 }
 }finally{await app.close();}
});
