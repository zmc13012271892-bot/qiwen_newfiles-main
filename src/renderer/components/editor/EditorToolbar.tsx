import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { toggleRightPanel, setRightPanelTab } from '../../store/slices/appSlice';
import { EditorMode } from './EditorArea';

// ── 内嵌弹窗（替换window.prompt）───────────────────────────
interface InlineDialogProps {
  title: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  onConfirm: (vals: Record<string, string>) => void;
  onCancel: () => void;
}
const InlineDialog: React.FC<InlineDialogProps> = ({ title, fields, onConfirm, onCancel }) => {
  const [vals, setVals] = useState<Record<string, string>>({});
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    }} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{
        background: 'var(--bg-surface2)', border: '0.5px solid var(--border-md)',
        borderRadius: 14, padding: 24, width: 360,
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 18 }}>{title}</div>
        {fields.map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 5 }}>{f.label}</div>
            <input
              type={f.type || 'text'}
              placeholder={f.placeholder}
              autoFocus={fields[0].key === f.key}
              onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') onConfirm(vals); if (e.key === 'Escape') onCancel(); }}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 8,
                background: 'var(--bg-surface3)', border: '0.5px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13.5, outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onCancel} style={{
            padding: '8px 18px', borderRadius: 8, border: '0.5px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
          }}>取消</button>
          <button onClick={() => onConfirm(vals)} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #c8a96e, #a07840)',
            color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
          }}>确定</button>
        </div>
      </div>
    </div>
  );
};

