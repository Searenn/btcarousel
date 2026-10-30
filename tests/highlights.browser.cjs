const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium:pw}=require(process.env.BT_PLAYWRIGHT_MODULE||'playwright-core');
const root=path.resolve(__dirname,'..');
const config={slides:[{id:'one',blocks:[{id:'block-one',text:'Он всегда приходит за мной',x:7,y:22,width:86,height:36,fontSize:20,fontWeight:'bold',isItalic:false,align:'center',hasCardBg:true}],backgroundImage:null,bgColor:null}],palette:{bg:'#f0e9e2',text:'#30242b',accent:'#e594ae',accentText:'#30242b',cardBg:'rgba(255,255,255,0.98)'},selectedGenre:'romantic',customFontFamily:'Inter',slideDuration:3,transitionDuration:.6,useUniformDuration:true,ratio:'3:4',showTiktokHud:false};
(async()=>{
 let executablePath=process.env.BT_CHROMIUM_EXECUTABLE;let args=['--no-sandbox'];
 if(process.env.BT_CHROMIUM_MODULE){const chromium=(await import(require.resolve(process.env.BT_CHROMIUM_MODULE))).default;executablePath=await chromium.executablePath();args=[...chromium.args,'--single-process','--no-zygote','--disable-gpu'];}
 if(!executablePath)throw new Error('Set BT_CHROMIUM_EXECUTABLE to an installed Chrome/Chromium binary.');
 const browser=await pw.launch({executablePath,headless:true,args});
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='btcarousel.test'){
   const path=url.pathname==='/'?'/index.html':url.pathname;
   try{const data=fs.readFileSync(root+path);await route.fulfill({body:data,contentType:path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':'text/html'});}catch{await route.fulfill({status:404,body:''});}
  }else await route.fulfill({body:'',contentType:'text/css'});
 });
 await page.addInitScript(config=>localStorage.setItem('booktok_carousel_config',JSON.stringify(config)),config);
 await page.goto('https://btcarousel.test/');
 const block=page.locator('#phone-device-viewport [data-block-id="block-one"]');await block.dblclick();const editor=page.locator('[contenteditable=true]');await editor.waitFor();
 await editor.evaluate(el=>{const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const node=walker.nextNode();const range=document.createRange();range.setStart(node,3);range.setEnd(node,9);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);});
 await editor.dispatchEvent('contextmenu');await page.getByLabel('Форма цветового выделения',{exact:true}).selectOption('underline');
 const paint=editor.locator('[data-bt-highlight-paint]');
 async function range(label,fraction){const el=page.getByLabel(label,{exact:true});const b=await el.boundingBox();assert(b);await page.mouse.move(b.x+b.width*.5,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+7+(b.width-14)*fraction,b.y+b.height/2,{steps:8});await page.mouse.up();const actual=Number(await el.inputValue());const limits=await el.evaluate(el=>({min:Number(el.min),max:Number(el.max)}));if(fraction===0)assert.equal(actual,limits.min);if(fraction===1)assert.equal(actual,limits.max,'native slider drag must reach its maximum without losing focus');}
 const small=await paint.boundingBox();await range('Толщина подчёркивания',1);const thick=await paint.boundingBox();assert(thick.height>small.height*2,JSON.stringify({small,thick}));
 const before=await paint.boundingBox();await range('Объём выделения по горизонтали',1);const wide=await paint.boundingBox();assert(wide.width>before.width+5,JSON.stringify({before,wide}));
 const bottomBefore=await editor.evaluate(el=>{const paint=el.querySelector('[data-bt-highlight-paint]').getBoundingClientRect(),text=el.querySelector('[data-bt-highlight-text]').getBoundingClientRect();return paint.y-text.bottom;});
 await range('Объём выделения по вертикали',1);
 const bottomAfter=await editor.evaluate(el=>{const paint=el.querySelector('[data-bt-highlight-paint]').getBoundingClientRect(),text=el.querySelector('[data-bt-highlight-text]').getBoundingClientRect();return paint.y-text.bottom;});assert(bottomAfter>bottomBefore+5,JSON.stringify({bottomBefore,bottomAfter}));
 await page.getByLabel('Края цветового выделения',{exact:true}).selectOption('bevel');
 await range('Размер среза выделения',0);const bevelBefore=await paint.screenshot();const clipZero=await paint.evaluate(el=>getComputedStyle(el).clipPath);await range('Размер среза выделения',1);const clipMax=await paint.evaluate(el=>getComputedStyle(el).clipPath);assert.notEqual(clipZero,clipMax);const bevelAfter=await paint.screenshot();assert(!bevelBefore.equals(bevelAfter),'bevel slider must change rendered pixels');
 
 await page.getByLabel('Края цветового выделения',{exact:true}).selectOption('round');await range('Скругление цветового выделения',0);const roundBefore=await paint.screenshot();const zeroRadius=await paint.evaluate(el=>getComputedStyle(el).borderRadius);await range('Скругление цветового выделения',1);const maxRadius=await paint.evaluate(el=>getComputedStyle(el).borderRadius);assert.notEqual(zeroRadius,maxRadius);const roundAfter=await paint.screenshot();assert(!roundBefore.equals(roundAfter),'radius slider must change rendered pixels');
 // Clear the visual selection to inspect the actual paint; rangeRef retains its selection.
 await page.evaluate(()=>window.getSelection().removeAllRanges());
 await page.evaluate(()=>document.body.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})));await editor.evaluate(el=>el.dispatchEvent(new FocusEvent('focusout',{bubbles:true})));
 const committed=await page.evaluate(()=>JSON.parse(localStorage.getItem('booktok_carousel_config')));assert(committed.slides[0].blocks[0].text.includes('bt:'));
 const exportedPaint=page.locator('#export-slide-0 [data-bt-highlight-paint]');assert.equal(await exportedPaint.evaluate(el=>getComputedStyle(el).borderRadius),maxRadius);
 page.on('dialog',async d=>{await d.accept();});
 const downloadPromise=page.waitForEvent('download',{timeout:30000});await page.getByRole('button',{name:'Скачать слайды JPG'}).click();const download=await downloadPromise;assert(download.suggestedFilename().endsWith('.zip'));assert.equal(await download.failure(),null);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({PASS:true,small,thick,before,wide,bottomBefore,bottomAfter,clipZero,clipMax,zeroRadius,maxRadius}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
