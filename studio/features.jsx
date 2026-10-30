// Social media is a shared virtual TextBlock, rendered and edited by the existing block components.
const BT_SOCIAL_ID = '__bt_social_badge__';
const BT_BADGE_DEFAULT = { enabled: false, text: '@ваш_ник', x: 10, y: 82, width: 80, fontSize: 14, fontWeight: 'bold', isItalic: false, align: 'center', hasCardBg: true, blockType: 'default', verticalAlign: 'center' };
function btBadgeLayout(value, ratio) {
  const badge = { ...BT_BADGE_DEFAULT, ...value };
  const num = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const width = Math.max(10, Math.min(100, num(badge.width, 80)));
  const fontSize = Math.max(8, Math.min(48, num(badge.fontSize, 14)));
  // v8 used a compact custom pill with less padding; expand it once for the normal block renderer.
  const legacy = value && value.hasCardBg === undefined && value.fontWeight === undefined;
  const height = Math.max(4, Math.min(100, num(legacy ? undefined : badge.height, (fontSize * 1.4 + 24) / Re(ratio).previewH * 100)));
  return { ...badge, id: BT_SOCIAL_ID, text: String(badge.text ?? ''), width, fontSize, height,
    cardBgColor: badge.cardBgColor ?? badge.backgroundColor,
    x: Math.max(0, Math.min(100 - width, num(badge.x, 10))), y: Math.max(0, Math.min(100 - height, num(badge.y, 82))) };
}
function btRenderBlocks(slide, config, exporting = false) {
  const badge = btBadgeLayout(config.socialBadge, config.ratio);
  return [...(slide?.blocks || []), ...(badge.enabled && (!exporting || badge.text.trim()) ? [badge] : [])];
}
function btMoveSocialKey(block, event, config, onChange, onStart) {
  if(block.id!==BT_SOCIAL_ID || event.target!==event.currentTarget || !onChange) return;
  const step=event.shiftKey?5:1;
  const delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key];
  if(!delta) return;
  event.preventDefault();event.stopPropagation();onStart?.();
  onChange(btBadgeLayout({...block,x:block.x+delta[0],y:block.y+delta[1]},config.ratio));
}
function BTBadgeToggle({config,onChange,onSelect,onStart}) {
  const enabled=!!config.socialBadge?.enabled;
  return <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:8,fontSize:11}}>
    <button type="button" role="switch" aria-label="Показывать блок соцсетей" aria-checked={enabled}
      onClick={event=>{event.stopPropagation();onStart?.();onChange({socialBadge:btBadgeLayout({...config.socialBadge,enabled:!enabled},config.ratio)});onSelect(enabled?null:BT_SOCIAL_ID);}}
      style={{border:'1px solid #52525b',borderRadius:8,padding:'6px 10px',background:enabled?'#3b2460':'#18181b',color:enabled?'#ddd6fe':'#a1a1aa',cursor:'pointer'}}>Соцсети {enabled?'✓':'+'}</button>
    <span style={{color:'#71717a'}}>Общий блок для всех слайдов · оформление по клику</span>
  </div>;
}
function BTBlockColors({block,palette,onChange,onStart}) {
  return <span style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:'#a1a1aa'}}>
    <label>Текст <input aria-label="Цвет текста блока" type="color" value={block.textColor||palette.text} onFocus={onStart} onChange={e=>onChange({textColor:e.target.value})} style={{width:20,height:20,padding:0,border:0}} /></label>
    <label>Подложка <input aria-label="Цвет подложки блока" type="color" value={btHexColor(block.cardBgColor||palette.cardBg)} onFocus={onStart} onChange={e=>onChange({cardBgColor:e.target.value})} style={{width:20,height:20,padding:0,border:0}} /></label>
    <button type="button" title="Цвета текущей темы" onClick={()=>{onStart?.();onChange({textColor:undefined,cardBgColor:undefined,backgroundColor:undefined});}} style={{fontSize:9,color:'#a1a1aa',cursor:'pointer'}}>↺</button>
  </span>;
}
function btHexColor(color) {
  if(/^#[0-9a-f]{6}$/i.test(color)) return color;
  const rgb=String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return rgb?'#'+rgb.slice(1,4).map(value=>Number(value).toString(16).padStart(2,'0')).join(''):'#18181b';
}
function btOpacityColor(color,opacity) {
  if(opacity===undefined) return color;
  const hex=btHexColor(color),number=parseInt(hex.slice(1),16);
  return `rgba(${number>>16}, ${(number>>8)&255}, ${number&255}, ${Math.max(0,Math.min(100,opacity))/100})`;
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
  const defaultRadius={first_date:22,midnight_messages:18,next_door:2,campus_crush:6,between_us:0,obsession:0,forbidden:2,razor_edge:0,silent_threat:0,shadow_vow:14,pop_comic:3,cinema_noir:0,neon_terminal:2,dark_academia:2,scrapbook:8,editorial:0,moon_tarot:18,torn_diary:0}[id];
  if(defaultRadius===undefined) return {};
  const styles={backgroundColor:btOpacityColor(block.cardBgColor||p.cardBg,block.cardBgOpacity),borderRadius:`${(block.cardBgRadius??defaultRadius)*s}px`};
  switch(id) {
    case 'first_date': return {...styles,borderBottom:`${3*s}px solid ${p.accent}`,boxShadow:`0 ${3*s}px ${12*s}px #00000022`};
    case 'midnight_messages': return {...styles,borderRadius:`${(block.cardBgRadius??18)*s}px ${(block.cardBgRadius??18)*s}px ${Math.min(4,block.cardBgRadius??4)*s}px ${(block.cardBgRadius??18)*s}px`,border:`${s}px solid ${p.accent}99`,boxShadow:shadow(3,3,p.accent+'33')};
    case 'next_door': return {...styles,borderLeft:`${5*s}px solid ${p.accent}`,borderTop:`${s}px solid ${p.text}33`,boxShadow:shadow(5,5,p.accent+'55')};
    case 'campus_crush': return {...styles,border:`${2*s}px solid ${p.text}`,boxShadow:shadow(4,4,p.accent)};
    case 'between_us': return {...styles,borderTop:`${s}px solid ${p.accent}`,borderBottom:`${s}px solid ${p.accent}`,paddingTop:`${16*s}px`,paddingBottom:`${16*s}px`};
    case 'obsession': return {...styles,borderLeft:`${5*s}px double ${p.accent}`,borderRight:`${s}px solid ${p.accent}77`,boxShadow:`0 ${4*s}px ${16*s}px #00000066`};
    case 'forbidden': return {...styles,border:`${s}px solid ${p.accent}`,clipPath:'polygon(0 0,95% 0,100% 12%,100% 100%,5% 100%,0 88%)'};
    case 'razor_edge': return {...styles,borderTop:`${3*s}px solid ${p.accent}`,borderBottom:`${s}px dashed ${p.accent}`,boxShadow:shadow(4,4,'#00000077')};
    case 'silent_threat': return {...styles,borderRight:`${5*s}px solid ${p.accent}`,borderBottom:`${s}px solid ${p.accent}77`};
    case 'shadow_vow': return {...styles,border:`${3*s}px double ${p.accent}`,borderRadius:`${(block.cardBgRadius??14)*s}px ${2*s}px`};
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
