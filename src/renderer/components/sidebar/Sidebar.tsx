import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setView, View, openTab } from '../../store/slices/appSlice';
import { clearAuth } from '../../store/slices/authSlice';
import { createDocument, fetchDocuments, searchDocuments } from '../../store/slices/documentsSlice';
import { DocumentMeta } from '../../../shared/types';

const MenuItem: React.FC<{
  icon: string; label: string; desc?: string;
  accent?: boolean; danger?: boolean; onClick: () => void;
}> = ({ icon, label, desc, accent, danger, onClick }) => (
  <button onClick={onClick} style={{
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', border: 'none', background: 'transparent',
    cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
  }}
    onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
  >
    <span style={{ fontSize: 14 }}>{icon}</span>
    <div>
      <div style={{ fontSize: 13, color: danger ? 'var(--color-danger)' : accent ? 'var(--accent)' : 'var(--text-primary)', fontWeight: accent ? 500 : 400 }}>{label}</div>
      {desc && <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{desc}</div>}
    </div>
  </button>
);

const UserFooter: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => (s as any).auth?.user);
  const isLocalMode = useSelector((s: RootState) => (s as any).auth?.isLocalMode);
  const [menuOpen, setMenuOpen] = useState(false);

  const avatarColor = user?.avatar || '#4a9eff';
  const initials = (user?.displayName || '用户').slice(0, 1);

  return (
    <div style={{ borderTop: '0.5px solid var(--border)', padding: '10px 8px', position: 'relative' }}>
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: 8, right: 8,
            background: 'var(--bg-surface2)', border: '0.5px solid var(--border-md)',
            borderRadius: 12, zIndex: 100, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: avatarColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 600, color: '#fff', flexShrink: 0,
                }}>{initials}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{user?.displayName || '本地用户'}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    🔒 本地账号 · 数据仅存于此设备
                  </div>
                </div>
              </div>
            </div>
            <MenuItem icon="⚙️" label="偏好设置"
              onClick={() => { setMenuOpen(false); dispatch(setView('settings')); }} />
            <MenuItem icon="🚪" label="退出登录" danger
              onClick={() => { setMenuOpen(false); dispatch(clearAuth()); }} />
          </div>
        </>
      )}
      <motion.button
        whileHover={{ background: 'var(--bg-surface3)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setMenuOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
          border: 'none', background: 'transparent', transition: 'background 0.15s',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: avatarColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0,
        }}>{initials}</div>
        <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.displayName || '本地用户'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--accent)' }}>🔒 本地模式</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </motion.button>
    </div>
  );
};

