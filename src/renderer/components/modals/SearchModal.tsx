import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setSearchOpen, openTab } from '../../store/slices/appSlice';
import { searchDocuments } from '../../store/slices/documentsSlice';

export const SearchModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const searchOpen = useSelector((s: RootState) => s.app.searchOpen);
  const activeWorkspaceId = useSelector((s: RootState) => s.app.activeWorkspaceId);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) { setQuery(''); setResults([]); setTimeout(() => inputRef.current?.focus(), 80); }
  }, [searchOpen]);

  useEffect(() => {
    if (!query.trim() || !activeWorkspaceId) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await dispatch(searchDocuments({ workspaceId: activeWorkspaceId, query })).unwrap();
        setResults(res);
        setSelectedIdx(0);
      } finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [query, activeWorkspaceId, dispatch]);

  const handleSelect = (doc: any) => {
    dispatch(openTab({ documentId: doc.id, title: doc.title }));
    dispatch(setSearchOpen(false));
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') dispatch(setSearchOpen(false));
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selectedIdx]) handleSelect(results[selectedIdx]);
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => dispatch(setSearchOpen(false))}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 500 }}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              position: 'fixed', top: 160, left: '50%', transform: 'translateX(-50%)',
              width: 580, background: 'var(--bg-surface2)',
              border: '0.5px solid var(--border-md)', borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)', zIndex: 501,
              marginLeft: -290,  // 精确居中，不依赖transform
              left: 'calc(50% - 290px)', transform: 'none',
            }}
          >
            {/* Search input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '0.5px solid var(--border)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey} placeholder="搜索文档标题、内容..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 15, color: 'var(--text-primary)', fontFamily: 'inherit',
                  caretColor: 'var(--accent)',
                }}
              />
              {loading && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />}
              <kbd style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-surface3)', padding: '3px 7px', borderRadius: 5 }}>ESC</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 360, overflowY: 'auto', scrollbarWidth: 'none' }}>
              {results.length === 0 && query && !loading && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13.5 }}>
                  未找到包含「{query}」的文档
                </div>
              )}
              {!query && (
                <div style={{ padding: '20px', color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center' }}>
                  输入关键词搜索文档
                </div>
              )}
              {results.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  onClick={() => handleSelect(doc)}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    padding: '12px 18px', cursor: 'pointer',
                    background: i === selectedIdx ? 'rgba(200,169,110,0.08)' : 'transparent',
                    borderLeft: `2px solid ${i === selectedIdx ? 'var(--accent)' : 'transparent'}`,
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={() => setSelectedIdx(i)}
                >
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 3, fontWeight: i === selectedIdx ? 500 : 400 }}>{doc.title || '无标题'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
                    {doc.content?.slice(0, 100)}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 18px', borderTop: '0.5px solid var(--border)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-tertiary)' }}>
              <span>↑↓ 选择</span><span>↵ 打开</span><span>ESC 关闭</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
