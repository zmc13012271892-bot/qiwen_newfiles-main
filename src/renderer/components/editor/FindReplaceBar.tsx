import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setFindOpen, setFindQuery, setReplaceQuery } from '../../store/slices/editorSlice';

export const FindReplaceBar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isFindOpen, findQuery, replaceQuery } = useSelector((s: RootState) => s.editor);
  const [showReplace, setShowReplace] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchCount, setMatchCount] = useState<{ current: number; total: number } | null>(null);
  const findRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFindOpen) setTimeout(() => findRef.current?.focus(), 50);
  }, [isFindOpen]);

  // 执行查找
  const doFind = (query: string, forward = true) => {
    const editor = (window as any).__activeEditor;
    if (!editor || !query) return;
    // 使用 tiptap 的内置搜索（如果有），否则 DOM 回退
    try {
      if (forward) editor.commands?.find?.(query);
      else editor.commands?.findPrevious?.();
    } catch {}
    // 统计命中数
    const text = editor.getText?.() || '';
    const flags = matchCase ? 'g' : 'gi';
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
    try {
      const matches = [...text.matchAll(new RegExp(pattern, flags))];
      setMatchCount({ current: 1, total: matches.length });
    } catch { setMatchCount(null); }
  };

  // 替换
  const doReplace = () => {
    const editor = (window as any).__activeEditor;
    if (!editor || !findQuery) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().deleteSelection().insertContent(replaceQuery).run();
    }
    doFind(findQuery, true);
  };

  const doReplaceAll = () => {
    const editor = (window as any).__activeEditor;
    if (!editor || !findQuery) return;
    const html = editor.getHTML();
    const flags = matchCase ? 'g' : 'gi';
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
    try {
      const newHtml = html.replace(new RegExp(pattern, flags), replaceQuery);
      editor.commands.setContent(newHtml, false);
      setMatchCount({ current: 0, total: 0 });
    } catch {}
  };

  if (!isFindOpen) return null;

  const inputStyle: React.CSSProperties = {
    flex: 1, height: 26, padding: '0 8px', borderRadius: 6,
    background: 'var(--bg-surface3)', border: '0.5px solid var(--border)',
    color: 'var(--text-primary)', fontSize: 12.5, outline: 'none', fontFamily: 'inherit',
  };

  const optBtn = (active: boolean, title: string, label: string) => (
    <button title={title} onClick={() => {}} style={{
      width: 24, height: 24, borderRadius: 5, border: 'none',
      background: active ? 'rgba(200,169,110,0.2)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text-tertiary)',
      cursor: 'pointer', fontSize: 11, fontFamily: 'monospace',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{label}</button>
  );

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, zIndex: 50,
      background: 'var(--bg-surface2)', border: '0.5px solid var(--border-md)',
      borderRadius: '0 0 0 12px', padding: '10px 12px',
      boxShadow: '-4px 4px 24px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', gap: 8, minWidth: 340,
    }}>
      {/* 查找行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* 展开替换 */}
        <button onClick={() => setShowReplace(s => !s)} style={{
          width: 18, height: 18, border: 'none', background: 'none', cursor: 'pointer',
          color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: showReplace ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontSize: 10,
        }}>▶</button>

        <input
          ref={findRef}
          value={findQuery}
          onChange={e => { dispatch(setFindQuery(e.target.value)); doFind(e.target.value); }}
          onKeyDown={e => {
            if (e.key === 'Enter') doFind(findQuery, !e.shiftKey);
            if (e.key === 'Escape') dispatch(setFindOpen(false));
          }}
          placeholder="查找..."
          style={inputStyle}
        />

        {/* 选项 */}
        <button title="区分大小写" onClick={() => setMatchCase(v => !v)} style={{
          width: 24, height: 24, borderRadius: 5, border: 'none',
          background: matchCase ? 'rgba(200,169,110,0.2)' : 'transparent',
          color: matchCase ? 'var(--accent)' : 'var(--text-tertiary)',
          cursor: 'pointer', fontSize: 11, fontFamily: 'monospace',
        }}>Aa</button>
        <button title="全词匹配" onClick={() => setWholeWord(v => !v)} style={{
          width: 24, height: 24, borderRadius: 5, border: 'none',
          background: wholeWord ? 'rgba(200,169,110,0.2)' : 'transparent',
          color: wholeWord ? 'var(--accent)' : 'var(--text-tertiary)',
          cursor: 'pointer', fontSize: 11, fontFamily: 'monospace',
        }}>W</button>

        {/* 命中计数 */}
        {matchCount && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
            {matchCount.total === 0 ? '无结果' : `${matchCount.total} 处`}
          </span>
        )}

        {/* 上/下 */}
        <button onClick={() => doFind(findQuery, false)} title="上一个 Shift+Enter" style={{
          width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', fontSize: 12,
        }}>↑</button>
        <button onClick={() => doFind(findQuery, true)} title="下一个 Enter" style={{
          width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', fontSize: 12,
        }}>↓</button>

        {/* 关闭 */}
        <button onClick={() => dispatch(setFindOpen(false))} style={{
          width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer',
          color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1,
        }}>×</button>
      </div>

      {/* 替换行 */}
      {showReplace && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 24 }}>
          <input
            value={replaceQuery}
            onChange={e => dispatch(setReplaceQuery(e.target.value))}
            onKeyDown={e => { if (e.key === 'Enter') doReplace(); }}
            placeholder="替换为..."
            style={inputStyle}
          />
          <button onClick={doReplace} style={{
            padding: '0 10px', height: 26, borderRadius: 6, border: '0.5px solid var(--border)',
            background: 'var(--bg-surface3)', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>替换</button>
          <button onClick={doReplaceAll} style={{
            padding: '0 10px', height: 26, borderRadius: 6, border: 'none',
            background: 'linear-gradient(135deg, #c8a96e, #9a7040)', color: '#fff',
            cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>全部替换</button>
        </div>
      )}
    </div>
  );
};