const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode; section: string }[] = [
  { id: 'workbench', label: '工作台', section: '工作区',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id: 'library', label: '文档库', section: '工作区',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { id: 'references', label: '文献库', section: '工作区',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { id: 'ai', label: 'AI 助手', section: '工具',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> },
  { id: 'templates', label: '模板库', section: '工具',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { id: 'plugins', label: '插件市场', section: '工具',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
];

// ── 内联搜索组件 ──────────────────────────────────────────
const InlineSearch: React.FC<{ activeWorkspaceId: string | null }> = ({ activeWorkspaceId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const allDocs = useSelector((s: RootState) => s.documents.tree);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 点击搜索框时直接显示最近文档
  const recentDocs = [...allDocs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);

  useEffect(() => {
    if (!query.trim() || !activeWorkspaceId) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await dispatch(searchDocuments({ workspaceId: activeWorkspaceId, query })).unwrap();
        setResults(res);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [query, activeWorkspaceId, dispatch]);

  const handleSelect = (doc: any) => {
    dispatch(openTab({ documentId: doc.id, title: doc.title }));
    dispatch(setView('workbench'));
    setQuery(''); setResults([]); setOpen(false);
  };

  // 实际显示的列表：有输入时显示搜索结果，无输入时显示最近文档
  const displayList = query.trim() ? results : recentDocs;
  const showDropdown = open;
    setQuery(''); setResults([]); setOpen(false);
  };

  return (
    <div style={{ padding: '0 8px 8px', position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-surface3)', borderRadius: 8, padding: '7px 10px',
        border: open ? '0.5px solid rgba(200,169,110,0.3)' : '0.5px solid var(--border)',
        transition: 'border-color 0.15s',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => { if (e.key === 'Escape') { setQuery(''); setOpen(false); inputRef.current?.blur(); } }}
          placeholder="搜索文档... (Ctrl+K)"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 12.5, color: 'var(--text-primary)', fontFamily: 'inherit',
            caretColor: 'var(--accent)',
          }}
        />
        {loading && <div style={{ width: 12, height: 12, borderRadius: '50%',
          border: '1.5px solid var(--border)', borderTopColor: 'var(--accent)',
          animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />}
        {query && <button onClick={() => { setQuery(''); setResults([]); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: 'var(--text-tertiary)', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>×</button>}
      </div>

      {/* 搜索结果下拉 */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: '100%', left: 8, right: 8,
              background: 'var(--bg-surface2)', border: '0.5px solid var(--border-md)',
              borderRadius: 10, overflow: 'hidden', zIndex: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: 280, overflowY: 'auto' as const,
            }}
          >
            {!query.trim() && (
              <div style={{ padding: '8px 14px 4px', fontSize: 11, color: 'var(--text-tertiary)',
                letterSpacing: '0.8px', textTransform: 'uppercase' as const }}>
                最近编辑
              </div>
            )}
            {loading && (
              <div style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--text-tertiary)', textAlign: 'center' as const }}>
                搜索中...
              </div>
            )}
            {!loading && query.trim() && displayList.length === 0 && (
              <div style={{ padding: '20px 14px', fontSize: 12.5, color: 'var(--text-tertiary)', textAlign: 'center' as const }}>
                未找到「{query}」相关文档
              </div>
            )}
            {!loading && !query.trim() && displayList.length === 0 && (
              <div style={{ padding: '20px 14px', fontSize: 12.5, color: 'var(--text-tertiary)', textAlign: 'center' as const }}>
                还没有文档，新建一篇开始写作
              </div>
            )}
            {!loading && displayList.map((doc: any) => (
              <div key={doc.id} onMouseDown={() => handleSelect(doc)}
                style={{ padding: '9px 14px', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {doc.title || '无标题'}
                </div>
                {doc.content && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {doc.content.replace(/<[^>]+>/g, '').slice(0, 60)}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SidebarProps { width?: number; }

export const Sidebar: React.FC<SidebarProps> = ({ width = 220 }) => {
  const dispatch = useDispatch<AppDispatch>();
  const activeView = useSelector((s: RootState) => s.app.activeView);
  const activeWorkspaceId = useSelector((s: RootState) => s.app.activeWorkspaceId);
  const documents = useSelector((s: RootState) => s.documents.tree);
  const [recentDocs, setRecentDocs] = useState<DocumentMeta[]>([]);

  useEffect(() => {
    if (activeWorkspaceId) dispatch(fetchDocuments({ workspaceId: activeWorkspaceId }));
  }, [activeWorkspaceId, dispatch]);

  useEffect(() => {
    const sorted = [...documents].sort((a, b) => b.updatedAt - a.updatedAt);
    setRecentDocs(sorted.slice(0, 5));
  }, [documents]);

  const handleNewDoc = async () => {
    if (!activeWorkspaceId) return;
    const doc = await dispatch(createDocument({ workspaceId: activeWorkspaceId, title: '无标题' })).unwrap();
    dispatch(openTab({ documentId: doc.id, title: doc.title }));
    dispatch(setView('workbench'));
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width, flexShrink: 0,
        borderRight: '0.5px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-surface)',
        overflow: 'hidden', position: 'relative', zIndex: 5,
      }}
    >
      {/* Header */}
      <div style={{ padding: 'calc(var(--titlebar-height) + 12px) 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, background: 'linear-gradient(135deg, #c8a96e, #8b7355)',
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, color: '#fff', fontWeight: 500, fontFamily: 'var(--font-serif)', flexShrink: 0,
        }}>文</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: 0.3, color: 'var(--text-primary)' }}>启文</div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.8px' }}>QIWEN STUDIO</div>
        </div>
      </div>

      {/* 内联搜索 */}
      <InlineSearch activeWorkspaceId={activeWorkspaceId} />

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '0 8px' }}>
        {['工作区', '工具'].map((section) => {
          const items = NAV_ITEMS.filter(i => i.section === section);
          return (
            <div key={section} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, letterSpacing: '1.2px', color: 'var(--text-tertiary)',
                textTransform: 'uppercase', padding: '8px 8px 4px', fontWeight: 500 }}>
                {section}
              </div>
              {items.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => dispatch(setView(item.id))}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                      fontSize: 13.5, border: 'none', textAlign: 'left', position: 'relative',
                      background: isActive ? 'rgba(200,169,110,0.1)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      transition: 'background 0.15s, color 0.15s',
                      marginBottom: 2,
                    }}
                    onMouseOver={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {isActive && (
                      <div style={{
                        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                        width: 3, height: 16, background: 'var(--accent)', borderRadius: '0 2px 2px 0',
                      }} />
                    )}
                    <span style={{ opacity: isActive ? 1 : 0.65, flexShrink: 0 }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* 最近编辑 */}
        {recentDocs.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: '1.2px', color: 'var(--text-tertiary)',
              textTransform: 'uppercase', padding: '8px 8px 4px', fontWeight: 500 }}>
              最近编辑
            </div>
            {recentDocs.map(doc => (
              <button key={doc.id}
                onClick={() => { dispatch(openTab({ documentId: doc.id, title: doc.title })); dispatch(setView('workbench')); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 12.5, color: 'var(--text-tertiary)', border: 'none',
                  background: 'transparent', textAlign: 'left', overflow: 'hidden', whiteSpace: 'nowrap',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0, opacity: 0.5 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{doc.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 新建文档按钮 */}
      <div style={{ padding: '8px', paddingBottom: '60px' }}>
        <button
          onClick={handleNewDoc}
          style={{
            width: '100%', padding: '8px', borderRadius: 8,
            border: '0.5px dashed var(--border-md)',
            background: 'transparent', cursor: 'pointer',
            fontSize: 12.5, color: 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(200,169,110,0.08)'; e.currentTarget.style.borderColor = 'rgba(200,169,110,0.3)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-md)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新建文档
        </button>
      </div>

      <UserFooter />
    </motion.div>
  );
};
