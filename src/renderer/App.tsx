import React, { useEffect, useState, useCallback } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { AnimatePresence, motion } from 'framer-motion';
import { store, persistor } from './store';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
import { refreshAccessToken, setLocalMode } from './store/slices/authSlice';
import { loadSettings } from './store/slices/settingsSlice';
import { fetchWorkspaces } from './store/slices/workspacesSlice';
import { fetchDocuments, createDocument, deleteDocument } from './store/slices/documentsSlice';
import { fetchReferences, createReference, deleteReference } from './store/slices/referencesSlice';
import { openTab, setView } from './store/slices/appSlice';
import { ipc } from './utils/ipc';

import { SplashScreen } from './components/auth/SplashScreen';
import { AuthPage } from './components/auth/AuthPage';
import { OnboardingPage } from './components/onboarding/OnboardingPage';
import { TitleBar } from './components/common/TitleBar';
import { Sidebar } from './components/sidebar/Sidebar';
import { EditorArea } from './components/editor/EditorArea';
import { StatusBar } from './components/common/StatusBar';
import { Notification } from './components/common/Notification';
import { SearchModal } from './components/modals/SearchModal';

import './styles/globals.css';
import { SettingsView } from './components/settings/SettingsView';
import { PluginsView } from './plugins/PluginsView';

type AppStage = 'splash' | 'auth' | 'onboarding' | 'app';

// ── 检查 onboardingDone 的统一函数 ───────────────────────
// 同时检查 ipc settings 和 localStorage，任意一个为 true 即认为已完成
async function checkOnboardingDone(): Promise<boolean> {
  try {
    const d = await ipc.invoke<boolean>('settings:get', { key: 'onboardingDone' });
    if (d === true) return true;
  } catch {}
  try {
    if (localStorage.getItem('qiwen_onboarding_done') === '1') return true;
  } catch {}
  return false;
}

// ── 标记 onboardingDone 的统一函数 ──────────────────────
async function markOnboardingDone(): Promise<void> {
  try { await ipc.invoke('settings:set', { key: 'onboardingDone', value: true }); } catch {}
  try { localStorage.setItem('qiwen_onboarding_done', '1'); } catch {}
}

