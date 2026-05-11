import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
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

interface EditorToolbarProps {
  isSaving?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ isSaving }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { focusMode, rightPanelOpen, rightPanelTab } = useSelector((s: RootState) => s.app);
  const [mode, setMode] = useState<'edit' | 'preview' | 'focus'>('edit');

  const IconBold = () => <b style={{ fontSize: 13 }}>B</b>;
  const IconItalic = () => <i style={{ fontSize: 13 }}>I</i>;
  const IconStrike = () => <s style={{ fontSize: 13 }}>S</s>;

  return (
    <div style={{
      height: 'var(--toolbar-height)',
      borderBottom: '0.5px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 2,
      background: 'var(--bg-surface)',
      flexShrink: 0,
    }}>
      {/* Text formatting */}
      <div style={{ display: 'flex', gap: 2 }}>
        <ToolbarBtn title="加粗 ⌘B"><IconBold /></ToolbarBtn>
        <ToolbarBtn title="斜体 ⌘I"><IconItalic /></ToolbarBtn>
        <ToolbarBtn title="删除线"><IconStrike /></ToolbarBtn>
      </div>

      <Divider />

      {/* Headings & blocks */}
      <div style={{ display: 'flex', gap: 2 }}>
        <ToolbarBtn title="一级标题" label="H1" />
        <ToolbarBtn title="二级标题" label="H2" />
        <ToolbarBtn title="引用">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
          </svg>
        </ToolbarBtn>
        <ToolbarBtn title="代码块">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </ToolbarBtn>
      </div>

      <Divider />

      {/* Insert */}
      <div style={{ display: 'flex', gap: 2 }}>
        <ToolbarBtn title="插入链接">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </ToolbarBtn>
        <ToolbarBtn title="插入图片">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </ToolbarBtn>
        <ToolbarBtn title="插入表格">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
          </svg>
        </ToolbarBtn>
      </div>

      {/* Spacer */}
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

      {/* Save status */}
      <AnimatePresence>
        <motion.div
          key={isSaving ? 'saving' : 'saved'}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20, marginLeft: 8,
            background: isSaving ? 'rgba(74,158,255,0.08)' : 'rgba(82,201,122,0.08)',
            border: `0.5px solid ${isSaving ? 'rgba(74,158,255,0.2)' : 'rgba(82,201,122,0.2)'}`,
            fontSize: 12,
            color: isSaving ? 'var(--color-info)' : 'var(--color-success)',
          }}
        >
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isSaving ? 'var(--color-info)' : 'var(--color-success)',
            animation: isSaving ? 'pulse 1s infinite' : 'none',
          }} />
          {isSaving ? '保存中' : '已同步'}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
