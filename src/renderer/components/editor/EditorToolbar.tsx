import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { toggleRightPanel, setRightPanelTab } from '../../store/slices/appSlice';
import { setFindOpen } from '../../store/slices/editorSlice';
import { updateDocument } from '../../store/slices/documentsSlice';
import { autoSave } from '../../utils/autoSave';
import { EditorMode } from './EditorArea';

// ── 获取编辑器实例 ────────────────────────────────────────
function getEditor(): any { return (window as any).__activeEditor; }

// ── 内嵌弹窗 ─────────────────────────────────────────────
interface DialogField { key: string; label: string; placeholder: string; type?: string; }
const InlineDialog: React.FC<{
  title: string; fields: DialogField[];
  onConfirm: (vals: Record<string, string>) => void; onCancel: () => void;
}> = ({ title, fields, onConfirm, onCancel }) => {
  const [vals, setVals] = useState<Record<string, string>>({});
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)' }}
      onClick={e => { if (e.target===e.currentTarget) onCancel(); }}>
      <div style={{ background:'var(--bg-surface2)', border:'0.5px solid var(--border-md)', borderRadius:16, padding:28, width:380, boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize:15, fontWeight:500, color:'var(--text-primary)', marginBottom:20 }}>{title}</div>
        {fields.map((f, i) => (
          <div key={f.key} style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, color:'var(--text-tertiary)', marginBottom:5 }}>{f.label}</div>
            <input
              type={f.type||'text'} placeholder={f.placeholder}
              autoFocus={i===0}
              onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
              onKeyDown={e => { if (e.key==='Enter') onConfirm(vals); if (e.key==='Escape') onCancel(); }}
              style={{ width:'100%', padding:'9px 12px', borderRadius:9, background:'var(--bg-surface3)', border:'0.5px solid var(--border)', color:'var(--text-primary)', fontSize:13.5, outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const }}
            />
          </div>
        ))}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:22 }}>
          <button onClick={onCancel} style={{ padding:'8px 20px', borderRadius:9, border:'0.5px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>取消</button>
          <button onClick={() => onConfirm(vals)} style={{ padding:'8px 20px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#c8a96e,#a07840)', color:'#fff', cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:500 }}>确定</button>
        </div>
      </div>
    </div>
  );
};

