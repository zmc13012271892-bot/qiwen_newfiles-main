import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { undo, redo } from '@codemirror/commands';
import { RootState, AppDispatch } from '../../store';
import { toggleFocusMode, toggleRightPanel, setRightPanelTab } from '../../store/slices/appSlice';

interface ToolbarButtonProps {
  onClick?: () => void;
  active?: boolean;
  title?: string;
  children?: React.ReactNode;
  label?: string;
}

const ToolbarBtn: React.FC<ToolbarButtonProps> = ({ onClick, active, title, children, label }) => (
  <motion.button
    whileHover={{ background: active ? 'rgba(200,169,110,0.18)' : 'var(--bg-surface3)', color: 'var(--text-primary)' }}
    whileTap={{ scale: 0.92 }}
    onClick={onClick}
    title={title}
    style={{
      width: label ? 'auto' : 30, height: 30,
      padding: label ? '0 8px' : 0,
      borderRadius: 6, border: 'none',
      background: active ? 'rgba(200,169,110,0.12)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text-secondary)',
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: label ? 12 : 13, fontWeight: 500,
      gap: 5,
      transition: 'all 0.15s',
    }}
  >
    {children}
    {label && <span>{label}</span>}
  </motion.button>
);

const Divider = () => (
  <div style={{ width: 0.5, height: 20, background: 'var(--border)', margin: '0 4px' }} />
);

// ────────────────────────────────────────────────────────
// CodeMirror 格式化操作
// ────────────────────────────────────────────────────────
function getActiveEditor(): any {
  return (window as any).__activeEditor;
}

function wrapSelection(prefix: string, suffix: string = prefix) {
  const view = getActiveEditor();
  if (!view) return;
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const replacement = `${prefix}${selected}${suffix}`;
  view.dispatch({
    changes: { from, to, insert: replacement },
    selection: { anchor: from + prefix.length, head: from + prefix.length + selected.length },
  });
  view.focus();
}

function prefixLine(prefix: string) {
  const view = getActiveEditor();
  if (!view) return;
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const lineText = line.text;
  if (lineText.startsWith(prefix)) {
    view.dispatch({
      changes: { from: line.from, to: line.from + prefix.length, insert: '' },
    });
  } else {
    const stripped = lineText.replace(/^(#{1,6}\s|>\s|-\s|\*\s|\d+\.\s)/, '');
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: prefix + stripped },
    });
  }
  view.focus();
}

function insertBlock(content: string) {
  const view = getActiveEditor();
  if (!view) return;
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const insertPos = line.to;
  view.dispatch({
    changes: { from: insertPos, to: insertPos, insert: '\n' + content },
    selection: { anchor: insertPos + 1 + content.length },
  });
  view.focus();
}

const fmt = {
  bold: () => wrapSelection('**'),
  italic: () => wrapSelection('*'),
  strike: () => wrapSelection('~~'),
  code: () => wrapSelection('`'),
  h1: () => prefixLine('# '),
  h2: () => prefixLine('## '),
  h3: () => prefixLine('### '),
  quote: () => prefixLine('> '),
  bulletList: () => prefixLine('- '),
  numberList: () => prefixLine('1. '),
  codeBlock: () => insertBlock('```\n\n```'),
  link: () => wrapSelection('[', '](url)'),
  image: () => insertBlock('![描述](图片URL)'),
  table: () => insertBlock('| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |'),
  hr: () => insertBlock('---'),
  undo: () => {
    const view = getActiveEditor();
    if (!view) return;
    undo(view);
    view.focus();
  },
  redo: () => {
    const view = getActiveEditor();
    if (!view) return;
    redo(view);
    view.focus();
  },
};

const IconBold = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
  </svg>
);
const IconItalic = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
  </svg>
);
const IconStrike = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 4H9a3 3 0 0 0-2.83 4M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/>
  </svg>
);

