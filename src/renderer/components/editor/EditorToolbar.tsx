import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { undo, redo } from '@codemirror/commands';
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

const ToolbarBtn: React.FC<ToolbarButtonProps> = ({ onClick, active, title, children, label }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: label ? 'auto' : 30, height: 30,
      padding: label ? '0 8px' : 0,
      borderRadius: 6, border: 'none',
      background: active ? 'rgba(200,169,110,0.15)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text-secondary)',
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: label ? 12 : 13, fontWeight: active ? 600 : 500,
      gap: 5, transition: 'all 0.15s',
      boxShadow: active ? 'inset 0 0 0 1px rgba(200,169,110,0.3)' : 'none',
    }}
    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface3)'; }}
    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = active ? 'rgba(200,169,110,0.15)' : 'transparent'; }}
  >
    {children}
    {label && <span>{label}</span>}
  </button>
);

const Divider = () => (
  <div style={{ width: 0.5, height: 20, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
);

// ── CodeMirror 格式化 ─────────────────────────────────────
function getEditor(): any { return (window as any).__activeEditor; }

function wrapSelection(prefix: string, suffix: string = prefix) {
  const view = getEditor(); if (!view) return;
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: `${prefix}${selected}${suffix}` },
    selection: { anchor: from + prefix.length, head: from + prefix.length + selected.length },
  });
  view.focus();
}

