import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setFindOpen, setWordGoal } from '../../store/slices/editorSlice';

export const StatusBar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { cursorLine, cursorCol, wordCount, charCount, selectionLength, readingTime, completionPercent, wordGoal } = useSelector((s: RootState) => s.editor);
  const { isLocalMode, user } = useSelector((s: RootState) => (s as any).auth);
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(wordGoal));

  const item = (content: React.ReactNode, title?: string, onClick?: () => void) => (
    <div title={title} onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px', height: '100%',
      cursor: onClick ? 'pointer' : 'default', borderRadius: 3,
      transition: 'background 0.1s', whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {content}
    </div>
  );

  return (
    <div style={{
      height: 24, borderTop: '0.5px solid var(--border)',
      display: 'flex', alignItems: 'center',
      background: 'var(--bg-surface)', fontSize: 11, color: 'var(--text-tertiary)',
      flexShrink: 0, position: 'relative', zIndex: 10, overflow: 'hidden',
    }}>
      {/* 左侧 */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: 4 }}>
        {item(
          <><div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-success)' }} />Markdown</>,
          '文档格式'
        )}
        {item('UTF-8', '文件编码')}
        {item(
          <><span>第 {cursorLine} 行</span><span style={{ opacity: 0.5 }}>，</span><span>第 {cursorCol} 列</span></>,
          '光标位置'
        )}
        {selectionLength > 0 && item(
          <span style={{ color: 'var(--accent)' }}>已选 {selectionLength} 字</span>,
          '选中字符数'
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* 右侧 */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingRight: 4 }}>
        {/* 字数统计 */}
        {wordCount > 0 && item(
          <span>{wordCount.toLocaleString()} 字</span>,
          `共 ${charCount.toLocaleString()} 字符 · 预计阅读 ${readingTime} 分钟`
        )}

        {/* 字数目标 */}
        {editGoal ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px' }}>
            <input
              autoFocus
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              onBlur={() => { const v = parseInt(goalInput); if (v > 0) dispatch(setWordGoal(v)); setEditGoal(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(goalInput); if (v > 0) dispatch(setWordGoal(v)); setEditGoal(false); } if (e.key === 'Escape') setEditGoal(false); }}
              style={{ width: 60, height: 16, fontSize: 11, background: 'var(--bg-surface3)', border: '0.5px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', padding: '0 4px', outline: 'none', fontFamily: 'inherit' }}
            />
            <span>字目标</span>
          </div>
        ) : item(
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 40, height: 3, borderRadius: 2, background: 'var(--bg-surface3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, completionPercent)}%`, background: completionPercent >= 100 ? '#52c97a' : 'var(--accent)', transition: 'width 0.5s', borderRadius: 2 }} />
            </div>
            <span>{completionPercent}%</span>
          </div>,
          `写作目标：${wordCount.toLocaleString()} / ${wordGoal.toLocaleString()} 字（点击修改目标）`,
          () => { setGoalInput(String(wordGoal)); setEditGoal(true); }
        )}

        {/* 查找 */}
        {item(
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
          '查找与替换 Ctrl+F',
          () => dispatch(setFindOpen(true))
        )}

        {/* 阅读时长 */}
        {readingTime > 0 && item(
          <span>约 {readingTime} 分钟读完</span>,
          '预计阅读时长'
        )}

        {/* 账号状态 */}
        {item(
          <><div style={{ width: 5, height: 5, borderRadius: '50%', background: isLocalMode ? 'var(--color-warning)' : 'var(--color-success)' }} />{isLocalMode ? '本地模式' : user?.plan === 'PRO' ? '专业版' : '免费版'}</>,
          isLocalMode ? '数据存储在本地' : `登录账号：${user?.displayName}`
        )}
      </div>
    </div>
  );
};
