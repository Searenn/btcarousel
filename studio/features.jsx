// Uses the published studio's React instance so existing tools and project state stay intact.
const BT_BADGE_DEFAULT = { enabled: false, text: '@ваш_ник', x: 10, y: 82, width: 80, fontSize: 14, textColor: '#ffffff', backgroundColor: '#18181b' };
function btBadgeLayout(value, ratio) {
  const badge = { ...BT_BADGE_DEFAULT, ...value };
  const num = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const width = Math.max(20, Math.min(100, num(badge.width, 80)));
  const fontSize = Math.max(8, Math.min(32, num(badge.fontSize, 14)));
  const height = (fontSize * 1.4 + 16) / Re(ratio).previewH * 100;
  return { ...badge, text: String(badge.text ?? '').replace(/[\r\n]+/g, ' '), width, fontSize, height,
    x: Math.max(0, Math.min(100 - width, num(badge.x, 10))), y: Math.max(0, Math.min(100 - height, num(badge.y, 82))) };
}
function BTSocialBadge({config, width, isExporting, onChange, onStart}) {
  const badge = btBadgeLayout(config.socialBadge, config.ratio);
  const drag = Tt.useRef(null);
  if (!badge.enabled || !badge.text.trim()) return null;
  const s = width / 315;
  const Tag = isExporting ? 'div' : 'button';
  return <Tag type={isExporting ? undefined : 'button'} data-social-badge="true" aria-label={isExporting ? undefined : 'Переместить плашку соцсетей'}
    title={isExporting ? undefined : 'Перетащите плашку или используйте стрелки'}
    style={{position:'absolute',left:`${badge.x}%`,top:`${badge.y}%`,width:`${badge.width}%`,height:`${badge.height}%`,zIndex:40,
      display:'flex',alignItems:'center',justifyContent:'center',margin:0,padding:`0 ${10*s}px`,border:0,boxSizing:'border-box',borderRadius:10*s,
      backgroundColor:badge.backgroundColor,color:badge.textColor,font:`700 ${badge.fontSize*s}px Inter, sans-serif`,lineHeight:1.4,
      whiteSpace:'pre',overflow:'hidden',touchAction:'none',userSelect:'none',cursor:isExporting?'default':'move',pointerEvents:isExporting?'none':'auto'}}
    onClick={e=>e.stopPropagation()}
    onPointerDown={e=>{
      if (isExporting || !onChange || e.button !== 0) return;
      e.stopPropagation(); onStart?.();
      const rect=e.currentTarget.closest('[data-bt-slide]').getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      drag.current={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:badge.x,y:badge.y,width:rect.width,height:rect.height};
      e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onPointerMove={e=>{
      const start=drag.current;
      if (!start || start.pointerId!==e.pointerId) return;
      onChange(btBadgeLayout({...badge,x:start.x+(e.clientX-start.startX)/start.width*100,y:start.y+(e.clientY-start.startY)/start.height*100},config.ratio));
    }}
    onPointerUp={e=>{if(drag.current){drag.current=null;e.currentTarget.releasePointerCapture(e.pointerId);}}}
    onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
    onKeyDown={e=>{
      const step=e.shiftKey?5:1;const delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
      if (!delta || !onChange) return;
      e.preventDefault();e.stopPropagation();onStart?.();
      onChange(btBadgeLayout({...badge,x:badge.x+delta[0],y:badge.y+delta[1]},config.ratio));
    }}><span style={{display:'block',overflow:'hidden',textAlign:'center',width:'100%'}}>{badge.text}</span></Tag>;
}
const BT_INPUT={width:'100%',background:'#09090b',border:'1px solid #3f3f46',borderRadius:7,padding:'7px 9px',color:'#fafafa',boxSizing:'border-box'};
function BTBadgeControls({config,onChange,onStart}) {
  const badge=btBadgeLayout(config.socialBadge,config.ratio);
  const update=fields=>onChange(previous=>({...previous,socialBadge:btBadgeLayout({...BT_BADGE_DEFAULT,...previous.socialBadge,...fields},previous.ratio)}));
  return <section aria-label="Плашка соцсетей" style={{padding:16,borderTop:'1px solid #27272a',fontSize:11,color:'#a1a1aa',display:'grid',gap:10}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><h3 style={{fontSize:12,fontWeight:700,color:'#e4e4e7'}}>Плашка соцсетей</h3>
      <button type="button" role="switch" aria-label="Показывать плашку соцсетей" aria-checked={badge.enabled}
        onClick={()=>{onStart?.();update({enabled:!badge.enabled});}}
        style={{border:0,borderRadius:12,width:38,height:22,padding:3,background:badge.enabled?'#7c3aed':'#3f3f46',cursor:'pointer'}}>
        <span style={{display:'block',height:16,width:16,borderRadius:'50%',background:'white',transform:badge.enabled?'translateX(16px)':'none'}} /></button></div>
    <label style={{display:'grid',gap:4}}>Надпись<input aria-label="Надпись соцсетей" type="text" style={BT_INPUT} value={badge.text} onFocus={onStart} onChange={e=>update({text:e.target.value})} placeholder="ТГ: @ваш_ник · Имя автора" /></label>
    <p>Одна плашка на всех слайдах. Перетащите её в превью или переместите стрелками.</p>
    <label>Размер надписи: {badge.fontSize} px<input aria-label="Размер надписи соцсетей" type="range" min="8" max="32" value={badge.fontSize} onPointerDown={onStart} onKeyDown={onStart} onChange={e=>update({fontSize:Number(e.target.value)})} style={{width:'100%',accentColor:'#8b5cf6'}} /></label>
    <label>Ширина плашки: {badge.width}%<input aria-label="Ширина плашки соцсетей" type="range" min="20" max="100" value={badge.width} onPointerDown={onStart} onKeyDown={onStart} onChange={e=>update({width:Number(e.target.value)})} style={{width:'100%',accentColor:'#8b5cf6'}} /></label>
    <div style={{display:'flex',gap:16}}><label>Текст <input aria-label="Цвет надписи соцсетей" type="color" value={badge.textColor} onFocus={onStart} onChange={e=>update({textColor:e.target.value})} /></label>
      <label>Фон <input aria-label="Фон плашки соцсетей" type="color" value={badge.backgroundColor} onFocus={onStart} onChange={e=>update({backgroundColor:e.target.value})} /></label></div>
  </section>;
}
function BTStrokeControls({block,onChange,onStart}) {
  if(block.textEffect!=='outline') return null;
  return <label style={{display:'flex',alignItems:'center',gap:5,fontSize:9,whiteSpace:'nowrap',color:'#d4d4d8'}}>
    Толщина обводки
    <input aria-label="Толщина обводки текста" type="range" min="0" max="6" step="0.25" value={block.textStrokeWidth??0.55}
      onPointerDown={onStart} onKeyDown={onStart} onChange={e=>onChange({textStrokeWidth:Number(e.target.value)})} style={{width:60,accentColor:'#a78bfa'}} />
    <output>{block.textStrokeWidth??0.55} px</output>
    <input aria-label="Цвет обводки текста" type="color" value={block.textStrokeColor||'#000000'} onFocus={onStart} onChange={e=>onChange({textStrokeColor:e.target.value})} style={{width:20,height:20,padding:0,border:0}} />
  </label>;
}
function BTThemeDescription({id}) {
  return <div style={{padding:'0 16px 12px',fontSize:10,lineHeight:1.5,color:'#a1a1aa'}}><span style={{color:'#a78bfa'}}>{Object.keys(Ln).length} стилей</span> · {Ln[id]?.description}</div>;
}
function btCardStyle(id,p,s,block) {
  if(!block.hasCardBg || block.blockType==='chat_left' || block.blockType==='chat_right') return {};
  const shadow=(x,y,color)=>`${x*s}px ${y*s}px 0 ${color}`;
  const defaultRadius={pop_comic:3,cinema_noir:0,neon_terminal:2,dark_academia:2,scrapbook:8,editorial:0,moon_tarot:18,torn_diary:0}[id];
  if(defaultRadius===undefined) return {};
  const styles={borderRadius:`${(block.cardBgRadius??defaultRadius)*s}px`};
  if(block.cardBgOpacity!==undefined) {
    const hex=p.cardBg.match(/^#([0-9a-f]{6})$/i);
    if(hex) {
      const color=parseInt(hex[1],16);
      styles.backgroundColor=`rgba(${color>>16}, ${(color>>8)&255}, ${color&255}, ${Math.max(0,Math.min(100,block.cardBgOpacity))/100})`;
    }
  }
  switch(id) {
    case 'torn_diary': return {...styles,clipPath:'polygon(0 2%, 3% 0, 6% 2%, 9% 0, 12% 2%, 15% 0, 18% 2%, 21% 0, 24% 2%, 27% 0, 30% 2%, 33% 0, 36% 2%, 39% 0, 42% 2%, 45% 0, 48% 2%, 51% 0, 54% 2%, 57% 0, 60% 2%, 63% 0, 66% 2%, 69% 0, 72% 2%, 75% 0, 78% 2%, 81% 0, 84% 2%, 87% 0, 90% 2%, 93% 0, 96% 2%, 100% 0, 100% 98%, 97% 100%, 94% 98%, 91% 100%, 88% 98%, 85% 100%, 82% 98%, 79% 100%, 76% 98%, 73% 100%, 70% 98%, 67% 100%, 64% 98%, 61% 100%, 58% 98%, 55% 100%, 52% 98%, 49% 100%, 46% 98%, 43% 100%, 40% 98%, 37% 100%, 34% 98%, 31% 100%, 28% 98%, 25% 100%, 22% 98%, 19% 100%, 16% 98%, 13% 100%, 10% 98%, 7% 100%, 4% 98%, 0 100%)'};
    case 'pop_comic': return {...styles,border:`${2*s}px solid ${p.text}`,boxShadow:shadow(5,5,p.text)};
    case 'cinema_noir': return {...styles,borderTop:`${2*s}px solid ${p.accent}`,borderBottom:`${s}px solid ${p.accent}`};
    case 'neon_terminal': return {...styles,border:`${s}px solid ${p.accent}`,boxShadow:`0 0 ${9*s}px ${p.accent}55`};
    case 'dark_academia': case 'moon_tarot': return {...styles,border:`${3*s}px double ${p.accent}`};
    case 'scrapbook': return {...styles,border:`${s}px dashed ${p.accent}`,boxShadow:shadow(3,4,'#00000018')};
    case 'editorial': return {...styles,borderLeft:`${4*s}px solid ${p.accent}`,borderBottom:`${2*s}px solid ${p.text}`};
    default: return {};
  }
}
function BTCardDetail({id,block,s,color}) {
  if(!block.hasCardBg || block.blockType==='chat_left' || block.blockType==='chat_right' || !['torn_diary','scrapbook'].includes(id)) return null;
  return <span aria-hidden="true" style={{position:'absolute',top:0,left:'40%',width:'20%',height:8*s,background:color,opacity:.25,transform:'rotate(-3deg)',pointerEvents:'none'}} />;
}
function BTThemeDecor({id,p,width,height}) {
  if(!BT_THEMES[id]) return null;
  const w=315,h=height/width*w;
  const line=(x1,y1,x2,y2,key)=> <line key={key} x1={x1} y1={y1} x2={x2} y2={y2}/>;
  const star=(x,y,r,key)=> <path key={key} d={`M${x} ${y-r} L${x+r*.2} ${y-r*.2} L${x+r} ${y} L${x+r*.2} ${y+r*.2} L${x} ${y+r} L${x-r*.2} ${y+r*.2} L${x-r} ${y} L${x-r*.2} ${y-r*.2}Z`} fill={p.accent} stroke="none"/>;
  let decor;
  switch(id) {
    case 'torn_diary': decor=<><g opacity=".2" strokeWidth=".6">{Array.from({length:Math.ceil(h/24)},(_,i)=>line(0,i*24,w,i*24,i))}{line(24,0,24,h)}</g><g opacity=".3" fill={p.accent} stroke="none">{Array.from({length:Math.ceil(h/80)},(_,i)=><circle key={i} cx="9" cy={40+i*80} r="3"/>)}</g></>;break;
    case 'pop_comic': decor=<><g opacity=".3" stroke="none" fill={p.accent}>{Array.from({length:32*16},(_,i)=>{const x=i%32*10,y=Math.floor(i/32)*10;return <circle key={i} cx={x+5} cy={y<80?y+5:h-(y-80)-5} r="1.4"/>;})}</g>{star(w-35,45,30)}{star(24,h-48,23)}<g stroke={p.text} strokeWidth="3">{line(12,78,38,64)}{line(w-45,h-62,w-18,h-40)}</g></>;break;
    case 'cinema_noir': decor=<><g opacity=".3" fill={p.text} stroke="none">{Array.from({length:Math.ceil(h/24)},(_,i)=><g key={i}><rect x="4" y={12+i*24} width="6" height="12"/><rect x={w-10} y={12+i*24} width="6" height="12"/></g>)}</g><g strokeWidth="1" opacity=".8">{[[24,24,1,1],[w-24,24,-1,1],[24,h-24,1,-1],[w-24,h-24,-1,-1]].map(([x,y,dx,dy],i)=><path key={i} d={`M${x+dx*22} ${y} H${x} V${y+dy*22}`} fill="none"/>)}</g></>;break;
    case 'neon_terminal': decor=<><g opacity=".13" strokeWidth=".5">{Array.from({length:15},(_,i)=>line(i*22,0,i*22,h,'x'+i))}{Array.from({length:Math.ceil(h/22)},(_,i)=>line(0,i*22,w,i*22,'y'+i))}</g><g opacity=".6" fill="none"><ellipse cx={w-5} cy="25" rx="95" ry="42" transform={`rotate(-25 ${w-5} 25)`}/><ellipse cx="0" cy={h-20} rx="90" ry="40" transform={`rotate(-25 0 ${h-20})`}/>{line(20,30,60,30)}{line(w-60,h-30,w-20,h-30)}</g></>;break;
    case 'dark_academia': decor=<><g fill={p.text} stroke="none" opacity=".16">{Array.from({length:450},(_,i)=><circle key={i} cx={(i*73.37)%w} cy={(i*41.53)%h} r=".4"/>)}</g><g opacity=".7" fill="none" strokeWidth=".6"><rect x="12" y="12" width={w-24} height={h-24}/><rect x="17" y="17" width={w-34} height={h-34}/>{line(w/2-40,35,w/2+40,35)}{line(w/2-40,h-35,w/2+40,h-35)}</g>{star(w/2,35,5)}{star(w/2,h-35,5)}</>;break;
    case 'scrapbook': decor=<><g opacity=".17" fill={p.accent} stroke="none"><rect x="-20" y="20" width="120" height="35" transform="rotate(-7 20 30)"/><rect x={w-100} y={h-45} width="120" height="35" transform={`rotate(8 ${w-30} ${h-30})`}/></g><rect x="10" y="10" width={w-20} height={h-20} fill="none" strokeDasharray="3 5" strokeWidth=".7"/>{star(w-35,45,13)}{star(25,h-55,11)}{star(w-60,30,4)}</>;break;
    case 'editorial': decor=<><g fill={p.accent} stroke="none"><rect width="9" height={h}/><rect x="20" y="30" width={w-40} height="3"/><text x="15" y="125" fontFamily="Georgia, serif" fontWeight="bold" fontSize="130" opacity=".16">“</text><rect x={w-55} y={h-30} width="35" height="5"/></g>{line(20,h-40,w-20,h-40)}</>;break;
    case 'moon_tarot': decor=<><g opacity=".65" fill="none" strokeWidth=".6"><path d={`M14 ${h-14} V${w/2} A${w/2-14} ${w/2-14} 0 0 1 ${w-14} ${w/2} V${h-14}Z`}/><circle cx={w/2} cy="60" r="24"/><path d={`M${w/2+12} 37 A22 22 0 0 0 ${w/2+12} 81`}/>{line(w/2-35,h-32,w/2+35,h-32)}</g><g opacity=".7">{Array.from({length:24},(_,i)=>star(24+(i*59.3)%(w-48),28+(i*97.1)%(h-56),i%3?2:4,i))}</g></>;break;
  }
  return <svg aria-hidden="true" data-theme-decor={id} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${w} ${h}`} width={width} height={height}
    style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',overflow:'hidden'}} stroke={p.accent} fill="none">{decor}</svg>;
}
