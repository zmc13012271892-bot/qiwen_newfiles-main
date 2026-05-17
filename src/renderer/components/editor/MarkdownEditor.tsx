import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import CharacterCount from '@tiptap/extension-character-count';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { updateStats, updateCursor } from '../../store/slices/editorSlice';
import { setDocumentContent } from '../../store/slices/documentsSlice';
import { markTabDirty } from '../../store/slices/appSlice';
import { autoSave } from '../../utils/autoSave';

interface MarkdownEditorProps {
  documentId: string;
  readOnly?: boolean;
  onContentChange?: (content: string) => void;
}

const FloatingToolbar: React.FC<{ editor: any }> = ({ editor }) => {
  const btn = (active: boolean): React.CSSProperties => ({
    padding: '4px 8px', border: 'none', borderRadius: 5,
    background: active ? 'rgba(200,169,110,0.25)' : 'transparent',
    color: active ? '#c8a96e' : '#e8e6e0',
    cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
    transition: 'all 0.1s', display: 'flex', alignItems: 'center',
    justifyContent: 'center', minWidth: 28, height: 28,
  });
  const sep = { width: 0.5, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 2px' } as React.CSSProperties;

  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 150, placement: 'top' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '4px 8px', background: '#1a1a28',
        border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
      }}>
      <button style={btn(editor.isActive('bold'))} title="加粗 Ctrl+B"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}>
        <strong>B</strong></button>
      <button style={btn(editor.isActive('italic'))} title="斜体 Ctrl+I"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}>
        <em>I</em></button>
      <button style={btn(editor.isActive('underline'))} title="下划线 Ctrl+U"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}>
        <span style={{ textDecoration: 'underline' }}>U</span></button>
      <button style={btn(editor.isActive('strike'))} title="删除线"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}>
        <span style={{ textDecoration: 'line-through' }}>S</span></button>
      <button style={btn(editor.isActive('highlight'))} title="高亮"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHighlight().run(); }}>
        ✦</button>
      <div style={sep} />
      <button style={btn(editor.isActive('heading', { level: 1 }))} title="标题1"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}>
        H1</button>
      <button style={btn(editor.isActive('heading', { level: 2 }))} title="标题2"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}>
        H2</button>
      <div style={sep} />
      <button style={btn(editor.isActive('code'))} title="行内代码"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></button>
      <button style={btn(editor.isActive('link'))} title="链接"
        onMouseDown={e => {
          e.preventDefault();
          const url = window.prompt('输入链接地址：');
          if (url) editor.chain().focus().setLink({ href: url }).run();
          else editor.chain().focus().unsetLink().run();
        }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
      </div>
    </BubbleMenu>
  );
};

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ documentId, readOnly = false, onContentChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const doc = useSelector((s: RootState) => s.documents.openDocuments[documentId]);
  const initialized = useRef(false);
  const lastHtml = useRef('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Placeholder.configure({ placeholder: '开始写作...', emptyEditorClass: 'is-editor-empty' }),
      Typography,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
    ],
    content: '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html === lastHtml.current) return;
      lastHtml.current = html;
      const text = editor.getText();
      const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      const en = (text.match(/\b[a-zA-Z]+\b/g) || []).length;
      dispatch(updateStats({ wordCount: cn + en, charCount: text.length }));
      dispatch(setDocumentContent({ id: documentId, content: html }));
      dispatch(markTabDirty({ id: documentId, dirty: true }));
      autoSave.schedule(documentId, html);
      onContentChange?.(html);
    },
  });

  // 暴露给工具栏
  useEffect(() => {
    if (!editor) return;
    (window as any).__activeEditor = editor;
    (window as any).__editors = (window as any).__editors || {};
    (window as any).__editors[documentId] = editor;
    return () => {
      if ((window as any).__editors) delete (window as any).__editors[documentId];
      if ((window as any).__activeEditor === editor) (window as any).__activeEditor = null;
    };
  }, [editor, documentId]);

  // 初始化内容
  useEffect(() => {
    if (!editor || initialized.current || !doc) return;
    initialized.current = true;
    editor.commands.setContent(doc.content || '', false);
    lastHtml.current = doc.content || '';
    const text = editor.getText();
    const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const en = (text.match(/\b[a-zA-Z]+\b/g) || []).length;
    dispatch(updateStats({ wordCount: cn + en, charCount: text.length }));
  }, [editor, doc, dispatch]);

  // 外部内容同步
  useEffect(() => {
    if (!editor || !doc?.content || doc.content === lastHtml.current) return;
    editor.commands.setContent(doc.content, false);
    lastHtml.current = doc.content;
  }, [doc?.content]); // eslint-disable-line

  // 失焦时立即保存（不等待计时器）
  useEffect(() => {
    if (!editor) return;
    const handleBlur = () => autoSave.flush(documentId);
    editor.on('blur', handleBlur);
    return () => { editor.off('blur', handleBlur); };
  }, [editor, documentId]);

  if (!editor) return null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <FloatingToolbar editor={editor} />
      <EditorContent editor={editor} style={{ flex: 1, overflow: 'auto', height: '100%' }} />
    </div>
  );
};
