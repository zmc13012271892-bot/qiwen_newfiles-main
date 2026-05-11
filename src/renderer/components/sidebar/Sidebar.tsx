import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setView, View, openTab, setSearchOpen } from '../../store/slices/appSlice';
import { clearAuth } from '../../store/slices/authSlice';
import { createDocument, fetchDocuments } from '../../store/slices/documentsSlice';
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
                    {isLocalMode ? '🔒 本地账号 · 数据仅存于此设备' : user?.email}
                  </div>
                </div>
              </div>
              {isLocalMode && (
                <div style={{
                  marginTop: 10, padding: '8px 10px',
                  background: 'rgba(200,169,110,0.08)', borderRadius: 8,
                  border: '0.5px solid rgba(200,169,110,0.2)',
                  fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.5,
                }}>
                  💡 注册后可云端同步，数据不会丢失。
                </div>
              )}
            </div>
            {isLocalMode && (
              <MenuItem icon="✨" label="用此账号注册" desc="升级为云端账号，跨设备同步" accent
                onClick={() => { setMenuOpen(false); dispatch(setView('settings')); }} />
            )}
            <MenuItem icon="⚙️" label="偏好设置"
              onClick={() => { setMenuOpen(false); dispatch(setView('settings')); }} />
            {!isLocalMode && (
              <MenuItem icon="🚪" label="退出登录" danger
                onClick={() => { setMenuOpen(false); dispatch(clearAuth()); }} />
            )}
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
          <div style={{ fontSize: 11, color: 'var(--accent)' }}>
            {isLocalMode ? '🔒 本地模式' : '✦ ' + (user?.plan === 'free' ? '免费版' : '专业版')}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </motion.button>
    </div>
  );
};

const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode; section: string; badge?: number }[] = [
  {
    id: 'workbench', label: '工作台', section: '工作区',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    id: 'library', label: '文档库', section: '工作区',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  },
  {
    id: 'references', label: '文献库', section: '工作区',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  },
  {
    id: 'ai', label: 'AI 助手', section: '工具',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  },
  {
    id: 'templates', label: '模板库', section: '工具',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    id: 'plugins', label: '插件市场', section: '工具',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  },
];

const sections = ['工作区', '工具'];

interface SidebarProps {
  width?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ width = 220 }) => {
  const dispatch = useDispatch<AppDispatch>();
  const activeView = useSelector((s: RootState) => s.app.activeView);
  const activeWorkspaceId = useSelector((s: RootState) => s.app.activeWorkspaceId);
  const workspaces = useSelector((s: RootState) => s.workspaces.items);
  const documents = useSelector((s: RootState) => s.documents.tree);
  const profile = useSelector((s: RootState) => (s as any).profile);

  const [recentDocs, setRecentDocs] = useState<DocumentMeta[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeWorkspaceId) {
      dispatch(fetchDocuments({ workspaceId: activeWorkspaceId }));
    }
  }, [activeWorkspaceId, dispatch]);

  useEffect(() => {
    const sorted = [...documents].sort((a, b) => b.updatedAt - a.updatedAt);
    setRecentDocs(sorted.slice(0, 5));
  }, [documents]);

  const handleNewDoc = async () => {
    if (!activeWorkspaceId) return;
    const doc = await dispatch(createDocument({ workspaceId: activeWorkspaceId, title: '无标题' })).unwrap();
    dispatch(openTab({ documentId: doc.id, title: doc.title }));
    dispatch(setView('library'));
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width,
        flexShrink: 0,
        borderRight: '0.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 5,
      }}
    >
      {/* Header */}
      <div style={{ padding: 'calc(var(--titlebar-height) + 12px) 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 30, height: 30,
            background: 'linear-gradient(135deg, #c8a96e, #8b7355)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: '#fff', fontWeight: 500,
            fontFamily: 'var(--font-serif)',
            flexShrink: 0, cursor: 'pointer',
          }}
        >
          文
        </motion.div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: 0.3, color: 'var(--text-primary)' }}>启文</div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.8px' }}>QIWEN STUDIO</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 8px 8px' }}>
        <button
          onClick={() => dispatch(setSearchOpen(true))}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-surface3)', borderRadius: 8, padding: '7px 10px',
            border: '0.5px solid var(--border)', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)', flex: 1 }}>搜索文档...</span>
          <kbd style={{
            fontSize: 10, color: 'var(--text-tertiary)',
            background: 'rgba(255,255,255,0.06)', padding: '2px 5px',
            borderRadius: 4, fontFamily: 'var(--font-mono)',
          }}>⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '0 8px' }}>
        {sections.map((section) => {
          const items = NAV_ITEMS.filter(i => i.section === section);
          return (
            <div key={section} style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 10, letterSpacing: '1.2px', color: 'var(--text-tertiary)',
                textTransform: 'uppercase', padding: '8px 8px 4px', fontWeight: 500,
              }}>
                {section}
              </div>
              {items.map((item, idx) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 + 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => dispatch(setView(item.id))}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 13.5, border: 'none', textAlign: 'left',
                    position: 'relative',
                    background: activeView === item.id ? 'rgba(200,169,110,0.1)' : 'transparent',
                    color: activeView === item.id ? 'var(--accent)' : 'var(--text-secondary)',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  whileHover={{
                    background: activeView === item.id ? 'rgba(200,169,110,0.12)' : 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Active indicator */}
                  <AnimatePresence>
                    {activeView === item.id && (
                      <motion.div
                        layoutId="activeIndicator"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        exit={{ scaleY: 0 }}
                        style={{
                          position: 'absolute', left: 0, top: '50%',
                          transform: 'translateY(-50%)',
                          width: 3, height: 16,
                          background: 'var(--accent)',
                          borderRadius: '0 2px 2px 0',
                        }}
                      />
                    )}
                  </AnimatePresence>
                  <span style={{ opacity: activeView === item.id ? 1 : 0.65, flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                  {item.badge && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 11,
                      background: 'rgba(255,255,255,0.08)',
                      padding: '1px 6px', borderRadius: 10, color: 'var(--text-tertiary)',
                    }}>
                      {item.badge}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          );
        })}

        {/* Recent documents */}
        {recentDocs.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: '1.2px', color: 'var(--text-tertiary)', textTransform: 'uppercase', padding: '8px 8px 4px', fontWeight: 500 }}>
              最近编辑
            </div>
            {recentDocs.map((doc) => (
              <motion.button
                key={doc.id}
                whileHover={{ background: 'var(--bg-hover)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  dispatch(openTab({ documentId: doc.id, title: doc.title }));
                  dispatch(setView('library'));
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 12.5, color: 'var(--text-tertiary)', border: 'none',
                  background: 'transparent', textAlign: 'left', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0, opacity: 0.5 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{doc.title}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* New document button */}
      <div style={{ padding: '8px', paddingBottom: '60px' }}>
        <motion.button
          whileHover={{ background: 'rgba(200,169,110,0.15)', borderColor: 'rgba(200,169,110,0.3)' }}
          whileTap={{ scale: 0.97 }}
          onClick={handleNewDoc}
          style={{
            width: '100%', padding: '8px', borderRadius: 8,
            border: '0.5px dashed var(--border-md)',
            background: 'transparent', cursor: 'pointer',
            fontSize: 12.5, color: 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新建文档
        </motion.button>
      </div>

      {/* 账号栏已移至App.tsx全局固定位置 */}
    </motion.div>
  );
};