// ── 工具按钮 ──────────────────────────────────────────────
const Btn: React.FC<{
  onClick?: (e: React.MouseEvent) => void; active?: boolean; title?: string;
  children?: React.ReactNode; disabled?: boolean;
}> = ({ onClick, active, title, children, disabled }) => (
  <button
    onClick={onClick} title={title} disabled={disabled}
    style={{
      width:30, height:30, padding:0, borderRadius:7, border:'none',
      background: active ? 'rgba(200,169,110,0.18)' : 'transparent',
      color: disabled ? 'var(--text-tertiary)' : active ? '#c8a96e' : 'var(--text-secondary)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:13, fontWeight: active ? 600 : 400,
      transition:'background 0.1s, color 0.1s', flexShrink:0,
      boxShadow: active ? 'inset 0 0 0 1px rgba(200,169,110,0.35)' : 'none',
      opacity: disabled ? 0.4 : 1,
    }}
    onMouseEnter={e => { if (!disabled && !active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface3)'; }}
    onMouseLeave={e => { if (!disabled && !active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
  >{children}</button>
);

// ── 分割线 ────────────────────────────────────────────────
const Sep = () => <div style={{ width:0.5, height:18, background:'var(--border)', margin:'0 2px', flexShrink:0 }} />;

// ── 下拉菜单（不依赖 document click，用 blur 关闭）────────
const ToolDropdown: React.FC<{
  label: React.ReactNode; children: React.ReactNode; minWidth?: number; active?: boolean;
}> = ({ label, children, minWidth=160, active }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const tid = setTimeout(() => document.addEventListener('mousedown', handle), 0);
    return () => { clearTimeout(tid); document.removeEventListener('mousedown', handle); };
  }, [open]);

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <button
        onClick={handleOpen}
        style={{
          height:30, padding:'0 8px', borderRadius:7,
          border: active ? '0.5px solid rgba(200,169,110,0.35)' : '0.5px solid var(--border)',
          background: open ? 'var(--bg-surface3)' : active ? 'rgba(200,169,110,0.1)' : 'var(--bg-surface3)',
          color: active ? '#c8a96e' : 'var(--text-secondary)', cursor:'pointer',
          display:'flex', alignItems:'center', gap:5, fontSize:12.5,
          fontFamily:'inherit', flexShrink:0, transition:'all 0.1s',
        }}
      >
        {label}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ opacity:0.5, transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position:'fixed', top: pos.top, left: pos.left, zIndex:9999,
          background:'var(--bg-surface2)', border:'0.5px solid var(--border-md)',
          borderRadius:11, padding:'4px 0', minWidth:minWidth,
          boxShadow:'0 16px 48px rgba(0,0,0,0.6)',
        }}>
          <div onClick={() => setOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

const DItem: React.FC<{
  onClick: () => void; active?: boolean; danger?: boolean;
  children: React.ReactNode; shortcut?: string;
}> = ({ onClick, active, danger, children, shortcut }) => (
  <div
    onClick={onClick}
    style={{
      padding:'7px 14px', fontSize:13, cursor:'pointer',
      color: danger ? '#e87a7a' : active ? '#c8a96e' : 'var(--text-primary)',
      background: active ? 'rgba(200,169,110,0.08)' : 'transparent',
      display:'flex', alignItems:'center', justifyContent:'space-between', gap:16,
      transition:'background 0.1s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = active ? 'rgba(200,169,110,0.12)' : 'var(--bg-hover)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? 'rgba(200,169,110,0.08)' : 'transparent'; }}
  >
    <span>{children}</span>
    {shortcut && <span style={{ fontSize:11, color:'var(--text-tertiary)', fontFamily:'monospace', flexShrink:0 }}>{shortcut}</span>}
  </div>
);

const DSep = () => <div style={{ height:0.5, background:'var(--border)', margin:'3px 0' }} />;

// ── 颜色选择器下拉 ────────────────────────────────────────
const PRESET_COLORS = ['#e87a7a','#e8a97a','#e8d07a','#7ae88a','#7ab8e8','#a87ae8','#e87ab8','#c8a96e','#aaaaaa','#eceae5'];

const ColorDropdown: React.FC<{
  label: string; icon: React.ReactNode;
  onSelect: (color: string | null) => void;
}> = ({ label, icon, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const tid = setTimeout(() => document.addEventListener('mousedown', handle), 0);
    return () => { clearTimeout(tid); document.removeEventListener('mousedown', handle); };
  }, [open]);

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <button onClick={handleOpen} title={label} style={{
        width:30, height:30, borderRadius:7, border:'none', background:'transparent',
        color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
        transition:'background 0.1s',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface3)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >{icon}</button>
      {open && (
        <div style={{
          position:'fixed', top: pos.top, left: pos.left, zIndex:9999,
          background:'var(--bg-surface2)', border:'0.5px solid var(--border-md)',
          borderRadius:11, padding:12, boxShadow:'0 16px 48px rgba(0,0,0,0.6)', minWidth:188,
        }}>
          <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:8 }}>{label}</div>
          <div style={{ display:'flex', flexWrap:'wrap' as const, gap:6, marginBottom:10 }}>
            {PRESET_COLORS.map(c => (
              <div key={c} onClick={() => { onSelect(c); setOpen(false); }} style={{
                width:22, height:22, borderRadius:6, cursor:'pointer', background:c,
                border:'2px solid transparent', transition:'border-color 0.1s',
                boxSizing:'border-box' as const,
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
              />
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, color:'var(--text-tertiary)' }}>自定义</span>
            <input type="color" onChange={e => { onSelect(e.target.value); setOpen(false); }}
              style={{ width:30, height:22, border:'none', padding:0, background:'none', cursor:'pointer', borderRadius:4 }} />
          </div>
          <div style={{ marginTop:8, paddingTop:8, borderTop:'0.5px solid var(--border)' }}>
            <div onClick={() => { onSelect(null); setOpen(false); }}
              style={{ fontSize:12, color:'var(--text-tertiary)', cursor:'pointer', padding:'3px 0' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
            >✕ 清除{label}</div>
          </div>
        </div>
      )}
    </div>
  );
};


const FONT_SIZES = ['10','11','12','13','14','15','16','18','20','22','24','28','32','36','48','64'];
const FONT_FAMILIES: { label: string; value: string }[] = [
  { label:'默认（无衬线）', value:'' },
  { label:'Noto Serif SC', value:'"Noto Serif SC",serif' },
  { label:'Georgia', value:'Georgia,serif' },
  { label:'Courier New', value:'"Courier New",monospace' },
  { label:'Arial', value:'Arial,sans-serif' },
];
const LINE_SPACINGS = [
  { label:'1.0 紧凑', value:'1' },
  { label:'1.5 标准', value:'1.5' },
  { label:'1.8 舒适 (默认)', value:'1.8' },
  { label:'2.0 宽松', value:'2' },
  { label:'2.5 超宽', value:'2.5' },
];

interface EditorToolbarProps {
  isSaving?: boolean; mode: EditorMode; onModeChange: (mode: EditorMode) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ isSaving, mode, onModeChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { rightPanelOpen, rightPanelTab } = useSelector((s: RootState) => s.app);
  const [tick, setTick] = useState(0);
  const [dialog, setDialog] = useState<null|'link'|'image'|'table'|'video'>(null);
  const [lineSpacing, setLineSpacing] = useState('1.8');
  const [saveNotice, setSaveNotice] = useState<null|'saved'|'saving'>(null);

  // 获取当前文档ID
  const activeTabId = useSelector((s: RootState) => s.app.activeTabId);
  const tabs = useSelector((s: RootState) => s.app.tabs);
  const openDocuments = useSelector((s: RootState) => s.documents.openDocuments);
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeDoc = activeTab ? openDocuments[activeTab.documentId] : null;

  // 手动保存
  const handleSave = async () => {
    if (!activeDoc) return;
    setSaveNotice('saving');
    try {
      await autoSave.flush(activeDoc.id);
      const ed = getEditor();
      if (ed) {
        const html = ed.getHTML();
        await dispatch(updateDocument({ id: activeDoc.id, content: html }));
      }
      setSaveNotice('saved');
      setTimeout(() => setSaveNotice(null), 1800);
    } catch {
      setSaveNotice(null);
    }
  };

  // 另存为（导出HTML文件）
  const handleSaveAs = () => {
    const ed = getEditor();
    if (!ed || !activeDoc) return;
    const html = \`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>\${activeDoc.title || '无标题'}</title>
<style>
  body { font-family: 'Noto Serif SC', Georgia, serif; max-width: 800px; margin: 40px auto; line-height: 1.8; color: #1a1a1a; padding: 0 24px; }
  h1, h2, h3, h4, h5, h6 { font-weight: 400; margin-top: 1.5em; }
  code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
  blockquote { border-left: 3px solid #c8a96e; padding-left: 16px; color: #666; margin: 12px 0; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ddd; padding: 8px 12px; }
  img { max-width: 100%; border-radius: 8px; }
  a { color: #c8a96e; }
</style>
</head>
<body>
<h1>\${activeDoc.title || '无标题'}</h1>
\${ed.getHTML()}
</body>
</html>\`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`\${activeDoc.title || '无标题'}.html\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // 订阅编辑器事务，让工具栏按钮状态实时更新
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(interval);
  }, []);

  // Ctrl+S 快捷键保存
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeDoc]); // eslint-disable-line

  const e = getEditor();
  const is = (name: string, attrs?: any): boolean => {
    try { return e?.isActive(name, attrs) ?? false; } catch { return false; }
  };

  // 安全执行编辑器命令：先 focus，再执行，避免失焦时命令失效
  const run = useCallback((fn: (e: any) => void) => {
    const editor = getEditor();
    if (!editor) return;
    editor.commands.focus();
    try { fn(editor); } catch (err) { console.warn('Editor command error:', err); }
    setTimeout(() => setTick(t => t + 1), 50);
  }, []);

  const currentHeading =
    is('heading',{level:1}) ? 'h1' : is('heading',{level:2}) ? 'h2' :
    is('heading',{level:3}) ? 'h3' : is('heading',{level:4}) ? 'h4' :
    is('heading',{level:5}) ? 'h5' : is('heading',{level:6}) ? 'h6' : 'p';

  const applyLineSpacing = (v: string) => {
    setLineSpacing(v);
    const el = document.querySelector('.ProseMirror') as HTMLElement;
    if (el) el.style.lineHeight = v;
  };

  const handlePrint = () => {
    const ed = getEditor(); if (!ed) return;
    const win = window.open('', '_blank'); if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:'Noto Serif SC',Georgia,serif;max-width:800px;margin:40px auto;line-height:1.8;color:#1a1a1a}h1,h2,h3{font-weight:400}code{background:#f4f4f4;padding:2px 6px;border-radius:4px}pre{background:#f4f4f4;padding:16px;border-radius:8px}blockquote{border-left:3px solid #c8a96e;padding-left:16px;color:#666;margin:12px 0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px 12px}@media print{body{margin:20px}}</style>
</head><body>${ed.getHTML()}</body></html>`);
    win.document.close(); win.print();
  };

  // 右侧面板按钮：点当前激活的关闭，点其他的切换到对应 tab
  const handlePanelBtn = (tab: 'outline'|'stats'|'plugins'|'ai') => {
    if (rightPanelOpen && rightPanelTab === tab) {
      dispatch(toggleRightPanel());
    } else {
      dispatch(setRightPanelTab(tab));
    }
  };

  return (
    <>
      {/* 弹窗层 */}
      {dialog === 'link' && (
        <InlineDialog title="插入链接"
          fields={[{key:'text',label:'显示文字（选填）',placeholder:'链接文字'},{key:'url',label:'链接地址 *',placeholder:'https://'}]}
          onConfirm={({url,text}) => {
            setDialog(null); if (!url) return;
            run(ed => {
              if (text) ed.commands.insertContent(`<a href="${url}">${text}</a>`);
              else ed.chain().focus().setLink({href:url}).run();
            });
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'image' && (
        <InlineDialog title="插入图片"
          fields={[{key:'src',label:'图片地址 *',placeholder:'https://example.com/image.png'},{key:'alt',label:'替代文字（选填）',placeholder:'图片描述'},{key:'width',label:'宽度 px（选填）',placeholder:'500'}]}
          onConfirm={({src,alt,width}) => {
            setDialog(null); if (!src) return;
            run(ed => ed.chain().focus().setImage({src, alt:alt||'', ...(width?{width:parseInt(width)}:{})}).run());
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'table' && (
        <InlineDialog title="插入表格"
          fields={[{key:'rows',label:'行数',placeholder:'3'},{key:'cols',label:'列数',placeholder:'3'}]}
          onConfirm={({rows,cols}) => {
            setDialog(null);
            run(ed => ed.chain().focus().insertTable({rows:parseInt(rows)||3, cols:parseInt(cols)||3, withHeaderRow:true}).run());
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'video' && (
        <InlineDialog title="嵌入视频"
          fields={[{key:'url',label:'视频链接（YouTube / Bilibili）',placeholder:'https://www.youtube.com/watch?v=...'}]}
          onConfirm={({url}) => {
            setDialog(null); if (!url) return;
            let embed = url;
            try {
              if (url.includes('youtube.com/watch')) { const id=new URL(url).searchParams.get('v'); if(id) embed=`https://www.youtube.com/embed/${id}`; }
              else if (url.includes('bilibili.com')) { const m=url.match(/\/video\/(BV[a-zA-Z0-9]+)/); if(m) embed=`https://player.bilibili.com/player.html?bvid=${m[1]}`; }
            } catch {}
            run(ed => ed.commands.insertContent(`<iframe src="${embed}" width="100%" height="315" frameborder="0" allowfullscreen style="border-radius:8px;display:block;max-width:100%"></iframe>`));
          }}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* ── 工具栏主体 ────────────────────────────────── */}
      <div style={{
        borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center',
        padding:'0 6px', gap:2, background:'var(--bg-surface)', flexShrink:0,
        overflowX:'auto', minHeight:42, flexWrap:'nowrap' as const, userSelect:'none' as const,
      }}>

        {/* 撤销 / 重做 */}
        <Btn title="撤销 Ctrl+Z" onClick={() => run(ed => ed.commands.undo())}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13"/></svg>
        </Btn>
        <Btn title="重做 Ctrl+Y" onClick={() => run(ed => ed.commands.redo())}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13"/></svg>
        </Btn>

        <Sep />

        {/* 段落样式 */}
        <ToolDropdown label={currentHeading === 'p' ? '正文' : `标题 ${currentHeading[1]}`} minWidth={150}>
          {[{v:'p',l:'正文'},{v:'h1',l:'标题 1'},{v:'h2',l:'标题 2'},{v:'h3',l:'标题 3'},{v:'h4',l:'标题 4'},{v:'h5',l:'标题 5'},{v:'h6',l:'标题 6'}].map(({v,l}) => (
            <DItem key={v} active={currentHeading===v} onClick={() => run(ed => {
              if (v==='p') ed.commands.setParagraph();
              else ed.commands.setHeading({level:parseInt(v[1]) as 1|2|3|4|5|6});
            })}>{l}</DItem>
          ))}
        </ToolDropdown>

        <Sep />

        {/* 字体 */}
        <ToolDropdown label="字体" minWidth={200}>
          {FONT_FAMILIES.map(f => (
            <DItem key={f.value} onClick={() => {
              const el = document.querySelector('.ProseMirror') as HTMLElement;
              if (el) el.style.fontFamily = f.value;
            }}><span style={{fontFamily:f.value||'inherit'}}>{f.label}</span></DItem>
          ))}
        </ToolDropdown>

        {/* 字号 */}
        <div style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
          <button onClick={() => {
            const el = document.querySelector('.ProseMirror') as HTMLElement;
            const cur = parseInt(el?.style.fontSize || '15');
            const s = String(Math.max(8, cur-1));
            if (el) el.style.fontSize = s+'px';
          }} style={{ width:20, height:30, border:'0.5px solid var(--border)', borderRight:'none', background:'var(--bg-surface3)', cursor:'pointer', color:'var(--text-secondary)', fontSize:16, borderRadius:'7px 0 0 7px', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
          <select onChange={e => {
            const el = document.querySelector('.ProseMirror') as HTMLElement;
            if (el) el.style.fontSize = e.target.value+'px';
          }} defaultValue="15" style={{ height:30, padding:'0 2px', borderRadius:0, fontSize:12, background:'var(--bg-surface3)', border:'0.5px solid var(--border)', borderLeft:'none', borderRight:'none', color:'var(--text-secondary)', cursor:'pointer', outline:'none', fontFamily:'inherit', width:50, textAlign:'center' as const }}>
            {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => {
            const el = document.querySelector('.ProseMirror') as HTMLElement;
            const cur = parseInt(el?.style.fontSize || '15');
            const s = String(Math.min(96, cur+1));
            if (el) el.style.fontSize = s+'px';
          }} style={{ width:20, height:30, border:'0.5px solid var(--border)', borderLeft:'none', background:'var(--bg-surface3)', cursor:'pointer', color:'var(--text-secondary)', fontSize:16, borderRadius:'0 7px 7px 0', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
        </div>

        <Sep />

        {/* 文字格式 */}
        <Btn title="加粗 Ctrl+B" active={is('bold')} onClick={() => run(ed => ed.commands.toggleBold())}>
          <strong style={{fontSize:13, letterSpacing:0}}>B</strong>
        </Btn>
        <Btn title="斜体 Ctrl+I" active={is('italic')} onClick={() => run(ed => ed.commands.toggleItalic())}>
          <em style={{fontSize:13}}>I</em>
        </Btn>
        <Btn title="下划线 Ctrl+U" active={is('underline')} onClick={() => run(ed => ed.commands.toggleUnderline())}>
          <span style={{textDecoration:'underline', fontSize:13}}>U</span>
        </Btn>
        <Btn title="删除线" active={is('strike')} onClick={() => run(ed => ed.commands.toggleStrike())}>
          <span style={{textDecoration:'line-through', fontSize:13}}>S</span>
        </Btn>
        <Btn title="上标" active={is('superscript')} onClick={() => run(ed => { try { ed.chain().focus().unsetSubscript().toggleSuperscript().run(); } catch { ed.chain().focus().toggleSuperscript().run(); } })}>
          <span style={{fontSize:11, lineHeight:1}}>x<sup style={{fontSize:8}}>2</sup></span>
        </Btn>
        <Btn title="下标" active={is('subscript')} onClick={() => run(ed => { try { ed.chain().focus().unsetSuperscript().toggleSubscript().run(); } catch { ed.chain().focus().toggleSubscript().run(); } })}>
          <span style={{fontSize:11, lineHeight:1}}>x<sub style={{fontSize:8}}>2</sub></span>
        </Btn>
        <Btn title="行内代码 Ctrl+E" active={is('code')} onClick={() => run(ed => ed.commands.toggleCode())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </Btn>

        {/* 高亮 */}
        <Btn title="高亮" active={is('highlight')} onClick={() => run(ed => ed.commands.toggleHighlight())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M15.232 5.232l3.536 3.536-6.768 6.768-4.95.707.707-4.95 6.475-6.061zm1.414-1.414a2 2 0 0 1 2.828 2.828L5.293 20.78l-5.657.707.707-5.657L16.646 3.818z"/></svg>
        </Btn>

        {/* 字体颜色 */}
        <ColorDropdown label="字体颜色"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 3h6l4 10H5L9 3z"/><rect x="3" y="18" width="18" height="3" rx="1" fill="currentColor" stroke="none"/></svg>}
          onSelect={color => run(ed => {
            if (!color) ed.chain().focus().unsetColor().run();
            else ed.chain().focus().setColor(color).run();
          })}
        />

        {/* 背景色 */}
        <ColorDropdown label="背景高亮"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>}
          onSelect={color => run(ed => {
            if (!color) ed.chain().focus().unsetHighlight().run();
            else ed.chain().focus().toggleHighlight({ color }).run();
          })}
        />

        {/* 清除格式 */}
        <Btn title="清除格式" onClick={() => run(ed => { ed.commands.unsetAllMarks(); ed.commands.clearNodes(); })}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/><line x1="2" y1="2" x2="22" y2="22" strokeWidth="1.5"/>
          </svg>
        </Btn>

        <Sep />

        {/* 对齐 */}
        {(['left','center','right','justify'] as const).map(align => {
          const paths: Record<string, string[]> = {
            left:['M3 6h18','M3 12h12','M3 18h15'],
            center:['M3 6h18','M6 12h12','M4 18h16'],
            right:['M3 6h18','M9 12h12','M6 18h15'],
            justify:['M3 6h18','M3 12h18','M3 18h18'],
          };
          const titles: Record<string,string> = { left:'左对齐', center:'居中', right:'右对齐', justify:'两端对齐' };
          return (
            <Btn key={align} title={titles[align]}
              active={e?.isActive({textAlign:align}) ?? false}
              onClick={() => run(ed => ed.commands.setTextAlign(align))}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {paths[align].map((d,i) => <path key={i} d={d}/>)}
              </svg>
            </Btn>
          );
        })}

        {/* 行间距 */}
        <ToolDropdown label={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><polyline points="7 3 4 6 7 9"/><polyline points="7 21 4 18 7 15"/></svg>} minWidth={160} active={lineSpacing !== '1.8'}>
          {LINE_SPACINGS.map(s => (
            <DItem key={s.value} active={lineSpacing===s.value} onClick={() => applyLineSpacing(s.value)}>{s.label}</DItem>
          ))}
        </ToolDropdown>

        <Sep />

        {/* 列表 */}
        <Btn title="无序列表" active={is('bulletList')} onClick={() => run(ed => ed.commands.toggleBulletList())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.2" fill="currentColor"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/><circle cx="4" cy="18" r="1.2" fill="currentColor"/></svg>
        </Btn>
        <Btn title="有序列表" active={is('orderedList')} onClick={() => run(ed => ed.commands.toggleOrderedList())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
        </Btn>
        <Btn title="待办列表" active={is('taskList')} onClick={() => run(ed => ed.commands.toggleTaskList())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </Btn>
        <Btn title="减少缩进" onClick={() => run(ed => ed.commands.liftListItem?.('listItem'))}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/><polyline points="13 10 9 12 13 14"/></svg>
        </Btn>
        <Btn title="增加缩进" onClick={() => run(ed => ed.commands.sinkListItem?.('listItem'))}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/><polyline points="9 10 13 12 9 14"/></svg>
        </Btn>

        <Sep />

        {/* 块 */}
        <Btn title="引用块" active={is('blockquote')} onClick={() => run(ed => ed.commands.toggleBlockquote())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
        </Btn>
        <Btn title="代码块" active={is('codeBlock')} onClick={() => run(ed => ed.commands.toggleCodeBlock())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 9 7 12 9 15"/><polyline points="15 9 17 12 15 15"/></svg>
        </Btn>

        <Sep />

        {/* 插入 */}
        <ToolDropdown label="插入" minWidth={180}>
          <DItem onClick={() => setDialog('link')} shortcut="Ctrl+K">🔗 链接</DItem>
          <DItem onClick={() => setDialog('image')}>🖼 图片</DItem>
          <DItem onClick={() => setDialog('video')}>🎬 嵌入视频</DItem>
          <DItem onClick={() => setDialog('table')}>📊 表格</DItem>
          <DSep />
          <DItem onClick={() => run(ed => ed.commands.setHorizontalRule())}>─ 分割线</DItem>
          <DItem onClick={() => run(ed => ed.commands.insertContent(new Date().toLocaleString('zh-CN')))}>🕐 当前时间</DItem>
        </ToolDropdown>

        {/* 表格内操作（仅当光标在表格内时显示） */}
        {is('table') && (
          <>
            <Sep />
            <ToolDropdown label="表格" minWidth={170} active>
              <DItem onClick={() => run(ed => ed.commands.addRowBefore())}>↑ 上方插入行</DItem>
              <DItem onClick={() => run(ed => ed.commands.addRowAfter())}>↓ 下方插入行</DItem>
              <DItem onClick={() => run(ed => ed.commands.addColumnBefore())}>← 左侧插入列</DItem>
              <DItem onClick={() => run(ed => ed.commands.addColumnAfter())}>→ 右侧插入列</DItem>
              <DSep />
              <DItem onClick={() => run(ed => ed.commands.mergeCells?.())}>⊞ 合并单元格</DItem>
              <DItem onClick={() => run(ed => ed.commands.splitCell?.())}>⊟ 拆分单元格</DItem>
              <DSep />
              <DItem onClick={() => run(ed => ed.commands.deleteRow())} danger>删除行</DItem>
              <DItem onClick={() => run(ed => ed.commands.deleteColumn())} danger>删除列</DItem>
              <DItem onClick={() => run(ed => ed.commands.deleteTable())} danger>删除表格</DItem>
            </ToolDropdown>
          </>
        )}

        {/* 更多 */}
        <ToolDropdown label={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>} minWidth={200}>
          <DItem onClick={() => dispatch(setFindOpen(true))} shortcut="Ctrl+F">🔍 查找与替换</DItem>
          <DSep />
          <DItem onClick={() => { const ed=getEditor(); if(!ed) return; const md=ed.getHTML().replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi,(_:any,l:any,t:any)=>'#'.repeat(Number(l))+' '+t+'\n').replace(/<strong[^>]*>(.*?)<\/strong>/gi,'**$1**').replace(/<em[^>]*>(.*?)<\/em>/gi,'*$1*').replace(/<code[^>]*>(.*?)<\/code>/gi,'`$1`').replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/gi,'[$2]($1)').replace(/<br\s*\/?>/gi,'\n').replace(/<p[^>]*>(.*?)<\/p>/gi,'$1\n\n').replace(/<[^>]+>/g,'').trim(); navigator.clipboard.writeText(md); }}>⬇ 复制为 Markdown</DItem>
          <DItem onClick={() => { const ed=getEditor(); if(ed) navigator.clipboard.writeText(ed.getText()); }}>📋 复制为纯文本</DItem>
          <DSep />
          <DItem onClick={handlePrint} shortcut="Ctrl+P">🖨 打印 / 导出 PDF</DItem>
          <DSep />
          <DItem onClick={() => { if(!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{}); else document.exitFullscreen().catch(()=>{}); }} shortcut="F11">⛶ 全屏模式</DItem>
        </ToolDropdown>

        {/* 保存 / 另存为 */}
        <Sep />
        <button
          onClick={handleSave}
          title="保存 Ctrl+S"
          style={{
            height: 30, padding: '0 12px', borderRadius: 7,
            border: '0.5px solid rgba(200,169,110,0.35)',
            background: saveNotice === 'saved' ? 'rgba(82,201,122,0.12)' : 'rgba(200,169,110,0.1)',
            color: saveNotice === 'saved' ? 'rgba(82,201,122,0.9)' : '#c8a96e',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12.5, fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,169,110,0.2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = saveNotice === 'saved' ? 'rgba(82,201,122,0.12)' : 'rgba(200,169,110,0.1)'; }}
        >
          {saveNotice === 'saving' ? (
            <div style={{ width: 9, height: 9, borderRadius: '50%', border: '1.5px solid #c8a96e', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
          ) : saveNotice === 'saved' ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          )}
          {saveNotice === 'saved' ? '已保存' : '保存'}
        </button>
        <button
          onClick={handleSaveAs}
          title="另存为 HTML"
          style={{
            height: 30, padding: '0 12px', borderRadius: 7,
            border: '0.5px solid var(--border)',
            background: 'var(--bg-surface3)',
            color: 'var(--text-secondary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12.5, fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          另存为
        </button>

        <div style={{ flex:1, minWidth:8 }} />

        {/* 右侧面板 tabs — 4个按钮对应4个 tab */}
        {(['outline','stats','plugins','ai'] as const).map(tab => {
          const cfg: Record<string, {title:string; icon:React.ReactNode}> = {
            outline: { title:'大纲', icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3"/><line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3"/><line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3"/></svg> },
            stats:   { title:'统计', icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
            plugins: { title:'插件', icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/></svg> },
            ai:      { title:'AI', icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
          };
          const isActive = rightPanelOpen && rightPanelTab === tab;
          return (
            <Btn key={tab} title={cfg[tab].title} active={isActive} onClick={() => handlePanelBtn(tab)}>
              {cfg[tab].icon}
            </Btn>
          );
        })}

        <Sep />

        {/* 视图切换 */}
        <div style={{ display:'flex', background:'var(--bg-surface3)', borderRadius:8, padding:3, gap:2, flexShrink:0 }}>
          {([{k:'edit',l:'编辑'},{k:'preview',l:'预览'},{k:'focus',l:'专注'}] as const).map(m => (
            <button key={m.k} onClick={() => onModeChange(m.k)} title={m.l} style={{
              padding:'3px 10px', borderRadius:6, fontSize:12, border:'none', cursor:'pointer',
              background:mode===m.k?'var(--bg-surface)':'transparent',
              color:mode===m.k?'var(--text-primary)':'var(--text-tertiary)',
              transition:'all 0.15s', fontFamily:'inherit',
              boxShadow:mode===m.k?'0 1px 4px rgba(0,0,0,0.3)':'none',
            }}>{m.l}</button>
          ))}
        </div>

        {/* 保存状态 */}
        <div style={{
          display:'flex', alignItems:'center', gap:5, padding:'4px 10px',
          borderRadius:20, marginLeft:6, flexShrink:0,
          background:isSaving?'rgba(74,158,255,0.08)':'rgba(82,201,122,0.06)',
          border:`0.5px solid ${isSaving?'rgba(74,158,255,0.2)':'rgba(82,201,122,0.15)'}`,
          fontSize:11.5, color:isSaving?'#7ab8e8':'rgba(82,201,122,0.8)',
        }}>
          {isSaving
            ? <div style={{ width:5,height:5,borderRadius:'50%',background:'#7ab8e8',animation:'pulse 1s infinite' }}/>
            : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          }
          {isSaving?'保存中':'已保存'}
        </div>
      </div>
    </>
  );
};
