import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export const StatusBar: React.FC = () => {
  const { cursorLine, cursorCol, wordCount } = useSelector((s: RootState) => s.editor);
  const { isAuthenticated, isLocalMode, user } = useSelector((s: RootState) => (s as any).auth);

  return (
    <div style={{
      height: 24, borderTop: '0.5px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 18,
      background: 'var(--bg-surface)', fontSize: 11, color: 'var(--text-tertiary)',
      flexShrink: 0, position: 'relative', zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-success)' }} />
        Markdown
      </div>
      <div>UTF-8</div>
      <div>第 {cursorLine} 行，第 {cursorCol} 列</div>
      {wordCount > 0 && <div>{wordCount} 字</div>}
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: isLocalMode ? 'var(--color-warning)' : 'var(--color-success)' }} />
        {isLocalMode ? '离线模式' : user?.plan === 'PRO' ? '专业版' : '免费版'}
      </div>
    </div>
  );
};
