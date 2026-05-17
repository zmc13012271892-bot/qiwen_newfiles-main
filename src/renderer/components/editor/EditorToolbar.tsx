import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { toggleRightPanel, setRightPanelTab } from '../../store/slices/appSlice';
import { setFindOpen } from '../../store/slices/editorSlice';
import { EditorMode } from './EditorArea';

// ── 内嵌弹窗 ─────────────────────────────────────────────
interface InlineDialogProps {
  title: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  onConfirm: (vals: Record<string, string>) => void;
  onCancel: () => void;
}
const InlineDialog: React.FC<InlineDialogProps> = ({ title, fields, onConfirm, onCancel }) => {
  const [vals, setVals] = useState<Record<string, string>>({});
  return (
    <div style={{ position:'fixed',inset:0,zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ background:'var(--bg-surface2)',border:'0.5px solid var(--border-md)',borderRadius:14,padding:24,width:360,boxShadow:'0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize:15,fontWeight:500,color:'var(--text-primary)',marginBottom:18 }}>{title}</div>
        {fields.map(f => (
          <div key={f.key} style={{ marginBottom:14 }}>
            <div style={{ fontSize:12,color:'var(--text-tertiary)',marginBottom:5 }}>{f.label}</div>
            <input type={f.type||'text'} placeholder={f.placeholder} autoFocus={fields[0].key===f.key}
              onChange={e => setVals(v=>({...v,[f.key]:e.target.value}))}
              onKeyDown={e=>{if(e.key==='Enter')onConfirm(vals);if(e.key==='Escape')onCancel();}}
              style={{ width:'100%',padding:'9px 12px',borderRadius:8,background:'var(--bg-surface3)',border:'0.5px solid var(--border)',color:'var(--text-primary)',fontSize:13.5,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const }} />
          </div>
        ))}
        <div style={{ display:'flex',gap:10,justifyContent:'flex-end',marginTop:20 }}>
          <button onClick={onCancel} style={{ padding:'8px 18px',borderRadius:8,border:'0.5px solid var(--border)',background:'transparent',color:'var(--text-secondary)',cursor:'pointer',fontSize:13,fontFamily:'inherit' }}>取消</button>
          <button onClick={()=>onConfirm(vals)} style={{ padding:'8px 18px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#c8a96e,#a07840)',color:'#fff',cursor:'pointer',fontSize:13,fontFamily:'inherit',fontWeight:500 }}>确定</button>
        </div>
      </div>
    </div>
  );
};

// ── 工具栏按钮 ────────────────────────────────────────────
interface BtnProps { onClick?:()=>void; active?:boolean; title?:string; children?:React.ReactNode; label?:string; disabled?:boolean; danger?:boolean; }
const Btn: React.FC<BtnProps> = ({ onClick, active, title, children, label, disabled, danger }) => (
  <button onClick={onClick} title={title} disabled={disabled} style={{
    width:label?'auto':28, height:28, padding:label?'0 7px':0, borderRadius:6, border:'none',
    background:active?'rgba(200,169,110,0.15)':'transparent',
    color:disabled?'var(--text-tertiary)':danger?'#e87a7a':active?'var(--accent)':'var(--text-secondary)',
    cursor:disabled?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:label?12:13, fontWeight:active?600:400, gap:4, transition:'all 0.12s', flexShrink:0,
    boxShadow:active?'inset 0 0 0 1px rgba(200,169,110,0.3)':'none', opacity:disabled?0.4:1,
  }}
    onMouseEnter={e=>{if(!active&&!disabled)(e.currentTarget as HTMLElement).style.background='var(--bg-surface3)';}}
    onMouseLeave={e=>{if(!active&&!disabled)(e.currentTarget as HTMLElement).style.background='transparent';}}
  >{children}{label&&<span>{label}</span>}</button>
);
const Sep = () => <div style={{ width:0.5, height:18, background:'var(--border)', margin:'0 3px', flexShrink:0 }} />;
function getEditor(): any { return (window as any).__activeEditor; }

// ── 下拉菜单 ──────────────────────────────────────────────
const Dropdown: React.FC<{ trigger:React.ReactNode; children:React.ReactNode; width?:number }> = ({ trigger, children, width=160 }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ cursor:'pointer' }}>{trigger}</div>
      {open && (
        <div style={{ position:'absolute',top:'100%',left:0,zIndex:200,background:'var(--bg-surface2)',border:'0.5px solid var(--border-md)',borderRadius:10,padding:'4px 0',minWidth:width,boxShadow:'0 8px 32px rgba(0,0,0,0.5)',marginTop:4 }}
          onClick={()=>setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
};
const DropItem: React.FC<{ onClick:()=>void; active?:boolean; children:React.ReactNode; shortcut?:string; danger?:boolean }> = ({ onClick, active, children, shortcut, danger }) => (
  <div onClick={onClick} style={{ padding:'7px 14px',fontSize:12.5,cursor:'pointer',color:danger?'#e87a7a':active?'var(--accent)':'var(--text-primary)',background:active?'rgba(200,169,110,0.08)':'transparent',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,transition:'background 0.1s' }}
    onMouseEnter={e=>{if(!active)(e.currentTarget as HTMLElement).style.background='var(--bg-hover)';}}
    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=active?'rgba(200,169,110,0.08)':'transparent';}}>
    <span>{children}</span>
    {shortcut && <span style={{ fontSize:11,color:'var(--text-tertiary)',fontFamily:'monospace' }}>{shortcut}</span>}
  </div>
);
const DropSep = () => <div style={{ height:0.5,background:'var(--border)',margin:'4px 0' }} />;

// ── 颜色选择器 ────────────────────────────────────────────
const COLORS = ['#e87a7a','#e8a97a','#e8d07a','#7ae88a','#7ab8e8','#a87ae8','#e87ab8','#c8a96e','#9b9890','#eceae5','transparent'];
const ColorPicker: React.FC<{ onSelect:(c:string)=>void; label:string }> = ({ onSelect, label }) => (
  <Dropdown width={196} trigger={
    <button style={{ height:28,padding:'0 7px',borderRadius:6,border:'none',background:'transparent',color:'var(--text-secondary)',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12,flexShrink:0 }}
      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='var(--bg-surface3)';}}
      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';}}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      <span style={{ fontSize:11 }}>{label}</span>
      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
  }>
    <div style={{ padding:'10px 14px' }}>
      <div style={{ fontSize:11,color:'var(--text-tertiary)',marginBottom:8 }}>选择颜色</div>
      <div style={{ display:'flex',flexWrap:'wrap' as const,gap:6 }}>
        {COLORS.map(c => (
          <div key={c} onClick={()=>onSelect(c)} style={{ width:20,height:20,borderRadius:5,cursor:'pointer',background:c==='transparent'?'var(--bg-surface3)':c,border:'1.5px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'var(--text-tertiary)' }}>
            {c==='transparent'?'×':''}
          </div>
        ))}
      </div>
      <div style={{ marginTop:10,display:'flex',alignItems:'center',gap:6 }}>
        <span style={{ fontSize:11,color:'var(--text-tertiary)' }}>自定义：</span>
        <input type="color" onChange={e=>onSelect(e.target.value)} style={{ width:28,height:22,border:'none',padding:0,background:'none',cursor:'pointer',borderRadius:4 }} />
      </div>
    </div>
  </Dropdown>
);

// ── 对齐图标 ──────────────────────────────────────────────
const AlignIcon: React.FC<{ a:'left'|'center'|'right'|'justify' }> = ({ a }) => {
  const p: Record<string,string[]> = { left:['M3 6h18','M3 12h12','M3 18h15'], center:['M3 6h18','M6 12h12','M4 18h16'], right:['M3 6h18','M9 12h12','M6 18h15'], justify:['M3 6h18','M3 12h18','M3 18h18'] };
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{p[a].map((d,i)=><path key={i} d={d}/>)}</svg>;
};

// ── 主组件 ────────────────────────────────────────────────
const FONT_SIZES = ['10','11','12','13','14','15','16','18','20','22','24','28','32','36','48','64','96'];
const FONT_FAMILIES = [
  { label:'默认（无衬线）', value:'' },
  { label:'Noto Serif SC', value:'"Noto Serif SC",serif' },
  { label:'Georgia', value:'Georgia,serif' },
  { label:'Courier New', value:'"Courier New",monospace' },
  { label:'Arial', value:'Arial,sans-serif' },
];
const LINE_SPACINGS = [
  { label:'1.0 紧凑', value:'1' },
  { label:'1.5 标准', value:'1.5' },
  { label:'1.8 舒适', value:'1.8' },
  { label:'2.0 宽松', value:'2' },
  { label:'2.5 超宽', value:'2.5' },
];

interface EditorToolbarProps { isSaving?:boolean; mode:EditorMode; onModeChange:(mode:EditorMode)=>void; }

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ isSaving, mode, onModeChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { rightPanelOpen, rightPanelTab } = useSelector((s: RootState) => s.app);
  const [tick, setTick] = useState(0);
  const [dialog, setDialog] = useState<null|'link'|'image'|'table'|'video'>(null);
  const [lineSpacing, setLineSpacing] = useState('1.8');
  const refresh = useCallback(() => setTimeout(() => setTick(t=>t+1), 30), []);

  const e = getEditor();
  const is = (name: string, attrs?: any) => e?.isActive(name, attrs) ?? false;
  const cmd = (fn: (chain: any) => any) => { const ed = getEditor(); if (ed) { fn(ed.chain().focus()); refresh(); } };

  const currentHeading = is('heading',{level:1})?'h1':is('heading',{level:2})?'h2':is('heading',{level:3})?'h3':is('heading',{level:4})?'h4':is('heading',{level:5})?'h5':'p';

  const handlePrint = () => {
    const ed = getEditor(); if (!ed) return;
    const win = window.open('','_blank'); if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:'Noto Serif SC',Georgia,serif;max-width:800px;margin:40px auto;line-height:1.8;color:#1a1a1a}h1,h2,h3{font-weight:400}code{background:#f4f4f4;padding:2px 6px;border-radius:4px}pre{background:#f4f4f4;padding:16px;border-radius:8px}blockquote{border-left:3px solid #c8a96e;padding-left:16px;color:#666}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px 12px}@media print{body{margin:20px}}</style></head><body>${ed.getHTML()}</body></html>`);
    win.document.close(); win.print();
  };

  const handleCopyMarkdown = () => {
    const ed = getEditor(); if (!ed) return;
    const md = ed.getHTML()
      .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi,(_:any,l:string,t:string)=>'#'.repeat(Number(l))+' '+t+'\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi,'**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi,'*$1*')
      .replace(/<code[^>]*>(.*?)<\/code>/gi,'`$1`')
      .replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/gi,'[$2]($1)')
      .replace(/<br\s*\/?>/gi,'\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi,'$1\n\n')
      .replace(/<[^>]+>/g,'').trim();
    navigator.clipboard.writeText(md);
  };

  const applyLineSpacing = (v: string) => {
    setLineSpacing(v);
    const el = document.querySelector('.ProseMirror') as HTMLElement;
    if (el) el.style.lineHeight = v;
  };

  const applyFontFamily = (v: string) => {
    const el = document.querySelector('.ProseMirror') as HTMLElement;
    if (el) el.style.fontFamily = v || '';
  };

  const applyFontSize = (v: string) => {
    cmd(c => c.setFontSize?.(v+'px') ?? c);
    const el = document.querySelector('.ProseMirror') as HTMLElement;
    if (el) el.style.fontSize = v+'px';
  };

  return (
    <>
      {/* ── 弹窗 ─────────────────────────────────────── */}
      {dialog === 'link' && <InlineDialog title="插入链接"
        fields={[{key:'text',label:'显示文字（选填）',placeholder:'链接文字'},{key:'url',label:'链接地址',placeholder:'https://'}]}
        onConfirm={({url,text})=>{ setDialog(null); if(!url)return; const ed=getEditor(); if(!ed)return; if(text) ed.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run(); else ed.chain().focus().setLink({href:url}).run(); }}
        onCancel={()=>setDialog(null)} />}
      {dialog === 'image' && <InlineDialog title="插入图片"
        fields={[{key:'src',label:'图片地址',placeholder:'https://example.com/img.png'},{key:'alt',label:'描述（选填）',placeholder:'图片描述'},{key:'width',label:'宽度 px（选填）',placeholder:'500'}]}
        onConfirm={({src,alt,width})=>{ setDialog(null); if(src) cmd(c=>c.setImage({src,alt:alt||'',width:width?parseInt(width):undefined}).run()); }}
        onCancel={()=>setDialog(null)} />}
      {dialog === 'table' && <InlineDialog title="插入表格"
        fields={[{key:'rows',label:'行数',placeholder:'3'},{key:'cols',label:'列数',placeholder:'3'}]}
        onConfirm={({rows,cols})=>{ setDialog(null); cmd(ch=>ch.insertTable({rows:parseInt(rows)||3,cols:parseInt(cols)||3,withHeaderRow:true}).run()); }}
        onCancel={()=>setDialog(null)} />}
      {dialog === 'video' && <InlineDialog title="嵌入视频"
        fields={[{key:'url',label:'视频链接（YouTube/Bilibili）',placeholder:'https://www.youtube.com/watch?v=...'}]}
        onConfirm={({url})=>{ setDialog(null); if(!url)return; let em=url; if(url.includes('youtube.com/watch')){try{const id=new URL(url).searchParams.get('v');if(id)em=`https://www.youtube.com/embed/${id}`;}catch{}} else if(url.includes('bilibili.com')){const m=url.match(/\/video\/(BV[a-zA-Z0-9]+)/);if(m)em=`https://player.bilibili.com/player.html?bvid=${m[1]}`;} cmd(c=>c.insertContent(`<iframe src="${em}" width="100%" height="315" frameborder="0" allowfullscreen style="border-radius:8px"></iframe>`).run()); }}
        onCancel={()=>setDialog(null)} />}

      {/* ── 主工具栏 ─────────────────────────────────── */}
      <div style={{ borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',padding:'0 6px',gap:1,background:'var(--bg-surface)',flexShrink:0,overflowX:'auto',minHeight:40,flexWrap:'nowrap',userSelect:'none' as const }}>

        {/* 撤销/重做 */}
        <Btn title="撤销 Ctrl+Z" onClick={()=>cmd(c=>c.undo().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13"/></svg>
        </Btn>
        <Btn title="重做 Ctrl+Y" onClick={()=>cmd(c=>c.redo().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13"/></svg>
        </Btn>

        <Sep />

        {/* 段落样式 */}
        <Dropdown width={150} trigger={
          <button style={{ height:26,padding:'0 8px',borderRadius:6,fontSize:12,background:'var(--bg-surface3)',border:'0.5px solid var(--border)',color:'var(--text-secondary)',cursor:'pointer',outline:'none',fontFamily:'inherit',flexShrink:0,display:'flex',alignItems:'center',gap:5 }}>
            {currentHeading==='p'?'正文':`标题 ${currentHeading[1]}`}
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        }>
          {[{v:'p',l:'正文',s:'Ctrl+Alt+0'},{v:'h1',l:'标题 1',s:'Ctrl+Alt+1'},{v:'h2',l:'标题 2',s:'Ctrl+Alt+2'},{v:'h3',l:'标题 3',s:'Ctrl+Alt+3'},{v:'h4',l:'标题 4',s:'Ctrl+Alt+4'},{v:'h5',l:'标题 5',s:'Ctrl+Alt+5'}].map(({v,l,s})=>(
            <DropItem key={v} active={currentHeading===v} shortcut={s} onClick={()=>{ const ed=getEditor();if(!ed)return; if(v==='p')ed.chain().focus().setParagraph().run(); else ed.chain().focus().toggleHeading({level:parseInt(v[1]) as 1|2|3|4|5}).run(); refresh(); }}>{l}</DropItem>
          ))}
        </Dropdown>

        <Sep />

        {/* 字体 */}
        <Dropdown width={200} trigger={
          <button style={{ height:26,padding:'0 8px',borderRadius:6,fontSize:12,background:'var(--bg-surface3)',border:'0.5px solid var(--border)',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'inherit',flexShrink:0,display:'flex',alignItems:'center',gap:5 }}>
            字体 <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        }>
          {FONT_FAMILIES.map(f=><DropItem key={f.value} onClick={()=>applyFontFamily(f.value)}><span style={{fontFamily:f.value||'inherit'}}>{f.label}</span></DropItem>)}
        </Dropdown>

        {/* 字体大小 */}
        <div style={{ display:'flex',alignItems:'center',gap:0,flexShrink:0 }}>
          <button onClick={()=>{ const el=document.querySelector('.ProseMirror') as HTMLElement; const cur=parseInt(el?.style.fontSize||'15'); applyFontSize(String(Math.max(8,cur-1))); }}
            style={{ width:20,height:26,border:'0.5px solid var(--border)',borderRight:'none',background:'var(--bg-surface3)',cursor:'pointer',color:'var(--text-secondary)',fontSize:15,borderRadius:'6px 0 0 6px',display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
          <select onChange={e=>applyFontSize(e.target.value)} defaultValue="15" style={{ height:26,padding:'0 2px',borderRadius:0,fontSize:12,background:'var(--bg-surface3)',border:'0.5px solid var(--border)',color:'var(--text-secondary)',cursor:'pointer',outline:'none',fontFamily:'inherit',width:46,textAlign:'center' as const }}>
            {FONT_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={()=>{ const el=document.querySelector('.ProseMirror') as HTMLElement; const cur=parseInt(el?.style.fontSize||'15'); applyFontSize(String(Math.min(96,cur+1))); }}
            style={{ width:20,height:26,border:'0.5px solid var(--border)',borderLeft:'none',background:'var(--bg-surface3)',cursor:'pointer',color:'var(--text-secondary)',fontSize:15,borderRadius:'0 6px 6px 0',display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
        </div>

        <Sep />

        {/* 文字格式 */}
        <Btn title="加粗 Ctrl+B" active={is('bold')} onClick={()=>cmd(c=>c.toggleBold().run())}><strong style={{fontSize:13}}>B</strong></Btn>
        <Btn title="斜体 Ctrl+I" active={is('italic')} onClick={()=>cmd(c=>c.toggleItalic().run())}><em style={{fontSize:13}}>I</em></Btn>
        <Btn title="下划线 Ctrl+U" active={is('underline')} onClick={()=>cmd(c=>c.toggleUnderline().run())}><span style={{textDecoration:'underline',fontSize:13}}>U</span></Btn>
        <Btn title="删除线" active={is('strike')} onClick={()=>cmd(c=>c.toggleStrike().run())}><span style={{textDecoration:'line-through',fontSize:13}}>S</span></Btn>
        <Btn title="高亮" active={is('highlight')} onClick={()=>cmd(c=>c.toggleHighlight().run())}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15.232 5.232l3.536 3.536-6.768 6.768-4.95.707.707-4.95 6.475-6.061zm1.414-1.414a2 2 0 0 1 2.828 2.828L5.293 20.78l-5.657.707.707-5.657L16.646 3.818z"/></svg>
        </Btn>
        <Btn title="上标" active={is('superscript')} onClick={()=>cmd(c=>c.toggleSuperscript?.()??c)}><span style={{fontSize:11}}>x<sup>2</sup></span></Btn>
        <Btn title="下标" active={is('subscript')} onClick={()=>cmd(c=>c.toggleSubscript?.()??c)}><span style={{fontSize:11}}>x<sub>2</sub></span></Btn>
        <Btn title="行内代码 Ctrl+E" active={is('code')} onClick={()=>cmd(c=>c.toggleCode().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </Btn>

        {/* 颜色/底色 */}
        <ColorPicker label="颜色" onSelect={color=>{ const ed=getEditor();if(!ed)return; if(color==='transparent')ed.chain().focus().unsetColor?.().run(); else ed.chain().focus().setColor?.(color).run(); }} />
        <ColorPicker label="底色" onSelect={color=>{ const ed=getEditor();if(!ed)return; if(color==='transparent')ed.chain().focus().unsetHighlight().run(); else ed.chain().focus().toggleHighlight({color}).run(); }} />

        <Btn title="清除格式" onClick={()=>cmd(c=>c.unsetAllMarks().clearNodes().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </Btn>

        <Sep />

        {/* 对齐 */}
        <Btn title="左对齐" active={e?.isActive({textAlign:'left'})??false} onClick={()=>cmd(c=>c.setTextAlign('left').run())}><AlignIcon a="left"/></Btn>
        <Btn title="居中" active={e?.isActive({textAlign:'center'})??false} onClick={()=>cmd(c=>c.setTextAlign('center').run())}><AlignIcon a="center"/></Btn>
        <Btn title="右对齐" active={e?.isActive({textAlign:'right'})??false} onClick={()=>cmd(c=>c.setTextAlign('right').run())}><AlignIcon a="right"/></Btn>
        <Btn title="两端对齐" active={e?.isActive({textAlign:'justify'})??false} onClick={()=>cmd(c=>c.setTextAlign('justify').run())}><AlignIcon a="justify"/></Btn>

        {/* 行间距 */}
        <Dropdown width={140} trigger={
          <button title="行间距" style={{ width:28,height:28,borderRadius:6,border:'none',background:'transparent',color:'var(--text-secondary)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='var(--bg-surface3)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><polyline points="7 3 4 6 7 9"/><polyline points="7 21 4 18 7 15"/></svg>
          </button>
        }>
          {LINE_SPACINGS.map(s=><DropItem key={s.value} active={lineSpacing===s.value} onClick={()=>applyLineSpacing(s.value)}>{s.label}</DropItem>)}
        </Dropdown>

        <Sep />

        {/* 列表 */}
        <Btn title="无序列表" active={is('bulletList')} onClick={()=>cmd(c=>c.toggleBulletList().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
        </Btn>
        <Btn title="有序列表" active={is('orderedList')} onClick={()=>cmd(c=>c.toggleOrderedList().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
        </Btn>
        <Btn title="待办列表" active={is('taskList')} onClick={()=>cmd(c=>c.toggleTaskList().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </Btn>
        <Btn title="减少缩进" onClick={()=>cmd(c=>c.liftListItem?.('listItem')??c)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/><polyline points="13 10 9 12 13 14"/></svg>
        </Btn>
        <Btn title="增加缩进" onClick={()=>cmd(c=>c.sinkListItem?.('listItem')??c)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/><polyline points="9 10 13 12 9 14"/></svg>
        </Btn>

        <Sep />

        {/* 块 */}
        <Btn title="引用" active={is('blockquote')} onClick={()=>cmd(c=>c.toggleBlockquote().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
        </Btn>
        <Btn title="代码块" active={is('codeBlock')} onClick={()=>cmd(c=>c.toggleCodeBlock().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 9 7 12 9 15"/><polyline points="15 9 17 12 15 15"/></svg>
        </Btn>

        <Sep />

        {/* 插入 */}
        <Dropdown width={180} trigger={
          <button style={{ height:26,padding:'0 8px',borderRadius:6,fontSize:12,background:'var(--bg-surface3)',border:'0.5px solid var(--border)',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'inherit',flexShrink:0,display:'flex',alignItems:'center',gap:5 }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(200,169,110,0.3)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            插入
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        }>
          <DropItem onClick={()=>setDialog('link')} shortcut="Ctrl+K">🔗  链接</DropItem>
          <DropItem onClick={()=>setDialog('image')}>🖼  图片</DropItem>
          <DropItem onClick={()=>setDialog('video')}>🎬  嵌入视频</DropItem>
          <DropItem onClick={()=>setDialog('table')}>📊  表格</DropItem>
          <DropSep />
          <DropItem onClick={()=>cmd(c=>c.setHorizontalRule().run())}>─  分割线</DropItem>
          <DropItem onClick={()=>{ const now=new Date().toLocaleString('zh-CN'); cmd(c=>c.insertContent(now).run()); }}>🕐  插入时间</DropItem>
        </Dropdown>

        {/* 表格操作（激活时显示） */}
        {is('table') && (
          <Dropdown width={170} trigger={
            <button style={{ height:26,padding:'0 8px',borderRadius:6,fontSize:12,background:'rgba(200,169,110,0.1)',border:'0.5px solid rgba(200,169,110,0.3)',color:'var(--accent)',cursor:'pointer',fontFamily:'inherit',flexShrink:0,display:'flex',alignItems:'center',gap:5 }}>
              📊 表格 <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          }>
            <DropItem onClick={()=>cmd(c=>c.addRowBefore().run())}>↑ 上方插入行</DropItem>
            <DropItem onClick={()=>cmd(c=>c.addRowAfter().run())}>↓ 下方插入行</DropItem>
            <DropItem onClick={()=>cmd(c=>c.addColumnBefore().run())}>← 左侧插入列</DropItem>
            <DropItem onClick={()=>cmd(c=>c.addColumnAfter().run())}>→ 右侧插入列</DropItem>
            <DropSep />
            <DropItem onClick={()=>cmd(c=>c.mergeCells?.().run())}>⊞ 合并单元格</DropItem>
            <DropItem onClick={()=>cmd(c=>c.splitCell?.().run())}>⊟ 拆分单元格</DropItem>
            <DropSep />
            <DropItem onClick={()=>cmd(c=>c.deleteRow().run())} danger>删除当前行</DropItem>
            <DropItem onClick={()=>cmd(c=>c.deleteColumn().run())} danger>删除当前列</DropItem>
            <DropItem onClick={()=>cmd(c=>c.deleteTable().run())} danger>删除表格</DropItem>
          </Dropdown>
        )}

        {/* 更多 */}
        <Dropdown width={200} trigger={
          <button title="更多操作" style={{ width:28,height:28,borderRadius:6,border:'none',background:'transparent',color:'var(--text-secondary)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='var(--bg-surface3)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
          </button>
        }>
          <DropItem onClick={()=>dispatch(setFindOpen(true))} shortcut="Ctrl+F">🔍  查找与替换</DropItem>
          <DropSep />
          <DropItem onClick={handleCopyMarkdown}>⬇  复制为 Markdown</DropItem>
          <DropItem onClick={()=>{ const ed=getEditor(); if(ed) navigator.clipboard.writeText(ed.getText()); }}>📋  复制为纯文本</DropItem>
          <DropSep />
          <DropItem onClick={handlePrint} shortcut="Ctrl+P">🖨  打印 / 导出 PDF</DropItem>
          <DropSep />
          <DropItem onClick={()=>{ if(!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{}); else document.exitFullscreen().catch(()=>{}); }} shortcut="F11">⛶  全屏模式</DropItem>
        </Dropdown>

        <div style={{ flex:1 }} />

        {/* 右侧面板图标 */}
        {(['outline','stats','plugins','ai'] as const).map(tab=>{
          const icons: Record<string,React.ReactNode> = {
            outline: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3"/><line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3"/><line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3"/></svg>,
            stats: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
            plugins: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/></svg>,
            ai: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
          };
          const labels: Record<string,string> = { outline:'大纲', stats:'统计', plugins:'插件', ai:'AI' };
          return (
            <Btn key={tab} title={labels[tab]} active={rightPanelOpen&&rightPanelTab===tab}
              onClick={()=>{ if(rightPanelOpen&&rightPanelTab===tab) dispatch(toggleRightPanel()); else dispatch(setRightPanelTab(tab)); }}>
              {icons[tab]}
            </Btn>
          );
        })}

        <Sep />

        {/* 视图切换 */}
        <div style={{ display:'flex',background:'var(--bg-surface3)',borderRadius:8,padding:3,gap:2,flexShrink:0 }}>
          {([{k:'edit',l:'编辑',i:'✎'},{k:'preview',l:'预览',i:'◉'},{k:'focus',l:'专注',i:'⊙'}] as const).map(m=>(
            <button key={m.k} onClick={()=>onModeChange(m.k)} title={m.l} style={{ padding:'3px 9px',borderRadius:5,fontSize:11.5,border:'none',cursor:'pointer',background:mode===m.k?'var(--bg-surface)':'transparent',color:mode===m.k?'var(--text-primary)':'var(--text-tertiary)',transition:'all 0.15s',fontFamily:'inherit',boxShadow:mode===m.k?'0 1px 3px rgba(0,0,0,0.3)':'none',display:'flex',alignItems:'center',gap:4 }}>
              <span>{m.i}</span><span>{m.l}</span>
            </button>
          ))}
        </div>

        {/* 保存状态 */}
        <div style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,marginLeft:6,flexShrink:0,background:isSaving?'rgba(74,158,255,0.08)':'rgba(82,201,122,0.06)',border:`0.5px solid ${isSaving?'rgba(74,158,255,0.2)':'rgba(82,201,122,0.15)'}`,fontSize:11.5,color:isSaving?'#7ab8e8':'rgba(82,201,122,0.7)' }}>
          {isSaving
            ? <div style={{ width:5,height:5,borderRadius:'50%',background:'#7ab8e8',animation:'pulse 1s infinite' }} />
            : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          }
          {isSaving?'保存中':'已保存'}
        </div>
      </div>
    </>
  );
};