interface EditorToolbarProps {
  isSaving?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ isSaving }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { rightPanelOpen, rightPanelTab } = useSelector((s: RootState) => s.app);
  const [mode, setMode] = useState<'edit' | 'preview' | 'focus'>('edit');

  return (
    <div style={{
      height: 'var(--toolbar-height)',
      borderBottom: '0.5px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 2,
      background: 'var(--bg-surface)',
      flexShrink: 0,
      overflowX: 'auto',
    }}>
      {/* 撤销/重做 */}
      <div style={{ display: 'flex', gap: 2 }}>
        <ToolbarBtn title="撤销 Ctrl+Z" onClick={fmt.undo}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13"/>
          </svg>
        </ToolbarBtn>
        <ToolbarBtn title="重做 Ctrl+Y" onClick={fmt.redo}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13"/>
          </svg>
        </ToolbarBtn>
      </div>

      <Divider />

      {/* 文字格式 */}
      <div style={{ display: 'flex', gap: 2 }}>
        <ToolbarBtn title="加粗 Ctrl+B" onClick={fmt.bold}><IconBold /></ToolbarBtn>
        <ToolbarBtn title="斜体 Ctrl+I" onClick={fmt.italic}><IconItalic /></ToolbarBtn>
        <ToolbarBtn title="删除线" onClick={fmt.strike}><IconStrike /></ToolbarBtn>
        <ToolbarBtn title="行内代码" onClick={fmt.code}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </ToolbarBtn>
      </div>

      <Divider />

      {/* 标题与块 */}
      <div style={{ display: 'flex', gap: 2 }}>
        <ToolbarBtn title="一级标题" label="H1" onClick={fmt.h1} />
        <ToolbarBtn title="二级标题" label="H2" onClick={fmt.h2} />
        <ToolbarBtn title="三级标题" label="H3" onClick={fmt.h3} />
        <ToolbarBtn title="引用" onClick={fmt.quote}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
          </svg>
        </ToolbarBtn>
        <ToolbarBtn title="代码块" onClick={fmt.codeBlock}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <polyline points="9 9 7 12 9 15"/><polyline points="15 9 17 12 15 15"/>
          </svg>
        </ToolbarBtn>
      </div>

      <Divider />

      {/* 列表 */}
      <div style={{ display: 'flex', gap: 2 }}>
        <ToolbarBtn title="无序列表" onClick={fmt.bulletList}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>
          </svg>
        </ToolbarBtn>
        <ToolbarBtn title="有序列表" onClick={fmt.numberList}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/>
            <line x1="10" y1="18" x2="21" y2="18"/>
            <path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
          </svg>
        </ToolbarBtn>
      </div>

      <Divider />

      {/* 插入 */}
      <div style={{ display: 'flex', gap: 2 }}>
        <ToolbarBtn title="插入链接" onClick={fmt.link}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </ToolbarBtn>
        <ToolbarBtn title="插入图片" onClick={fmt.image}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </ToolbarBtn>
        <ToolbarBtn title="插入表格" onClick={fmt.table}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
          </svg>
        </ToolbarBtn>
        <ToolbarBtn title="分割线" onClick={fmt.hr}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
          </svg>
        </ToolbarBtn>
      </div>

      <div style={{ flex: 1 }} />

      {/* Right panel tabs */}
      <div style={{ display: 'flex', gap: 2 }}>
        {(['outline', 'stats', 'ai'] as const).map((tab) => {
          const labels = { outline: '大纲', stats: '统计', ai: 'AI' };
          return (
            <ToolbarBtn
              key={tab}
              active={rightPanelOpen && rightPanelTab === tab}
              onClick={() => {
                if (rightPanelOpen && rightPanelTab === tab) dispatch(toggleRightPanel());
                else dispatch(setRightPanelTab(tab));
              }}
              label={labels[tab]}
            />
          );
        })}
      </div>

      <Divider />

      {/* View mode */}
      <div style={{
        display: 'flex', background: 'var(--bg-surface3)',
        borderRadius: 8, padding: 3, gap: 2,
      }}>
        {(['edit', 'preview', 'focus'] as const).map((m) => {
          const labels = { edit: '编辑', preview: '预览', focus: '专注' };
          return (
            <motion.button
              key={m}
              onClick={() => {
                setMode(m);
                if (m === 'focus') dispatch(toggleFocusMode());
              }}
              style={{
                padding: '3px 9px', borderRadius: 5, fontSize: 12,
                background: mode === m ? 'var(--bg-surface)' : 'transparent',
                color: mode === m ? 'var(--text-primary)' : 'var(--text-tertiary)',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
              whileTap={{ scale: 0.96 }}
            >
              {labels[m]}
            </motion.button>
          );
        })}
      </div>

      {/* Save status — 始终本地模式 */}
      <AnimatePresence>
        {(() => {
          const statusKey = isSaving ? 'saving' : 'local';
          const statusText = isSaving ? '保存中' : '本地';
          const colorVar = isSaving ? 'var(--color-info)' : 'var(--text-tertiary)';
          const bgRgba = isSaving ? 'rgba(74,158,255,0.08)' : 'rgba(155,152,144,0.08)';
          const borderRgba = isSaving ? 'rgba(74,158,255,0.2)' : 'rgba(155,152,144,0.2)';
          return (
            <motion.div
              key={statusKey}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20, marginLeft: 8,
                background: bgRgba,
                border: `0.5px solid ${borderRgba}`,
                fontSize: 12, color: colorVar,
              }}
            >
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: colorVar,
                animation: isSaving ? 'pulse 1s infinite' : 'none',
              }} />
              {statusText}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
