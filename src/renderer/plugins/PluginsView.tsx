import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { setPlugins, togglePlugin } from '../store/slices/pluginsSlice';
import { ALL_PLUGINS, getAvailablePlugins, PROFESSION_PLUGIN_MAP } from './pluginRegistry';
import { Plugin, PluginCategory } from '../../shared/types';

const CATEGORY_LABELS: Record<PluginCategory, string> = {
  research: '学术研究',
  writing: '写作工具',
  reference: '参考资料',
  export: '导出格式',
  ai: '人工智能',
  theme: '外观主题',
  utility: '效率工具',
};

const CATEGORY_ICONS: Record<PluginCategory, string> = {
  research: '🔬',
  writing: '✍️',
  reference: '📚',
  export: '📤',
  ai: '🤖',
  theme: '🎨',
  utility: '⚙️',
};

export const PluginsView: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const installedPlugins = useSelector((s: RootState) => s.plugins.installed);
  const activeWorkspaceId = useSelector((s: RootState) => s.app.activeWorkspaceId);
  const workspaces = useSelector((s: RootState) => s.workspaces.items);

  const workspace = workspaces.find(w => w.id === activeWorkspaceId);
  const profession = workspace?.profession ?? 'general';
  const available = getAvailablePlugins(profession);

  const [tab, setTab] = useState<'installed' | 'available'>('installed');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PluginCategory | 'all'>('all');
  const [detail, setDetail] = useState<Plugin | null>(null);

  const filterPlugins = (list: Plugin[]) => list.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.displayName.includes(q) || p.description.includes(q) || p.tags.some(t => t.includes(q));
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleToggle = (plugin: Plugin) => {
    dispatch(togglePlugin(plugin.id));
  };

  const handleInstall = (plugin: Plugin) => {
    const updated = [...installedPlugins, { ...plugin, isInstalled: true, isEnabled: true, installedAt: Date.now() }];
    dispatch(setPlugins(updated));
  };

  const allCategories = Array.from(new Set(ALL_PLUGINS.map(p => p.category)));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>插件</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              {installedPlugins.filter(p => p.isEnabled).length} 个已启用 · 根据您的职业自动推荐
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid var(--border)', marginBottom: 0 }}>
          {([['installed', '已安装'], ['available', '可用插件']] as const).map(([key, lbl]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13.5, fontFamily: 'inherit',
              color: tab === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1, transition: 'all 0.2s',
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left filter bar */}
        <div style={{ width: 180, borderRight: '0.5px solid var(--border)', padding: '20px 16px', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.8px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>分类</div>
          {(['all', ...allCategories] as const).map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px',
              background: selectedCategory === cat ? 'var(--bg-hover)' : 'transparent',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              color: selectedCategory === cat ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontSize: 13, textAlign: 'left', transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 13 }}>{cat === 'all' ? '📦' : CATEGORY_ICONS[cat]}</span>
              {cat === 'all' ? '全部' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Main list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ padding: '16px 24px', flexShrink: 0 }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索插件..."
              style={{
                width: '100%', padding: '9px 14px', background: 'var(--bg-surface2)',
                border: '0.5px solid var(--border)', borderRadius: 9,
                fontSize: 13.5, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
            <PluginGrid
              plugins={filterPlugins(tab === 'installed' ? installedPlugins : available)}
              isInstalled={tab === 'installed'}
              onToggle={handleToggle}
              onInstall={handleInstall}
              onDetail={setDetail}
            />
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 320,
              background: 'var(--bg-surface)', borderLeft: '0.5px solid var(--border)',
              display: 'flex', flexDirection: 'column', zIndex: 10,
            }}
          >
            <PluginDetail plugin={detail} onClose={() => setDetail(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Plugin Grid ───────────────────────────────────────────
const PluginGrid: React.FC<{
  plugins: Plugin[];
  isInstalled: boolean;
  onToggle: (p: Plugin) => void;
  onInstall: (p: Plugin) => void;
  onDetail: (p: Plugin) => void;
}> = ({ plugins, isInstalled, onToggle, onInstall, onDetail }) => {
  if (plugins.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}>
      <div style={{ fontSize: 28, opacity: 0.3 }}>🔌</div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>没有找到相关插件</div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {plugins.map(p => (
        <PluginCard key={p.id} plugin={p} isInstalled={isInstalled} onToggle={onToggle} onInstall={onInstall} onDetail={onDetail} />
      ))}
    </div>
  );
};

// ── Plugin Card ───────────────────────────────────────────
const PluginCard: React.FC<{
  plugin: Plugin;
  isInstalled: boolean;
  onToggle: (p: Plugin) => void;
  onInstall: (p: Plugin) => void;
  onDetail: (p: Plugin) => void;
}> = ({ plugin: p, isInstalled, onToggle, onInstall, onDetail }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -1 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onDetail(p)}
      style={{
        padding: 16, borderRadius: 12, cursor: 'pointer',
        background: hovered ? 'var(--bg-surface2)' : 'var(--bg-surface)',
        border: `0.5px solid ${hovered ? 'rgba(200,169,110,0.2)' : 'var(--border)'}`,
        transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: 'var(--bg-surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, border: '0.5px solid var(--border)',
          }}>{p.icon}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{p.displayName}</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>v{p.version}</div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.55, flex: 1 }}>
        {p.description.slice(0, 60)}{p.description.length > 60 ? '...' : ''}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 4,
          background: 'var(--bg-surface3)', color: 'var(--text-tertiary)',
        }}>
          {CATEGORY_ICONS[p.category]} {CATEGORY_LABELS[p.category]}
        </span>

        {isInstalled ? (
          <ToggleSwitch enabled={p.isEnabled} onToggle={e => { e.stopPropagation(); onToggle(p); }} />
        ) : (
          <button onClick={e => { e.stopPropagation(); onInstall(p); }} style={{
            padding: '5px 12px', borderRadius: 7, border: '0.5px solid rgba(200,169,110,0.3)',
            background: 'rgba(200,169,110,0.06)', color: 'var(--accent)', fontSize: 11.5,
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
          }}>安装</button>
        )}
      </div>
    </motion.div>
  );
};

