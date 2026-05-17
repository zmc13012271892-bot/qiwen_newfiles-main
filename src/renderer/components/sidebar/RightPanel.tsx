import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setRightPanelTab, toggleRightPanel } from '../../store/slices/appSlice';
import { PluginSidebarPanel } from '../../plugins/PluginSidebarPanel';

interface RightPanelProps {
  documentId?: string;
}

export const RightPanel: React.FC<RightPanelProps> = ({ documentId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { rightPanelTab } = useSelector((s: RootState) => s.app);
  const { wordCount, charCount, completionPercent, readingTime, wordGoal } = useSelector((s: RootState) => s.editor);
  const doc = useSelector((s: RootState) => documentId ? s.documents.openDocuments[documentId] : null);

  // Parse outline from doc content
  const outline = React.useMemo(() => {
    if (!doc?.content) return [];
    return doc.content.split('\n')
      .filter(l => l.startsWith('#'))
      .map(l => ({
        level: l.match(/^#+/)?.[0].length || 1,
        text: l.replace(/^#+\s*/, '').trim(),
      }))
      .slice(0, 20);
  }, [doc?.content]);

  const TABS = [
    { id: 'outline', label: '大纲' },
    { id: 'stats',   label: '统计' },
    { id: 'plugins', label: '插件' },
    { id: 'ai',      label: 'AI' },
  ] as const;

  return (
    <div style={{
      width: 260, borderLeft: '0.5px solid var(--border)',
      background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', flexShrink: 0, height: '100%',
    }}>
      {/* Tabs + 关闭按钮 */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', flexShrink: 0, alignItems: 'center' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => dispatch(setRightPanelTab(tab.id as any))}
            style={{
              flex: 1, padding: '10px 0', fontSize: 11.5,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: rightPanelTab === tab.id ? 'var(--accent)' : 'var(--text-tertiary)',
              borderBottom: `2px solid ${rightPanelTab === tab.id ? 'var(--accent)' : 'transparent'}`,
              transition: 'all 0.2s', letterSpacing: 0.2,
              fontFamily: 'inherit',
            }}
          >
            {tab.label}
          </button>
        ))}
        {/* 关闭按钮 */}
        <button
          onClick={() => dispatch(toggleRightPanel())}
          title="关闭面板"
          style={{
            width: 28, height: 28, flexShrink: 0, marginRight: 4,
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--text-tertiary)', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

        {/* OUTLINE */}
        {rightPanelTab === 'outline' && (
          <div style={{ padding: 16 }}>
            {outline.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
                暂无标题结构<br />
                <span style={{ fontSize: 12, opacity: 0.6 }}>使用 # 号创建标题</span>
              </div>
            ) : outline.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: `5px ${8 + (item.level - 1) * 12}px`,
                borderRadius: 7, cursor: 'pointer', fontSize: 13,
                color: item.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: item.level === 1 ? 500 : 400,
                transition: 'background 0.15s',
              }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: item.level === 1 ? 6 : 4,
                  height: item.level === 1 ? 6 : 4,
                  borderRadius: '50%', background: 'var(--accent)', flexShrink: 0,
                  opacity: item.level === 1 ? 1 : 0.5,
                }} />
                {item.text}
              </div>
            ))}
          </div>
        )}

        {/* STATS */}
        {rightPanelTab === 'stats' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: '字符数', value: charCount.toLocaleString() },
                { label: '词语数', value: wordCount.toLocaleString() },
                { label: '段落数', value: doc?.content?.split('\n\n').filter(Boolean).length || 0 },
                { label: '阅读时长', value: `${readingTime} min` },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--bg-surface2)', borderRadius: 9, padding: '12px',
                  border: '0.5px solid var(--border)',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--text-primary)', letterSpacing: -0.5 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Progress ring */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 8px' }}>
              <div style={{ position: 'relative', width: 84, height: 84 }}>
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="33" fill="none" stroke="var(--bg-surface3)" strokeWidth="7" />
                  <circle
                    cx="42" cy="42" r="33" fill="none"
                    stroke="url(#rg)" strokeWidth="7" strokeLinecap="round"
                    strokeDasharray="207.3"
                    strokeDashoffset={207.3 * (1 - completionPercent / 100)}
                    transform="rotate(-90 42 42)"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                  <defs>
                    <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#c8a96e" />
                      <stop offset="100%" stopColor="#e8c98e" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 19, fontWeight: 300, color: 'var(--text-primary)' }}>{completionPercent}%</div>
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>完成度</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              目标 {wordGoal.toLocaleString()} 字 · 已写 {wordCount.toLocaleString()} 字
            </div>
          </div>
        )}

        {/* PLUGINS */}
        {rightPanelTab === 'plugins' && (
          <PluginSidebarPanel documentContent={doc?.content ?? ''} />
        )}

        {/* AI */}
        {rightPanelTab === 'ai' && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.8px', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 10 }}>快速操作</div>
            {[
              { icon: '✦', title: '继续写作', desc: '从当前位置延伸内容' },
              { icon: '⟳', title: '改写润色', desc: '提升语言表达质量' },
              { icon: '◎', title: '提炼摘要', desc: '生成结构化摘要' },
              { icon: '⊕', title: '补充引用', desc: '匹配相关文献资料' },
            ].map(c => (
              <div key={c.title} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 11px', borderRadius: 9, marginBottom: 7, cursor: 'pointer',
                border: '0.5px solid var(--border)', background: 'var(--bg-surface2)',
                transition: 'all 0.22s', fontSize: 13,
              }}
                onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,169,110,0.3)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(200,169,110,0.06)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface2)'; }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: 7,
                  background: 'var(--accent-bg)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12,
                  color: 'var(--accent)',
                }}>
                  {c.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{c.desc}</div>
                </div>
              </div>
            ))}
            <div style={{
              marginTop: 12, display: 'flex', alignItems: 'center', gap: 9,
              background: 'var(--bg-surface3)', borderRadius: 9, padding: '9px 12px',
              border: '0.5px solid var(--border)', cursor: 'text',
            }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', flex: 1 }}>向 AI 提问...</span>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: 4, fontFamily: 'monospace' }}>↵</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
