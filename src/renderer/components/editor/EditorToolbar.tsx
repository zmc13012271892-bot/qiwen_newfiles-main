import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { toggleRightPanel, setRightPanelTab } from '../../store/slices/appSlice';
import { EditorMode } from './EditorArea';

interface ToolbarButtonProps {
  onClick?: () => void;
  active?: boolean;
  title?: string;
  children?: React.ReactNode;
  label?: string;
}

const Btn: React.FC<ToolbarButtonProps> = ({ onClick, active, title, children, label }) => (
  <button onClick={onClick} title={title} style={{
    width: label ? 'auto' : 28, height: 28,
    padding: label ? '0 7px' : 0,
    borderRadius: 6, border: 'none',
    background: active ? 'rgba(200,169,110,0.15)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: label ? 12 : 13, fontWeight: active ? 600 : 400, gap: 4,
    transition: 'all 0.12s',
    boxShadow: active ? 'inset 0 0 0 1px rgba(200,169,110,0.3)' : 'none',
    flexShrink: 0,
  }}
    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface3)'; }}
    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
  >
    {children}{label && <span>{label}</span>}
  </button>
);

const Sep = () => <div style={{ width: 0.5, height: 18, background: 'var(--border)', margin: '0 3px', flexShrink: 0 }} />;

// 获取Tiptap editor实例
function getEditor(): any { return (window as any).__activeEditor; }

interface EditorToolbarProps {
  isSaving?: boolean;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ isSaving, mode, onModeChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { rightPanelOpen, rightPanelTab } = useSelector((s: RootState) => s.app);

  // 触发格式化后刷新active状态
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTimeout(() => setTick(t => t + 1), 30), []);

  const e = getEditor();
  const is = (name: string, attrs?: any) => e?.isActive(name, attrs) ?? false;

  const cmd = (fn: (e: any) => any) => {
    const editor = getEditor();
    if (editor) { fn(editor.chain().focus()); refresh(); }
  };

  return (
    <div style={{
      height: 'var(--toolbar-height)', borderBottom: '0.5px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 10px', gap: 1,
      background: 'var(--bg-surface)', flexShrink: 0, overflowX: 'auto',
    }}>
      {/* 撤销/重做 */}
      <Btn title="撤销 Ctrl+Z" onClick={() => cmd(c => c.undo().run())}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13"/></svg>
      </Btn>
      <Btn title="重做 Ctrl+Y" onClick={() => cmd(c => c.redo().run())}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13"/></svg>
      </Btn>

      <Sep />

      {/* 文字格式 */}
      <Btn title="加粗 Ctrl+B" active={is('bold')} onClick={() => cmd(c => c.toggleBold().run())}>
        <strong>B</strong></Btn>
      <Btn title="斜体 Ctrl+I" active={is('italic')} onClick={() => cmd(c => c.toggleItalic().run())}>
        <em>I</em></Btn>
      <Btn title="下划线 Ctrl+U" active={is('underline')} onClick={() => cmd(c => c.toggleUnderline().run())}>
        <span style={{ textDecoration: 'underline', fontSize: 13 }}>U</span></Btn>
      <Btn title="删除线" active={is('strike')} onClick={() => cmd(c => c.toggleStrike().run())}>
        <span style={{ textDecoration: 'line-through', fontSize: 13 }}>S</span></Btn>
      <Btn title="高亮" active={is('highlight')} onClick={() => cmd(c => c.toggleHighlight().run())}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      </Btn>

      <Sep />

      {/* 标题 */}
      <Btn title="标题 1" label="H1" active={is('heading', { level: 1 })} onClick={() => cmd(c => c.toggleHeading({ level: 1 }).run())} />
      <Btn title="标题 2" label="H2" active={is('heading', { level: 2 })} onClick={() => cmd(c => c.toggleHeading({ level: 2 }).run())} />
      <Btn title="标题 3" label="H3" active={is('heading', { level: 3 })} onClick={() => cmd(c => c.toggleHeading({ level: 3 }).run())} />

      <Sep />

      {/* 块级 */}
      <Btn title="引用" active={is('blockquote')} onClick={() => cmd(c => c.toggleBlockquote().run())}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
      </Btn>
      <Btn title="代码块" active={is('codeBlock')} onClick={() => cmd(c => c.toggleCodeBlock().run())}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 9 7 12 9 15"/><polyline points="15 9 17 12 15 15"/></svg>
      </Btn>
      <Btn title="行内代码" active={is('code')} onClick={() => cmd(c => c.toggleCode().run())}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      </Btn>

      <Sep />

      {/* 列表 */}
      <Btn title="无序列表" active={is('bulletList')} onClick={() => cmd(c => c.toggleBulletList().run())}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>
      </Btn>
      <Btn title="有序列表" active={is('orderedList')} onClick={() => cmd(c => c.toggleOrderedList().run())}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
      </Btn>
      <Btn title="待办列表" active={is('taskList')} onClick={() => cmd(c => c.toggleTaskList().run())}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      </Btn>

      <Sep />

      {/* 插入 */}
      <Btn title="插入链接" active={is('link')} onClick={() => {
        const editor = getEditor(); if (!editor) return;
        const url = window.prompt('输入链接地址：');
        if (url) editor.chain().focus().setLink({ href: url }).run();
        else editor.chain().focus().unsetLink().run();
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </Btn>
      <Btn title="插入图片" onClick={() => {
        const url = window.prompt('输入图片地址：');
        if (url) cmd(c => c.setImage({ src: url }).run());
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </Btn>
      <Btn title="插入表格" onClick={() => cmd(c => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
      </Btn>
      <Btn title="分割线" onClick={() => cmd(c => c.setHorizontalRule().run())}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/></svg>
      </Btn>

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
            }}>
              {labels[m]}
            </button>
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
  );
};
