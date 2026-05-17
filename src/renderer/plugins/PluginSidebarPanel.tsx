import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { togglePlugin } from '../../store/slices/pluginsSlice';
import {
  FocusTimerPlugin,
  QuickNotePlugin,
  CitationManagerPlugin,
  ClauseLibraryPlugin,
  LegalCheckerPlugin,
  CaseTimelinePlugin,
  LessonPlannerPlugin,
  QuizGeneratorPlugin,
  MindmapPlugin,
  MedicalTemplatePlugin,
  DrugReferencePlugin,
  ICDLookupPlugin,
  ReadabilityPlugin,
  CharacterTrackerPlugin,
  StyleCheckerPlugin,
  KeywordExtractorPlugin,
  OutlineBuilderPlugin,
} from './PluginPanels';

// Map plugin id → component factory
type PluginPanelComponent = React.FC<{ content?: string }>;

const PLUGIN_COMPONENTS: Record<string, PluginPanelComponent> = {
  'focus-timer': FocusTimerPlugin,
  'quick-note': QuickNotePlugin,
  'citation-manager': CitationManagerPlugin,
  'clause-library': ClauseLibraryPlugin,
  'legal-checker': LegalCheckerPlugin,
  'case-timeline': CaseTimelinePlugin,
  'lesson-planner': LessonPlannerPlugin,
  'quiz-generator': QuizGeneratorPlugin,
  'mindmap-preview': MindmapPlugin,
  'medical-template': MedicalTemplatePlugin,
  'drug-reference': DrugReferencePlugin,
  'icd-lookup': ICDLookupPlugin,
  'readability-score': ReadabilityPlugin,
  'character-tracker': CharacterTrackerPlugin,
  'style-checker': StyleCheckerPlugin,
  'keyword-extractor': KeywordExtractorPlugin,
  'outline-builder': OutlineBuilderPlugin,
};

// Plugins that don't have a sidebar panel (they use the word counter in the status bar)
const SIDEBAR_EXCLUDED = new Set(['word-counter']);

interface PluginSidebarPanelProps {
  documentContent?: string;
}

export const PluginSidebarPanel: React.FC<PluginSidebarPanelProps> = ({ documentContent = '' }) => {
  const dispatch = useDispatch<AppDispatch>();
  const installed = useSelector((s: RootState) => s.plugins.installed);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const activePlugins = installed.filter(p =>
    p.isEnabled && p.isInstalled && !SIDEBAR_EXCLUDED.has(p.id) && PLUGIN_COMPONENTS[p.id]
  );

  if (activePlugins.length === 0) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 22, opacity: 0.2, marginBottom: 8 }}>🔌</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          没有启用的插件<br />
          <span style={{ fontSize: 11, opacity: 0.7 }}>在「插件」中启用</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {activePlugins.map((plugin, i) => {
        const Component = PLUGIN_COMPONENTS[plugin.id];
        const isCollapsed = collapsed[plugin.id];

        return (
          <div
            key={plugin.id}
            style={{
              borderBottom: i < activePlugins.length - 1 ? '0.5px solid var(--border)' : 'none',
              padding: '14px 0',
            }}
          >
            {/* Plugin header */}
            <div
              onClick={() => setCollapsed(c => ({ ...c, [plugin.id]: !c[plugin.id] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: isCollapsed ? 0 : 12,
                cursor: 'pointer', padding: '0 16px',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: 14 }}>{plugin.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', flex: 1 }}>
                {plugin.displayName}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Disable button */}
                <button
                  onClick={e => { e.stopPropagation(); dispatch(togglePlugin(plugin.id)); }}
                  title="禁用插件"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-tertiary)', fontSize: 11, padding: '1px 4px',
                    borderRadius: 4, opacity: 0.6,
                    lineHeight: 1,
                  }}
                >⊘</button>
                {/* Collapse toggle */}
                <span style={{
                  fontSize: 10, color: 'var(--text-tertiary)',
                  transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                  transition: 'transform 0.2s', display: 'inline-block',
                }}>▾</span>
              </div>
            </div>

            {/* Plugin content */}
            {!isCollapsed && (
              <div style={{ padding: '0 16px' }}>
                <Component content={documentContent} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