// ── Toggle Switch ─────────────────────────────────────────
const ToggleSwitch: React.FC<{ enabled: boolean; onToggle: (e: React.MouseEvent) => void }> = ({ enabled, onToggle }) => (
  <div onClick={onToggle} style={{
    width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
    background: enabled ? '#c8a96e' : 'var(--bg-surface3)',
    border: `1px solid ${enabled ? '#c8a96e' : 'var(--border)'}`,
    position: 'relative', transition: 'all 0.25s', flexShrink: 0,
  }}>
    <div style={{
      width: 14, height: 14, borderRadius: '50%', background: '#fff',
      position: 'absolute', top: 2, left: enabled ? 18 : 2,
      transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    }} />
  </div>
);

// ── Plugin Detail ─────────────────────────────────────────
const PluginDetail: React.FC<{ plugin: Plugin; onClose: () => void }> = ({ plugin: p, onClose }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>插件详情</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {/* Icon + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--bg-surface2)',
            border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 26, flexShrink: 0,
          }}>{p.icon}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{p.displayName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.author} · v{p.version}</div>
          </div>
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>{p.description}</div>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {p.tags.map(t => (
            <span key={t} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-surface2)', color: 'var(--text-tertiary)', border: '0.5px solid var(--border)' }}>{t}</span>
          ))}
        </div>

        {/* Permissions */}
        {p.permissions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.8px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>权限需求</div>
            {p.permissions.map(perm => (
              <div key={perm} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{perm}</span>
              </div>
            ))}
          </div>
        )}

        {/* Settings preview */}
        {p.settingsSchema.length > 0 && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.8px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8 }}>插件配置项</div>
            {p.settingsSchema.slice(0, 3).map(s => (
              <div key={s.key} style={{ marginBottom: 8, padding: '8px 12px', background: 'var(--bg-surface2)', borderRadius: 8, border: '0.5px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>默认：{String(s.default)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
