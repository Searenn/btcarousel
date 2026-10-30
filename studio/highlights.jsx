const BT_HIGHLIGHT_DEFAULT = {shape:'rounded',padX:.428,padY:.143,radius:.286,offsetX:.12,offsetY:.12};
function btHighlightMeta(value={}) {
  const n=(key,fallback,max)=>Math.max(0,Math.min(max,Number.isFinite(Number(value[key]))?Number(value[key]):fallback));
  return {shape:['rounded','square','offset','marker','underline'].includes(value.shape)?value.shape:'rounded',
    padX:n('padX',.428,.9),padY:n('padY',.143,.5),radius:n('radius',.286,1),offsetX:n('offsetX',.12,.5),offsetY:n('offsetY',.12,.5)};
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
function btHighlightCss(token,palette) {
  const color=token.highlightColor||palette.accent;
  const meta=token.highlightMeta?btHighlightMeta(token.highlightMeta):token.highlightStyle==='marker'?{...BT_HIGHLIGHT_DEFAULT,shape:'marker',padX:0,padY:0,radius:0}:BT_HIGHLIGHT_DEFAULT;
  const css={backgroundColor:color,color:token.textColor||(['marker','underline'].includes(meta.shape)?undefined:token.highlightTextColor||(token.highlightColor?Gh(token.highlightColor):palette.accentText)),
    display:'inline',boxDecorationBreak:'clone',WebkitBoxDecorationBreak:'clone',
    padding:`${meta.padY}em ${meta.padX}em`,margin:meta.padX?'0 0.08em':'0',borderRadius:meta.shape==='rounded'?`${meta.radius}em`:'0'};
  if(!token.highlightMeta&&token.highlightStyle!=='marker') css.margin='0 0.143em';
  if(meta.shape==='offset') Object.assign(css,{backgroundColor:'transparent',backgroundImage:`linear-gradient(${color}, ${color})`,backgroundRepeat:'no-repeat',
    backgroundPosition:`${meta.offsetX}em ${meta.offsetY}em`,backgroundSize:`calc(100% - ${meta.offsetX}em) calc(100% - ${meta.offsetY}em)`});
  if(meta.shape==='underline') Object.assign(css,{backgroundColor:'transparent',backgroundImage:`linear-gradient(transparent 65%, ${color} 65%)`});
  return css;
}
function btEscape(value) {return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function btTokensHtml(tokens,accent,accentText) {
  return tokens.map(token=>{
    let text=btEscape(token.text);
    if(token.isBold) text=`<b>${text}</b>`;
    if(token.isItalic) text=`<i>${text}</i>`;
    if(!token.isHighlighted&&!token.textColor) return text;
    const css=token.isHighlighted?btHighlightCss(token,{accent,accentText}):{color:token.textColor};
    const style=Object.entries(css).filter(([,v])=>v!==undefined).map(([key,value])=>`${key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}:${value}`).join(';');
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
    <label>Форма <select aria-label="Форма цветового выделения" value={value.shape} onChange={e=>{const shape=e.target.value;update({shape,...(shape==='marker'?{padX:0,padY:0,radius:0}:shape==='rounded'?{radius:.286}:{radius:0})});}} style={{background:'#18181b',color:'#eee',border:'1px solid #52525b',borderRadius:4,padding:3}}>
      <option value="rounded">Скруглённое</option><option value="square">Прямоугольник</option><option value="offset">Смещённый блок</option><option value="marker">Маркер</option><option value="underline">Подчёркивание</option>
    </select></label>
    <label>Отступ ↔ <input aria-label="Объём выделения по горизонтали" type="range" min="0" max="0.9" step="0.01" value={value.padX} onChange={e=>update({padX:Number(e.target.value)})} style={{width:65}}/></label>
    <label>Отступ ↕ <input aria-label="Объём выделения по вертикали" type="range" min="0" max="0.5" step="0.01" value={value.padY} onChange={e=>update({padY:Number(e.target.value)})} style={{width:65}}/></label>
    {value.shape==='rounded'&&<label>Радиус <input aria-label="Скругление цветового выделения" type="range" min="0" max="1" step="0.01" value={value.radius} onChange={e=>update({radius:Number(e.target.value)})} style={{width:55}}/></label>}
    {value.shape==='offset'&&<><label>Сдвиг X <input aria-label="Смещение выделения X" type="range" min="0" max="0.5" step="0.01" value={value.offsetX} onChange={e=>update({offsetX:Number(e.target.value)})} style={{width:50}}/></label><label>Y <input aria-label="Смещение выделения Y" type="range" min="0" max="0.5" step="0.01" value={value.offsetY} onChange={e=>update({offsetY:Number(e.target.value)})} style={{width:50}}/></label></>}
    <input aria-label="Цвет выделения" type="color" value={btHexColor(value.color||palette.accent)} onChange={e=>update({color:e.target.value})} style={{width:22,height:22}}/>
  </div>;
}