// ── 工具栏按钮 ─────────────────────────────────────────────
interface BtnProps {
  onClick?: () => void;
  active?: boolean;
  title?: string;
  children?: React.ReactNode;
  label?: string;
  disabled?: boolean;
}
const Btn: React.FC<BtnProps> = ({ onClick, active, title, children, label, disabled }) => (
  <button onClick={onClick} title={title} disabled={disabled} style={{
    width: label ? 'auto' : 28, height: 28, padding: label ? '0 7px' : 0,
    borderRadius: 6, border: 'none',
    background: active ? 'rgba(200,169,110,0.15)' : 'transparent',
    color: disabled ? 'var(--text-tertiary)' : active ? 'var(--accent)' : 'var(--text-secondary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: label ? 12 : 13, fontWeight: active ? 600 : 400, gap: 4,
    transition: 'all 0.12s', flexShrink: 0,
    boxShadow: active ? 'inset 0 0 0 1px rgba(200,169,110,0.3)' : 'none',
    opacity: disabled ? 0.4 : 1,
  }}
    onMouseEnter={e => { if (!active && !disabled) (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface3)'; }}
    onMouseLeave={e => { if (!active && !disabled) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
  >
    {children}{label && <span>{label}</span>}
  </button>
);
const Sep = () => <div style={{ width: 0.5, height: 18, background: 'var(--border)', margin: '0 3px', flexShrink: 0 }} />;

function getEditor(): any { return (window as any).__activeEditor; }

// ── 字体大小选项 ───────────────────────────────────────────
const FONT_SIZES = ['12', '13', '14', '15', '16', '18', '20', '24', '28', '32', '36', '48'];

interface EditorToolbarProps {
  isSaving?: boolean;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ isSaving, mode, onModeChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { rightPanelOpen, rightPanelTab } = useSelector((s: RootState) => s.app);
  const [tick, setTick] = useState(0);
  const [dialog, setDialog] = useState<null | 'link' | 'image' | 'table'>(null);
  const refresh = useCallback(() => setTimeout(() => setTick(t => t + 1), 30), []);

  const e = getEditor();
  const is = (name: string, attrs?: any) => e?.isActive(name, attrs) ?? false;

  const cmd = (fn: (chain: any) => any) => {
    const editor = getEditor();
    if (editor) { fn(editor.chain().focus()); refresh(); }
  };

  // 对齐方式
  const alignIcon = (align: string) => {
    const icons: Record<string, string> = {
      left: 'M3 6h18M3 12h12M3 18h15',
      center: 'M3 6h18M6 12h12M4 18h16',
      right: 'M3 6h18M9 12h12M6 18h15',
      justify: 'M3 6h18M3 12h18M3 18h18',
    };
    return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {icons[align].split('M').filter(Boolean).map((d, i) => <path key={i} d={`M${d}`}/>)}
    </svg>;
  };

  return (
    <>
      {/* 弹窗 */}
      {dialog === 'link' && (
        <InlineDialog
          title="插入链接"
          fields={[
            { key: 'text', label: '显示文字（选填，默认使用选中内容）', placeholder: '链接文字' },
            { key: 'url', label: '链接地址', placeholder: 'https://example.com' },
          ]}
          onConfirm={({ url, text }) => {
            setDialog(null);
            if (!url) return;
            const editor = getEditor(); if (!editor) return;
            if (text) {
              editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
            } else {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'image' && (
        <InlineDialog
          title="插入图片"
          fields={[
            { key: 'src', label: '图片地址', placeholder: 'https://example.com/image.png' },
            { key: 'alt', label: '图片描述（选填）', placeholder: '图片描述' },
          ]}
          onConfirm={({ src, alt }) => {
            setDialog(null);
            if (src) cmd(c => c.setImage({ src, alt: alt || '' }).run());
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'table' && (
        <InlineDialog
          title="插入表格"
          fields={[
            { key: 'rows', label: '行数', placeholder: '3' },
            { key: 'cols', label: '列数', placeholder: '3' },
          ]}
          onConfirm={({ rows, cols }) => {
            setDialog(null);
            const r = parseInt(rows) || 3;
            const c = parseInt(cols) || 3;
            cmd(ch => ch.insertTable({ rows: r, cols: c, withHeaderRow: true }).run());
          }}
          onCancel={() => setDialog(null)}
        />
      )}

      <div style={{
        borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center',
        padding: '0 8px', gap: 1, background: 'var(--bg-surface)', flexShrink: 0,
        overflowX: 'auto', minHeight: 40, flexWrap: 'nowrap',
      }}>

        {/* 撤销/重做 */}
        <Btn title="撤销 Ctrl+Z" onClick={() => cmd(c => c.undo().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13"/></svg>
        </Btn>
        <Btn title="重做 Ctrl+Shift+Z" onClick={() => cmd(c => c.redo().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13"/></svg>
        </Btn>

        <Sep />

        {/* 标题级别下拉 */}
        <select
          title="段落样式"
          value={
            is('heading', {level:1}) ? 'h1' :
            is('heading', {level:2}) ? 'h2' :
            is('heading', {level:3}) ? 'h3' :
            is('heading', {level:4}) ? 'h4' : 'p'
          }
          onChange={e => {
            const val = e.target.value;
            const editor = getEditor(); if (!editor) return;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(val[1]) as 1|2|3|4 }).run();
            refresh();
          }}
          style={{
            height: 26, padding: '0 6px', borderRadius: 6, fontSize: 12,
            background: 'var(--bg-surface3)', border: '0.5px solid var(--border)',
            color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none',
            fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          <option value="p">正文</option>
          <option value="h1">标题 1</option>
          <option value="h2">标题 2</option>
          <option value="h3">标题 3</option>
          <option value="h4">标题 4</option>
        </select>

        <Sep />

        {/* 字体格式 */}
        <Btn title="加粗 Ctrl+B" active={is('bold')} onClick={() => cmd(c => c.toggleBold().run())}><strong style={{fontSize:13}}>B</strong></Btn>
        <Btn title="斜体 Ctrl+I" active={is('italic')} onClick={() => cmd(c => c.toggleItalic().run())}><em style={{fontSize:13}}>I</em></Btn>
        <Btn title="下划线 Ctrl+U" active={is('underline')} onClick={() => cmd(c => c.toggleUnderline().run())}>
          <span style={{ textDecoration: 'underline', fontSize: 13 }}>U</span></Btn>
        <Btn title="删除线" active={is('strike')} onClick={() => cmd(c => c.toggleStrike().run())}>
          <span style={{ textDecoration: 'line-through', fontSize: 13 }}>S</span></Btn>
        <Btn title="高亮" active={is('highlight')} onClick={() => cmd(c => c.toggleHighlight().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></Btn>
        <Btn title="上标" active={is('superscript')} onClick={() => cmd(c => c.toggleSuperscript?.() ?? c)}>
          <span style={{fontSize:12}}>x<sup>2</sup></span></Btn>
        <Btn title="下标" active={is('subscript')} onClick={() => cmd(c => c.toggleSubscript?.() ?? c)}>
          <span style={{fontSize:12}}>x<sub>2</sub></span></Btn>
        <Btn title="行内代码" active={is('code')} onClick={() => cmd(c => c.toggleCode().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></Btn>
        <Btn title="清除格式" onClick={() => cmd(c => c.unsetAllMarks().clearNodes().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></Btn>

        <Sep />

        {/* 对齐 */}
        <Btn title="左对齐" active={is({textAlign:'left'})} onClick={() => cmd(c => c.setTextAlign('left').run())}>{alignIcon('left')}</Btn>
        <Btn title="居中" active={is({textAlign:'center'})} onClick={() => cmd(c => c.setTextAlign('center').run())}>{alignIcon('center')}</Btn>
        <Btn title="右对齐" active={is({textAlign:'right'})} onClick={() => cmd(c => c.setTextAlign('right').run())}>{alignIcon('right')}</Btn>
        <Btn title="两端对齐" active={is({textAlign:'justify'})} onClick={() => cmd(c => c.setTextAlign('justify').run())}>{alignIcon('justify')}</Btn>

        <Sep />

        {/* 列表与块 */}
        <Btn title="无序列表" active={is('bulletList')} onClick={() => cmd(c => c.toggleBulletList().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg></Btn>
        <Btn title="有序列表" active={is('orderedList')} onClick={() => cmd(c => c.toggleOrderedList().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
            <path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg></Btn>
        <Btn title="待办列表" active={is('taskList')} onClick={() => cmd(c => c.toggleTaskList().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></Btn>
        <Btn title="引用" active={is('blockquote')} onClick={() => cmd(c => c.toggleBlockquote().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg></Btn>
        <Btn title="代码块" active={is('codeBlock')} onClick={() => cmd(c => c.toggleCodeBlock().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <polyline points="9 9 7 12 9 15"/><polyline points="15 9 17 12 15 15"/></svg></Btn>

        {/* 增加缩进/减少缩进 */}
        <Btn title="增加缩进" onClick={() => cmd(c => c.sinkListItem?.('listItem') ?? c)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/>
            <polyline points="9 10 13 12 9 14"/></svg></Btn>
        <Btn title="减少缩进" onClick={() => cmd(c => c.liftListItem?.('listItem') ?? c)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/>
            <polyline points="13 10 9 12 13 14"/></svg></Btn>

        <Sep />

        {/* 插入 */}
        <Btn title="插入链接" active={is('link')} onClick={() => setDialog('link')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></Btn>
        <Btn title="插入图片" onClick={() => setDialog('image')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></Btn>
        <Btn title="插入表格" onClick={() => setDialog('table')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg></Btn>
        <Btn title="分割线" onClick={() => cmd(c => c.setHorizontalRule().run())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"/></svg></Btn>

        {/* 表格操作（仅在表格内显示） */}
        {is('table') && <>
          <Sep />
          <Btn title="在上方插入行" onClick={() => cmd(c => c.addRowBefore().run())} label="↑行" />
          <Btn title="在下方插入行" onClick={() => cmd(c => c.addRowAfter().run())} label="↓行" />
          <Btn title="在左侧插入列" onClick={() => cmd(c => c.addColumnBefore().run())} label="←列" />
          <Btn title="在右侧插入列" onClick={() => cmd(c => c.addColumnAfter().run())} label="→列" />
          <Btn title="删除当前行" onClick={() => cmd(c => c.deleteRow().run())} label="删行" />
          <Btn title="删除当前列" onClick={() => cmd(c => c.deleteColumn().run())} label="删列" />
          <Btn title="删除表格" onClick={() => cmd(c => c.deleteTable().run())} label="删表" />
        </>}

        <div style={{ flex: 1 }} />

        {/* 右侧面板 */}
        {(['outline', 'stats', 'ai'] as const).map(tab => {
          const labels = { outline: '大纲', stats: '统计', ai: 'AI' };
          return (
            <Btn key={tab} label={labels[tab]}
              active={rightPanelOpen && rightPanelTab === tab}
              onClick={() => {
                if (rightPanelOpen && rightPanelTab === tab) dispatch(toggleRightPanel());
                else dispatch(setRightPanelTab(tab));
              }} />
          );
        })}

        <Sep />

        {/* 视图切换 */}
        <div style={{ display: 'flex', background: 'var(--bg-surface3)', borderRadius: 8, padding: 3, gap: 2, flexShrink: 0 }}>
          {(['edit', 'preview', 'focus'] as const).map(m => {
            const labels = { edit: '编辑', preview: '预览', focus: '专注' };
            return (
              <button key={m} onClick={() => onModeChange(m)} style={{
                padding: '3px 9px', borderRadius: 5, fontSize: 12, border: 'none', cursor: 'pointer',
                background: mode === m ? 'var(--bg-surface)' : 'transparent',
                color: mode === m ? 'var(--text-primary)' : 'var(--text-tertiary)',
                transition: 'all 0.15s', fontFamily: 'inherit',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}>{labels[m]}</button>
            );
          })}
        </div>

        {/* 保存状态 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
          borderRadius: 20, marginLeft: 8, flexShrink: 0,
          background: isSaving ? 'rgba(74,158,255,0.08)' : 'rgba(155,152,144,0.08)',
          border: `0.5px solid ${isSaving ? 'rgba(74,158,255,0.2)' : 'rgba(155,152,144,0.2)'}`,
          fontSize: 12, color: isSaving ? 'var(--color-info)' : 'var(--text-tertiary)',
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isSaving ? 'var(--color-info)' : 'var(--text-tertiary)',
            animation: isSaving ? 'pulse 1s infinite' : 'none',
          }} />
          {isSaving ? '保存中' : '本地'}
        </div>
      </div>
    </>
  );
};
