import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { closeTab, setActiveTab, setView } from '../../store/slices/appSlice';
import { fetchDocument, updateDocument } from '../../store/slices/documentsSlice';
import { MarkdownEditor } from './MarkdownEditor';
import { TabBar } from './TabBar';
import { EditorToolbar } from './EditorToolbar';
import { RightPanel } from '../sidebar/RightPanel';
import { DocumentTitle } from './DocumentTitle';

export const EditorArea: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tabs, activeTabId, rightPanelOpen, focusMode } = useSelector((s: RootState) => s.app);
  const openDocuments = useSelector((s: RootState) => s.documents.openDocuments);
  const saving = useSelector((s: RootState) => s.documents.saving);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeDoc = activeTab ? openDocuments[activeTab.documentId] : null;
  const isSaving = activeTabId ? saving[activeTabId] : false;

  useEffect(() => {
    if (activeTab && !openDocuments[activeTab.documentId]) {
      dispatch(fetchDocument(activeTab.documentId));
    }
  }, [activeTab?.documentId]); // eslint-disable-line

  const handleTitleChange = useCallback(async (title: string) => {
    if (!activeDoc) return;
    await dispatch(updateDocument({ id: activeDoc.id, title }));
  }, [activeDoc, dispatch]);

  if (tabs.length === 0) {
    return <EmptyEditor />;
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Editor main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TabBar />
        <EditorToolbar isSaving={isSaving} />

        {/* Editor content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          <AnimatePresence>
            {activeDoc ? (
              <motion.div
                key={activeDoc.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                {/* Document title area */}
                <div style={{
                  padding: '32px 64px 0',
                  maxWidth: 'calc(660px + 128px)',
                  margin: '0 auto',
                  width: '100%',
                }}>
                  <DocumentTitle
                    title={activeDoc.title}
                    onChange={handleTitleChange}
                    tags={activeDoc.tags}
                    updatedAt={activeDoc.updatedAt}
                  />
                </div>
                <MarkdownEditor documentId={activeDoc.id} />
              </motion.div>
            ) : (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <div className="skeleton" style={{ width: 200, height: 20, borderRadius: 8 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right panel */}
      <AnimatePresence>
        {rightPanelOpen && !focusMode && (
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <RightPanel documentId={activeDoc?.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EmptyEditor: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const activeWorkspaceId = useSelector((s: RootState) => s.app.activeWorkspaceId);

  const shortcuts = [
    { keys: 'Ctrl+N', label: '新建文档' },
    { keys: 'Ctrl+K', label: '搜索文档' },
    { keys: 'Ctrl+\', label: '切换侧边栏' },
    { keys: 'Ctrl+/', label: '快捷键列表' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-tertiary)',
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.3 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          width: 64, height: 64,
          background: 'linear-gradient(135deg, #c8a96e, #8b7355)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, color: '#fff', fontFamily: 'var(--font-serif)',
          marginBottom: 24,
        }}
      >
        文
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ fontSize: 17, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 300 }}
      >
        欢迎使用启文
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 40 }}
      >
        选择或新建一篇文档开始创作
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}
      >
        {shortcuts.map((s, i) => (
          <motion.div
            key={s.keys}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.35 + i * 0.05 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <kbd style={{
              background: 'var(--bg-surface2)', border: '0.5px solid var(--border)',
              borderRadius: 6, padding: '3px 8px', fontSize: 12,
              fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', minWidth: 52,
              textAlign: 'center',
            }}>
              {s.keys}
            </kbd>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{s.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};