function prefixLine(prefix: string) {
  const view = getEditor(); if (!view) return;
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  if (line.text.startsWith(prefix)) {
    view.dispatch({ changes: { from: line.from, to: line.from + prefix.length, insert: '' } });
  } else {
    const stripped = line.text.replace(/^(#{1,6}\s|>\s|-\s|\*\s|\d+\.\s)/, '');
    view.dispatch({ changes: { from: line.from, to: line.to, insert: prefix + stripped } });
  }
  view.focus();
}

function insertBlock(content: string) {
  const view = getEditor(); if (!view) return;
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  view.dispatch({
    changes: { from: line.to, to: line.to, insert: '\n' + content },
    selection: { anchor: line.to + 1 + content.length },
  });
  view.focus();
}

// ── 图标 ─────────────────────────────────────────────────
const IconBold = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>;
const IconItalic = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>;
const IconStrike = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4H9a3 3 0 0 0-2.83 4M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>;

interface EditorToolbarProps {
  isSaving?: boolean;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ isSaving, mode, onModeChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { rightPanelOpen, rightPanelTab } = useSelector((s: RootState) => s.app);

  // 追踪当前行的格式状态（用于按钮高亮）
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const checkFormats = useCallback(() => {
    const view = getEditor();
    if (!view) return;
    const { from } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    const lineText = line.text;
    // 检查选中文本
    const { from: selFrom, to: selTo } = view.state.selection.main;
    const selected = selFrom !== selTo ? view.state.sliceDoc(selFrom, selTo) : '';
    const formats = new Set<string>();
    if (selected.startsWith('**') && selected.endsWith('**')) formats.add('bold');
    if (selected.startsWith('*') && selected.endsWith('*') && !selected.startsWith('**')) formats.add('italic');
    if (selected.startsWith('~~') && selected.endsWith('~~')) formats.add('strike');
    if (lineText.startsWith('# ')) formats.add('h1');
    if (lineText.startsWith('## ')) formats.add('h2');
    if (lineText.startsWith('### ')) formats.add('h3');
    if (lineText.startsWith('> ')) formats.add('quote');
    if (lineText.startsWith('- ') || lineText.startsWith('* ')) formats.add('bullet');
    if (/^\d+\. /.test(lineText)) formats.add('number');
    setActiveFormats(formats);
  }, []);

  const fmt = {
    bold: () => { wrapSelection('**'); },
    italic: () => { wrapSelection('*'); },
    strike: () => { wrapSelection('~~'); },
    code: () => { wrapSelection('`'); },
    h1: () => { prefixLine('# '); },
    h2: () => { prefixLine('## '); },
    h3: () => { prefixLine('### '); },
    quote: () => { prefixLine('> '); },
    bullet: () => { prefixLine('- '); },
    number: () => { prefixLine('1. '); },
    codeBlock: () => { insertBlock('```\n\n```'); },
    link: () => { wrapSelection('[', '](url)'); },
    image: () => { insertBlock('![描述](图片URL)'); },
    table: () => { insertBlock('| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |'); },
    hr: () => { insertBlock('---'); },
    undo: () => { const v = getEditor(); if (v) { undo(v); v.focus(); } },
    redo: () => { const v = getEditor(); if (v) { redo(v); v.focus(); } },
  };

  const doFmt = (key: keyof typeof fmt) => {
    fmt[key]();
    setTimeout(checkFormats, 50);
  };

  return (
    <div
      onClick={checkFormats}
      style={{
        height: 'var(--toolbar-height)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 1,
        background: 'var(--bg-surface)',
        flexShrink: 0, overflowX: 'auto',
      }}>

      {/* 撤销/重做 */}
      <ToolbarBtn title="撤销 Ctrl+Z" onClick={() => doFmt('undo')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13"/></svg>
      </ToolbarBtn>
      <ToolbarBtn title="重做 Ctrl+Y" onClick={() => doFmt('redo')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13"/></svg>
      </ToolbarBtn>

      <Divider />

      {/* 文字格式 */}
      <ToolbarBtn title="加粗 Ctrl+B" active={activeFormats.has('bold')} onClick={() => doFmt('bold')}><IconBold /></ToolbarBtn>
      <ToolbarBtn title="斜体 Ctrl+I" active={activeFormats.has('italic')} onClick={() => doFmt('italic')}><IconItalic /></ToolbarBtn>
      <ToolbarBtn title="删除线" active={activeFormats.has('strike')} onClick={() => doFmt('strike')}><IconStrike /></ToolbarBtn>
      <ToolbarBtn title="行内代码" onClick={() => doFmt('code')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      </ToolbarBtn>

      <Divider />

      {/* 标题 */}
      <ToolbarBtn title="一级标题" label="H1" active={activeFormats.has('h1')} onClick={() => doFmt('h1')} />
      <ToolbarBtn title="二级标题" label="H2" active={activeFormats.has('h2')} onClick={() => doFmt('h2')} />
      <ToolbarBtn title="三级标题" label="H3" active={activeFormats.has('h3')} onClick={() => doFmt('h3')} />
      <ToolbarBtn title="引用" active={activeFormats.has('quote')} onClick={() => doFmt('quote')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
      </ToolbarBtn>
      <ToolbarBtn title="代码块" onClick={() => doFmt('codeBlock')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 9 7 12 9 15"/><polyline points="15 9 17 12 15 15"/></svg>
      </ToolbarBtn>

      <Divider />

      {/* 列表 */}
      <ToolbarBtn title="无序列表" active={activeFormats.has('bullet')} onClick={() => doFmt('bullet')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>
      </ToolbarBtn>
      <ToolbarBtn title="有序列表" active={activeFormats.has('number')} onClick={() => doFmt('number')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
      </ToolbarBtn>

      <Divider />

      {/* 插入 */}
      <ToolbarBtn title="插入链接" onClick={() => doFmt('link')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </ToolbarBtn>
      <ToolbarBtn title="插入图片" onClick={() => doFmt('image')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </ToolbarBtn>
      <ToolbarBtn title="插入表格" onClick={() => doFmt('table')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
      </ToolbarBtn>
      <ToolbarBtn title="分割线" onClick={() => doFmt('hr')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/></svg>
      </ToolbarBtn>

      <div style={{ flex: 1 }} />

      {/* 右侧面板 */}
      {(['outline', 'stats', 'ai'] as const).map((tab) => {
        const labels = { outline: '大纲', stats: '统计', ai: 'AI' };
        return (
          <ToolbarBtn key={tab}
            active={rightPanelOpen && rightPanelTab === tab}
            onClick={() => {
              if (rightPanelOpen && rightPanelTab === tab) dispatch(toggleRightPanel());
              else dispatch(setRightPanelTab(tab));
            }}
            label={labels[tab]}
          />
        );
      })}

      <Divider />

      {/* 视图模式 */}
      <div style={{ display: 'flex', background: 'var(--bg-surface3)', borderRadius: 8, padding: 3, gap: 2, flexShrink: 0 }}>
        {(['edit', 'preview', 'focus'] as const).map((m) => {
          const labels = { edit: '编辑', preview: '预览', focus: '专注' };
          return (
            <button key={m} onClick={() => onModeChange(m)}
              style={{
                padding: '3px 9px', borderRadius: 5, fontSize: 12, border: 'none', cursor: 'pointer',
                background: mode === m ? 'var(--bg-surface)' : 'transparent',
                color: mode === m ? 'var(--text-primary)' : 'var(--text-tertiary)',
                transition: 'all 0.2s',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                fontFamily: 'inherit',
              }}>
              {labels[m]}
            </button>
          );
        })}
      </div>

      {/* 保存状态 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 20, marginLeft: 8, flexShrink: 0,
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