// ── 文档库视图 ────────────────────────────────────────────
const LibraryView: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const activeWorkspaceId = useSelector((s: RootState) => s.app.activeWorkspaceId);
  const documents = useSelector((s: RootState) => s.documents.tree);
  const loading = useSelector((s: RootState) => s.documents.loading);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (activeWorkspaceId) dispatch(fetchDocuments({ workspaceId: activeWorkspaceId }));
  }, [activeWorkspaceId, dispatch]);

  const filtered = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!activeWorkspaceId) return;
    const doc = await dispatch(createDocument({ workspaceId: activeWorkspaceId, title: '无标题' })).unwrap();
    dispatch(openTab({ documentId: doc.id, title: doc.title }));
  };

  const handleOpen = (doc: any) => {
    dispatch(openTab({ documentId: doc.id, title: doc.title }));
    dispatch(setView('workbench'));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('确定删除这篇文档吗？')) dispatch(deleteDocument(id));
  };

  const fmt = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <div style={{ padding: '24px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>文档库</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{documents.length} 篇文档</div>
        </div>
        <button onClick={handleCreate} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
          background: 'linear-gradient(135deg, #c8a96e, #9a7040)', color: '#fff',
          border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新建文档
        </button>
      </div>
      <div style={{ padding: '16px 32px 0' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索文档..."
          style={{
            width: '100%', padding: '9px 14px', background: 'var(--bg-surface2)',
            border: '0.5px solid var(--border)', borderRadius: 9,
            fontSize: 13.5, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: 60 }}>加载中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 15, marginBottom: 8 }}>{search ? '没有找到匹配的文档' : '还没有文档'}</div>
            {!search && <div style={{ fontSize: 13 }}>点击「新建文档」开始创作</div>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {filtered.map(doc => (
              <div key={doc.id} onClick={() => handleOpen(doc)} style={{
                padding: '16px', background: 'var(--bg-surface)', border: '0.5px solid var(--border)',
                borderRadius: 12, cursor: 'pointer', position: 'relative',
                transition: 'border-color 0.15s, background 0.15s',
              }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,169,110,0.4)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface2)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'; }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.title || '无标题'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fmt(doc.updatedAt)}</div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {doc.wordCount > 0 && <span>{doc.wordCount} 字</span>}
                    <button onClick={e => handleDelete(e, doc.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                      color: 'var(--text-tertiary)', fontSize: 12, borderRadius: 4,
                    }}
                      onMouseOver={e => (e.currentTarget.style.color = '#ff6b6b')}
                      onMouseOut={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                    >删除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── 文献库视图 ────────────────────────────────────────────
const ReferencesView: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const activeWorkspaceId = useSelector((s: RootState) => s.app.activeWorkspaceId);
  const { items: refs } = useSelector((s: RootState) => s.references);
  const [search, setSearch] = React.useState('');
  const [showAdd, setShowAdd] = React.useState(false);
  const [form, setForm] = React.useState({ title: '', authors: '', year: '', journal: '', doi: '', abstract: '' });
  const [refsLoading, setRefsLoading] = React.useState(false);

  React.useEffect(() => {
    if (activeWorkspaceId) {
      setRefsLoading(true);
      dispatch(fetchReferences({ workspaceId: activeWorkspaceId })).finally(() => setRefsLoading(false));
    }
  }, [activeWorkspaceId, dispatch]);

  const filtered = refs.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.authors || []).join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!activeWorkspaceId || !form.title.trim()) return;
    await dispatch(createReference({
      workspaceId: activeWorkspaceId,
      title: form.title,
      authors: form.authors.split(',').map(a => a.trim()).filter(Boolean),
      year: form.year ? parseInt(form.year) : null,
      journal: form.journal || null,
      doi: form.doi || null,
      abstract: form.abstract || null,
      citationKey: form.authors.split(',')[0]?.trim().split(' ').pop() + (form.year || '') || 'ref',
      type: 'article',
      keywords: [], tags: [],
    }));
    setForm({ title: '', authors: '', year: '', journal: '', doi: '', abstract: '' });
    setShowAdd(false);
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', background: 'var(--bg-surface2)',
    border: '0.5px solid var(--border)', borderRadius: 8,
    fontSize: 13.5, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
    marginBottom: 10,
  } as React.CSSProperties;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <div style={{ padding: '24px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>文献库</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{refs.length} 篇文献</div>
        </div>
        <button onClick={() => setShowAdd(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
          background: 'linear-gradient(135deg, #c8a96e, #9a7040)', color: '#fff',
          border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          添加文献
        </button>
      </div>
      {showAdd && (
        <div style={{ margin: '16px 32px 0', padding: 20, background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 14 }}>添加文献</div>
          <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="标题 *" style={inputStyle} />
          <input value={form.authors} onChange={e => setForm(f => ({...f, authors: e.target.value}))} placeholder="作者（逗号分隔）" style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input value={form.year} onChange={e => setForm(f => ({...f, year: e.target.value}))} placeholder="年份" style={{...inputStyle, marginBottom: 0}} />
            <input value={form.journal} onChange={e => setForm(f => ({...f, journal: e.target.value}))} placeholder="期刊/出版物" style={{...inputStyle, marginBottom: 0}} />
          </div>
          <input value={form.doi} onChange={e => setForm(f => ({...f, doi: e.target.value}))} placeholder="DOI" style={{...inputStyle, marginTop: 10}} />
          <textarea value={form.abstract} onChange={e => setForm(f => ({...f, abstract: e.target.value}))} placeholder="摘要" rows={3}
            style={{...inputStyle, resize: 'vertical' as const}} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '7px 16px', background: 'transparent', border: '0.5px solid var(--border)', borderRadius: 7, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>取消</button>
            <button onClick={handleAdd} style={{ padding: '7px 16px', background: 'linear-gradient(135deg, #c8a96e, #9a7040)', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>保存</button>
          </div>
        </div>
      )}
      <div style={{ padding: '16px 32px 0' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索文献..." style={{
          width: '100%', padding: '9px 14px', background: 'var(--bg-surface2)',
          border: '0.5px solid var(--border)', borderRadius: 9,
          fontSize: 13.5, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
        }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px' }}>
        {refsLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: 60 }}>加载中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 15, marginBottom: 8 }}>{search ? '没有找到匹配的文献' : '还没有文献'}</div>
            {!search && <div style={{ fontSize: 13 }}>点击「添加文献」导入参考文献</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(ref => (
              <div key={ref.id} style={{ padding: '16px 20px', background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>{ref.title}</div>
                    {ref.authors?.length > 0 && (
                      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 4 }}>{ref.authors.join(', ')}</div>
                    )}
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {ref.year && <span>{ref.year}</span>}
                      {ref.journal && <span>{ref.journal}</span>}
                      {ref.doi && <span>DOI: {ref.doi}</span>}
                    </div>
                  </div>
                  <button onClick={() => dispatch(deleteReference(ref.id))} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                    color: 'var(--text-tertiary)', fontSize: 12, borderRadius: 4, flexShrink: 0,
                  }}
                    onMouseOver={e => (e.currentTarget.style.color = '#ff6b6b')}
                    onMouseOut={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                  >删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── 主视图路由 ────────────────────────────────────────────
const MainContent: React.FC = () => {
  const activeView = useSelector((s: RootState) => s.app.activeView);

  if (activeView === 'library') return <LibraryView />;
  if (activeView === 'references') return <ReferencesView />;
  if (activeView === 'workbench') return <EditorArea />;
  if (activeView === 'settings') return <SettingsView />;
  if (activeView === 'plugins') return <PluginsView />;

  const labels: Record<string, {title: string; icon: string; desc: string}> = {
    ai:        { title: 'AI 助手',  icon: '✨', desc: 'AI 写作助手功能即将上线' },
    templates: { title: '模板库',   icon: '📋', desc: '文档模板功能即将上线' },
  };
  const v = labels[activeView] || { title: activeView, icon: '🚧', desc: '该功能即将上线' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>{v.icon}</div>
      <div style={{ fontSize: 20, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 400 }}>{v.title}</div>
      <div style={{ fontSize: 14 }}>{v.desc}</div>
    </div>
  );
};

const UserAccountBar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => (s as any).auth?.user);
  const isLocalMode = useSelector((s: RootState) => (s as any).auth?.isLocalMode);
  const sidebarOpen = useSelector((s: RootState) => s.app.sidebarOpen);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const avatarColor = user?.avatar || '#4a9eff';
  const initials = (user?.displayName || '用户').slice(0, 1);

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: 0, zIndex: 200,
      width: sidebarOpen ? 220 : 0,
      transition: 'width 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      overflow: 'visible',
      background: 'var(--bg-surface)',
      borderRight: sidebarOpen ? '0.5px solid var(--border)' : 'none',
      borderTop: sidebarOpen ? '0.5px solid var(--border)' : 'none',
    }}>
      <div style={{ width: 220, padding: '8px 8px', position: 'relative', overflow: 'visible' }}>
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 8px)', left: 8, right: 8,
              background: 'var(--bg-surface2)', border: '0.5px solid var(--border-md)',
              borderRadius: 12, zIndex: 100, overflow: 'hidden',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials}</div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{user?.displayName || '本地用户'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{isLocalMode ? '🔒 本地账号 · 数据仅存于此设备' : user?.email}</div>
                  </div>
                </div>
              </div>
              <button onClick={() => { setMenuOpen(false); dispatch(setView('settings')); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                <span>⚙️</span>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>偏好设置</div>
              </button>
            </div>
          </>
        )}
        <button onClick={() => setMenuOpen(v => !v)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
          border: '0.5px solid var(--border)', background: 'var(--bg-surface)',
          transition: 'background 0.15s', backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-surface2)')}
          onMouseOut={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
        >
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials}</div>
          <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.displayName || '本地用户'}</div>
            <div style={{ fontSize: 11, color: 'var(--accent)' }}>{isLocalMode ? '🔒 本地模式' : '✦ 免费版'}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

const AppInner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLocalMode } = useSelector((s: RootState) => (s as any).auth);
  const { sidebarOpen, notification } = useSelector((s: RootState) => s.app);
  const [stage, setStage] = useState<AppStage>('splash');

  // ── Splash 结束后的主流程 ─────────────────────────────
  // 关键：只检查一次 onboardingDone，不依赖多个异步竞态
  const handleSplashDone = useCallback(async () => {
    await dispatch(loadSettings());

    // 1. 先尝试刷新 token（已登录云端用户）
    let authed = false;
    try {
      await dispatch(refreshAccessToken()).unwrap();
      authed = true;
    } catch {}

    // 2. 检查本地账号
    if (!authed) {
      try {
        const localProfile = await ipc.invoke<any>('settings:get', { key: 'localProfile' });
        if (localProfile?.id) {
          dispatch(setLocalMode(localProfile));
          authed = true;
        }
      } catch {}
    }

    // 3. 没有任何账号
    if (!authed) {
      const done = await checkOnboardingDone();
      if (done) {
        // 做过引导但没有账号（清空了数据等极少数情况）→ 去登录页
        setStage('auth');
      } else {
        // 全新用户：直接跳引导页，无需强制登录
        dispatch(setLocalMode(undefined));
        setStage('onboarding');
      }
      return;
    }

    // 4. 有账号 → 检查是否完成引导
    const done = await checkOnboardingDone();
    setStage(done ? 'app' : 'onboarding');
  }, [dispatch]);

  // 登录/本地模式后加载数据
  useEffect(() => {
    if (isAuthenticated || isLocalMode) {
      dispatch(loadSettings());
      dispatch(fetchWorkspaces());
    }
  }, [isAuthenticated, isLocalMode, dispatch]);

  // 退出登录 → 跳回登录页
  useEffect(() => {
    if (!isAuthenticated && !isLocalMode && stage === 'app') {
      setStage('auth');
    }
  }, [isAuthenticated, isLocalMode, stage]);

  // Auth 页登录成功 → 检查 onboarding
  useEffect(() => {
    if ((isAuthenticated || isLocalMode) && stage === 'auth') {
      // 持久化本地账号
      if (isLocalMode) {
        const authState = store.getState().auth as any;
        const authUser = authState?.user;
        if (authUser?.id?.startsWith('local_')) {
          ipc.invoke('settings:get', { key: 'localProfile' }).then((saved: any) => {
            if (!saved) {
              ipc.invoke('settings:set', { key: 'localProfile', value: {
                id: authUser.id,
                username: authUser.username,
                displayName: authUser.displayName,
                avatarColor: authUser.avatar,
              }});
            }
          }).catch(() => {});
        }
      }
      checkOnboardingDone().then(done => {
        setStage(done ? 'app' : 'onboarding');
      });
    }
  }, [isAuthenticated, isLocalMode, stage]);

  // 主题 CSS 变量
  const theme = useSelector((s: RootState) => s.settings.theme);
  const accentColor = useSelector((s: RootState) => s.settings.accentColor);
  useEffect(() => {
    const themes: Record<string, Record<string, string>> = {
      dark: {
        '--bg-base': '#0a0a0f', '--bg-primary': '#0a0a0f',
        '--bg-surface': '#111118', '--bg-surface2': '#16161f', '--bg-surface3': '#1c1c28',
        '--bg-hover': 'rgba(255,255,255,0.04)',
        '--text-primary': '#e8e6e0', '--text-secondary': '#9b9890', '--text-tertiary': '#5a5855',
        '--border': 'rgba(255,255,255,0.07)', '--border-md': 'rgba(255,255,255,0.12)',
      },
      system: {
        '--bg-base': '#0a0a0f', '--bg-primary': '#0a0a0f',
        '--bg-surface': '#111118', '--bg-surface2': '#16161f', '--bg-surface3': '#1c1c28',
        '--bg-hover': 'rgba(255,255,255,0.04)',
        '--text-primary': '#e8e6e0', '--text-secondary': '#9b9890', '--text-tertiary': '#5a5855',
        '--border': 'rgba(255,255,255,0.07)', '--border-md': 'rgba(255,255,255,0.12)',
      },
      light: {
        '--bg-base': '#f5f5f0', '--bg-primary': '#f5f5f0',
        '--bg-surface': '#ffffff', '--bg-surface2': '#f0ede8', '--bg-surface3': '#e8e4de',
        '--bg-hover': 'rgba(0,0,0,0.04)',
        '--text-primary': '#1a1a1a', '--text-secondary': '#4a4a4a', '--text-tertiary': '#888888',
        '--border': 'rgba(0,0,0,0.08)', '--border-md': 'rgba(0,0,0,0.15)',
      },
    };
    const vars = themes[theme] || themes.dark;
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
    if (accentColor) {
      document.documentElement.style.setProperty('--accent', accentColor);
    }
  }, [theme, accentColor]);

  // Token 自动刷新
  useEffect(() => {
    if (!isAuthenticated || isLocalMode) return;
    const iv = setInterval(() => dispatch(refreshAccessToken()), 12 * 60 * 1000);
    return () => clearInterval(iv);
  }, [isAuthenticated, isLocalMode, dispatch]);

  // Electron 菜单
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;
    const handlers: [string, () => void][] = [
      ['toggle-sidebar', () => dispatch({ type: 'app/toggleSidebar' })],
      ['focus-mode', () => dispatch({ type: 'app/toggleFocusMode' })],
      ['open-settings', () => dispatch({ type: 'app/setSettingsOpen', payload: true })],
      ['show-shortcuts', () => dispatch({ type: 'app/setShortcutsOpen', payload: true })],
    ];
    handlers.forEach(([ch, fn]) => api.onMenuAction(ch, fn));
    return () => handlers.forEach(([ch, fn]) => api.removeMenuAction(ch, fn));
  }, [dispatch]);

  return (
    <div className="app-root">
      <AnimatePresence>
        {stage === 'splash' && (
          <SplashScreen key="splash" onFinished={handleSplashDone} />
        )}

        {stage === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ flex: 1, height: '100vh' }}
          >
            <AuthPage onOffline={async () => {
              dispatch({ type: 'auth/setLocalMode' });
              const done = await checkOnboardingDone();
              setStage(done ? 'app' : 'onboarding');
            }} />
          </motion.div>
        )}

        {stage === 'onboarding' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ flex: 1, height: '100vh' }}
          >
            <OnboardingPage onComplete={async () => {
              // OnboardingPage.handleFinish 已写入 ipc settings
              // 这里额外写 localStorage 确保双重保险
              await markOnboardingDone();
              setStage('app');
            }} />
          </motion.div>
        )}

        {stage === 'app' && (
          <motion.div
            key="app"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
          >
            <TitleBar />
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
              <AnimatePresence initial={false}>
                {sidebarOpen && (
                  <motion.div
                    key="sidebar"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 220, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: 'hidden', flexShrink: 0 }}
                  >
                    <Sidebar />
                  </motion.div>
                )}
              </AnimatePresence>
              <MainContent />
            </div>
            <StatusBar />
            <Notification />
            <SearchModal />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const App: React.FC = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <AppInner />
    </PersistGate>
  </Provider>
);

export default App;
