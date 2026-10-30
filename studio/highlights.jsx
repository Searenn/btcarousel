const BT_HIGHLIGHT_DEFAULT = {shape:'rounded',padX:.428,padY:.143,radius:.286,offsetX:.12,offsetY:.12,edge:'round',cut:.15,thickness:.16};
function btHighlightMeta(value={}) {
  const n=(key,fallback,max)=>Math.max(0,Math.min(max,Number.isFinite(Number(value[key]))?Number(value[key]):fallback));
  return {shape:['rounded','square','offset','marker','underline'].includes(value.shape)?value.shape:'rounded',
    padX:n('padX',.428,.9),padY:n('padY',.143,.5),radius:n('radius',.286,1),offsetX:n('offsetX',.12,.5),offsetY:n('offsetY',.12,.5),edge:['round','square','bevel'].includes(value.edge)?value.edge:(value.shape==='rounded'?'round':'square'),cut:n('cut',.15,.6),thickness:Math.max(.03,n('thickness',.16,.6))};
}
function btParseRichTokens(text) {
  const tokens=[];
  for(const part of String(text||'').split(/(==.*?==|\*\*.*?\*\*|\*.*?\*)/g)) {
    if(!part) continue;
    let token={text:part,isHighlighted:false,isBold:false,isItalic:false};
    if(part.startsWith('==')&&part.endsWith('==')) {
      const cols=part.slice(2,-2).split('|');token.text=cols.shift()||'';
      let color=cols[0]?.trim(),textColor=cols[1]?.trim();const marker=!!color?.startsWith('marker:');
      if(marker) color=color.slice(7);
      if(color==='transparent') color=undefined;
      token={...token,isHighlighted:color!==undefined||cols.length===0,highlightColor:color,highlightStyle:marker?'marker':'pill',
        highlightTextColor:marker?textColor:color?textColor||Gh(color):undefined,textColor:textColor||undefined};
      if(cols[2]?.startsWith('bt:')) try{token.highlightMeta=btHighlightMeta(JSON.parse(decodeURIComponent(cols[2].slice(3))));}catch{}
    }
    let value=token.text;
    if(value.startsWith('***')&&value.endsWith('***')){token.isBold=true;token.isItalic=true;value=value.slice(3,-3);}
    else if(value.startsWith('**')&&value.endsWith('**')){token.isBold=true;value=value.slice(2,-2);}
    else if(value.startsWith('*')&&value.endsWith('*')){token.isItalic=true;value=value.slice(1,-1);}
    tokens.push({...token,text:value});
  }
  return tokens;
}
function btHighlightLayout(token,palette) {
  const color=token.highlightColor||palette.accent;
  const meta=btHighlightMeta(token.highlightMeta);
  const underline=meta.shape==='underline';
  const outer={position:'relative',display:'inline-block',verticalAlign:'baseline',maxWidth:'100%',boxSizing:'border-box',
    whiteSpace:'pre-wrap',overflowWrap:'anywhere',isolation:'isolate',lineHeight:'inherit',
    color:token.textColor||(['marker','underline'].includes(meta.shape)?undefined:token.highlightTextColor||(token.highlightColor?Gh(token.highlightColor):palette.accentText)),
    padding:underline?`0 ${meta.padX}em ${meta.padY+meta.thickness}em`:`${meta.padY}em ${meta.padX}em`,margin:'0 .05em'};
  const paint={position:'absolute',display:'block',pointerEvents:'none',userSelect:'none',zIndex:0,backgroundColor:color,
    left:0,right:0,...(underline?{bottom:0,height:`${meta.thickness}em`}:{top:0,bottom:0}),
    borderRadius:meta.edge==='round'?`${underline?meta.radius*meta.thickness/2:meta.radius}em`:'0'};
  if(meta.shape==='offset')paint.transform=`translate(${meta.offsetX}em, ${meta.offsetY}em)`;
  if(meta.edge==='bevel') {
    // Cut only the paint layer. Glyphs and the editing selection stay intact.
    const cutX=`${meta.cut}em`,cutY=`${underline?Math.min(meta.cut,meta.thickness/2):meta.cut}em`;
    paint.clipPath=`polygon(${cutX} 0, calc(100% - ${cutX}) 0, 100% ${cutY}, 100% calc(100% - ${cutY}), calc(100% - ${cutX}) 100%, ${cutX} 100%, 0 calc(100% - ${cutY}), 0 ${cutY})`;
    paint.borderRadius='0';
  }
  return {outer,paint,content:{position:'relative',zIndex:1}};
}
function btHighlightCss(token,palette) {
  if(token.highlightMeta)return btHighlightLayout(token,palette).outer;
  const marker=token.highlightStyle==='marker';
  return {backgroundColor:token.highlightColor||palette.accent,color:token.textColor||(marker?undefined:token.highlightTextColor||palette.accentText),
    display:'inline',boxDecorationBreak:'clone',WebkitBoxDecorationBreak:'clone',padding:marker?'0':'0.143em 0.428em',margin:marker?'0':'0 0.143em',borderRadius:marker?'0':'0.286em'};
}
function btHighlightElement(token,palette,children,key) {
  if(!token.highlightMeta)return Tt.createElement('span',{key,'data-highlight-shape':token.highlightStyle==='marker'?'marker':'rounded',style:btHighlightCss(token,palette)},children);
  const layout=btHighlightLayout(token,palette);
  return Tt.createElement('span',{key,'data-highlight-shape':token.highlightMeta.shape,style:layout.outer},
    Tt.createElement('span',{'data-bt-highlight-paint':'true','aria-hidden':'true',contentEditable:false,style:layout.paint}),
    Tt.createElement('span',{'data-bt-highlight-text':'true',style:layout.content},children));
}
function btCssText(css){return Object.entries(css).filter(([,v])=>v!==undefined).map(([key,value])=>`${key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}:${value}`).join(';');}
function btEscape(value) {return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function btTokensHtml(tokens,accent,accentText) {
  return tokens.map(token=>{
    let text=btEscape(token.text);
    if(token.isBold) text=`<b>${text}</b>`;
    if(token.isItalic) text=`<i>${text}</i>`;
    if(!token.isHighlighted&&!token.textColor) return text;
    const css=token.isHighlighted?btHighlightCss(token,{accent,accentText}):{color:token.textColor};
    const style=btCssText(css);
    if(token.highlightMeta){const layout=btHighlightLayout(token,{accent,accentText});text=`<span data-bt-highlight-paint="true" contenteditable="false" aria-hidden="true" style="${btEscape(btCssText(layout.paint))}"></span><span data-bt-highlight-text="true" style="${btEscape(btCssText(layout.content))}">${text}</span>`;}
    return `<span style="${btEscape(style)}" ${token.isHighlighted?`data-color="${btEscape(token.highlightColor||accent)}" data-highlight-style="${token.highlightStyle||'pill'}"`:''} ${token.textColor?`data-text-color="${btEscape(token.textColor)}"`:''} ${token.highlightMeta?`data-bt-highlight="${btEscape(JSON.stringify(token.highlightMeta))}"`:''}>${text}</span>`;
  }).join('');
}
function btEditorHtml(text,accent,accentText){return btTokensHtml(btParseRichTokens(text),accent,accentText);}
function btReadEditorTokens(value) {
  let root=value;
  if(typeof value==='string'){root=document.createElement('div');root.innerHTML=value;}
  const tokens=[];
  const push=(text,state)=>{if(text)tokens.push({...state,text});};
  const visit=(node,state)=>{
    if(node.nodeType===3){push(node.textContent,state);return;}
    if(node.nodeType!==1&&node.nodeType!==11)return;
    if(node.nodeType===1&&node.hasAttribute('data-bt-highlight-paint'))return;
    const tag=node.tagName;
    if(tag==='BR'){push('\n',state);return;}
    if(['DIV','P','BLOCKQUOTE'].includes(tag)&&tokens.length&&!tokens[tokens.length-1].text.endsWith('\n'))push('\n',{});
    const next={...state};
    if(['B','STRONG'].includes(tag))next.isBold=true;
    if(['I','EM'].includes(tag))next.isItalic=true;
    if(node.nodeType===1){
      const isHighlight=node.hasAttribute('data-color')||!!node.style.backgroundColor||node.hasAttribute('data-bt-highlight');
      if(isHighlight){next.isHighlighted=true;next.highlightColor=node.getAttribute('data-color')||btHexColor(node.style.backgroundColor);next.highlightStyle=node.getAttribute('data-highlight-style')||'pill';
        if(node.hasAttribute('data-bt-highlight'))try{next.highlightMeta=btHighlightMeta(JSON.parse(node.getAttribute('data-bt-highlight')));}catch{}
      }
      const textColor=node.getAttribute('data-text-color')||(tag==='FONT'?node.getAttribute('color'):undefined);
      if(textColor)next.textColor=textColor;else if(!isHighlight&&node.style.color)next.textColor=btHexColor(node.style.color);
    }
    for(const child of node.childNodes)visit(child,next);
  };
  for(const child of root.childNodes)visit(child,{isHighlighted:false,isBold:false,isItalic:false});
  return tokens;
}
function btEncodeTokens(tokens) {
  const merged=[];
  for(const token of tokens){
    const key=JSON.stringify({...token,text:undefined});
    if(merged.length&&merged[merged.length-1].key===key)merged[merged.length-1].token.text+=token.text;
    else merged.push({key,token:{...token}});
  }
  return merged.map(({token})=>{
    let text=token.text;if(token.isItalic)text=`*${text}*`;if(token.isBold)text=`**${text}**`;
    if(token.isHighlighted){
      if(token.highlightMeta)return `==${text}|${token.highlightColor||''}|${token.textColor||''}|bt:${encodeURIComponent(JSON.stringify(btHighlightMeta(token.highlightMeta)))}==`;
      return token.highlightColor||token.textColor?`==${text}|${token.highlightStyle==='marker'?'marker:':''}${token.highlightColor||''}${token.textColor?'|'+token.textColor:''}==`:`==${text}==`;
    }
    return token.textColor?`==${text}|transparent|${token.textColor}==`:text;
  }).join('');
}
function btSelectionOffsets(editor,range){
  const prefix=range.cloneRange();prefix.selectNodeContents(editor);prefix.setEnd(range.startContainer,range.startOffset);
  const end=range.cloneRange();end.selectNodeContents(editor);end.setEnd(range.endContainer,range.endOffset);
  const length=fragment=>btReadEditorTokens(fragment).reduce((sum,t)=>sum+t.text.length,0);
  return [length(prefix.cloneContents()),length(end.cloneContents())];
}
function btRestoreTextRange(editor,start,end,rangeRef){
  const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);const nodes=[];let node;let total=0;
  while(node=walker.nextNode()){nodes.push({node,start:total,end:total+node.textContent.length});total+=node.textContent.length;}
  if(!nodes.length)return;
  const point=offset=>{const item=nodes.find(n=>offset<=n.end)||nodes[nodes.length-1];return [item.node,Math.max(0,Math.min(item.node.textContent.length,offset-item.start))];};
  const range=document.createRange();range.setStart(...point(start));range.setEnd(...point(end));rangeRef.current=range.cloneRange();
  // Re-selecting in Chromium focuses contenteditable and interrupts a native slider drag.
  // Keep the target in rangeRef while a toolbar input owns focus.
  const active=document.activeElement;
  if(active?.closest?.('.formatting-toolbar-btn')&&['INPUT','SELECT'].includes(active.tagName))return;
  const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
}
function btApplyHighlight({editorId,rangeRef,palette,value,onStart}) {
  const editor=document.getElementById(`editable-div-${editorId}`),range=rangeRef.current;
  if(!editor||!range||!editor.contains(range.commonAncestorContainer)||range.collapsed)return false;
  onStart?.();const [start,end]=btSelectionOffsets(editor,range);const tokens=btReadEditorTokens(editor);const result=[];let offset=0;
  const meta=btHighlightMeta(value);
  for(const token of tokens){
    const first=Math.max(0,start-offset),last=Math.min(token.text.length,end-offset);
    if(last>first){
      if(first)result.push({...token,text:token.text.slice(0,first)});
      result.push({...token,text:token.text.slice(first,last),isHighlighted:true,highlightColor:value.color||token.highlightColor||palette.accent,
        highlightStyle:meta.shape==='marker'?'marker':'pill',highlightMeta:meta});
      if(last<token.text.length)result.push({...token,text:token.text.slice(last)});
    }else result.push(token);
    offset+=token.text.length;
  }
  editor.innerHTML=btTokensHtml(result,palette.accent,palette.accentText);btRestoreTextRange(editor,start,end,rangeRef);return true;
}
function BTHighlightControls({editorId,rangeRef,palette,draft,onDraft,onStart}){
  const [value,setValue]=Tt.useState(()=>{
    const editor=document.getElementById(`editable-div-${editorId}`),range=rangeRef.current;
    if(editor&&range&&editor.contains(range.commonAncestorContainer)){
      const [start]=btSelectionOffsets(editor,range);let offset=0;
      for(const token of btReadEditorTokens(editor)){if(start<offset+token.text.length){if(token.isHighlighted)return {...(token.highlightMeta||{...BT_HIGHLIGHT_DEFAULT,...(token.highlightStyle==='marker'?{shape:'marker',padX:0,padY:0,radius:0}:{})}),color:token.highlightColor||palette.accent};break;}offset+=token.text.length;}
    }
    return {...BT_HIGHLIGHT_DEFAULT,...draft,color:draft.color||palette.accent};
  });
  const update=fields=>{const next={...value,...fields};setValue(next);onDraft(next);btApplyHighlight({editorId,rangeRef,palette,value:next,onStart});};
  return <div aria-label="Форма и размер выделения" className="formatting-toolbar-btn" style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',width:'100%',borderTop:'1px solid #3f3f46',paddingTop:6,fontSize:10}}>
    <label>Форма <select aria-label="Форма цветового выделения" value={value.shape} onChange={e=>{const shape=e.target.value;update({shape,...(shape==='marker'?{padX:0,padY:0,edge:'square'}:shape==='rounded'?{edge:'round',radius:.286}:shape==='underline'?{edge:'square',thickness:.16,padY:.1}:{edge:'square'})});}} style={{background:'#18181b',color:'#eee',border:'1px solid #52525b',borderRadius:4,padding:3}}>
      <option value="rounded">Скруглённое</option><option value="square">Прямоугольник</option><option value="offset">Смещённый блок</option><option value="marker">Маркер</option><option value="underline">Подчёркивание</option>
    </select></label>
    <label>Отступ ↔ <output style={{display:'inline-block',width:'3.5em',fontVariantNumeric:'tabular-nums'}}>{Math.round(value.padX*100)}%</output> <input aria-label="Объём выделения по горизонтали" type="range" min="0" max="0.9" step="0.01" value={value.padX} onChange={e=>update({padX:Number(e.target.value)})} style={{width:65}}/></label>
    <label>{value.shape==='underline'?'До линии':'Отступ ↕'} <output style={{display:'inline-block',width:'3.5em',fontVariantNumeric:'tabular-nums'}}>{Math.round(value.padY*100)}%</output> <input aria-label="Объём выделения по вертикали" type="range" min="0" max="0.5" step="0.01" value={value.padY} onChange={e=>update({padY:Number(e.target.value)})} style={{width:65}}/></label>
    <label>Края <select aria-label="Края цветового выделения" value={value.edge||btHighlightMeta(value).edge} onChange={e=>update({edge:e.target.value})} style={{background:'#18181b',color:'#eee',border:'1px solid #52525b'}}><option value="square">Прямые</option><option value="round">Круглые</option><option value="bevel">Срезанные</option></select></label>
    {(value.edge||btHighlightMeta(value).edge)==='round'&&<label>Радиус <input aria-label="Скругление цветового выделения" type="range" min="0" max="1" step="0.01" value={value.radius} onChange={e=>update({radius:Number(e.target.value)})} style={{width:55}}/></label>}
    {(value.edge||btHighlightMeta(value).edge)==='bevel'&&<label>Срез <input aria-label="Размер среза выделения" type="range" min="0" max="0.6" step="0.01" value={value.cut??.15} onChange={e=>update({cut:Number(e.target.value)})} style={{width:60}}/></label>}
    {value.shape==='underline'&&<label>Толщина линии <input aria-label="Толщина подчёркивания" type="range" min="0.03" max="0.6" step="0.01" value={value.thickness??.16} onChange={e=>update({thickness:Number(e.target.value)})} style={{width:65}}/></label>}
    {value.shape==='offset'&&<><label>Сдвиг X <input aria-label="Смещение выделения X" type="range" min="0" max="0.5" step="0.01" value={value.offsetX} onChange={e=>update({offsetX:Number(e.target.value)})} style={{width:50}}/></label><label>Y <input aria-label="Смещение выделения Y" type="range" min="0" max="0.5" step="0.01" value={value.offsetY} onChange={e=>update({offsetY:Number(e.target.value)})} style={{width:50}}/></label></>}
    <input aria-label="Цвет выделения" type="color" value={btHexColor(value.color||palette.accent)} onChange={e=>update({color:e.target.value})} style={{width:22,height:22}}/>
  </div>;
}
