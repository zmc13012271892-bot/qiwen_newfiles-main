import React, { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, drawSelection, dropCursor, rectangularSelection, highlightActiveLine } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
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

const themeExtension = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '15px',
    background: 'transparent !important',
    color: 'var(--text-secondary)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-sans)',
    lineHeight: '1.85',
    padding: '48px 64px',
    overflow: 'auto',
  },
  '.cm-content': {
    maxWidth: '660px',
    margin: '0 auto',
    caretColor: '#c8a96e',
    padding: '0 0 200px',
  },
  '.cm-line': { padding: '0' },
  '.cm-focused': { outline: 'none' },
  '.cm-cursor': { borderLeftColor: '#c8a96e', borderLeftWidth: '2px' },
  '.cm-selectionBackground': { background: 'rgba(200,169,110,0.2) !important' },
  '&.cm-focused .cm-selectionBackground': { background: 'rgba(200,169,110,0.25) !important' },
  '.cm-activeLine': { background: 'rgba(255,255,255,0.02) !important' },
  '.cm-gutters': { background: 'transparent', border: 'none', color: 'var(--text-tertiary)', minWidth: '40px' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 4px', fontSize: '12px' },
  // Markdown styling
  '.cm-header-1, .tok-heading1': { color: '#e8e6e0 !important', fontSize: '1.6em', fontWeight: '300', fontFamily: 'var(--font-serif)', letterSpacing: '-0.3px' },
  '.cm-header-2, .tok-heading2': { color: '#e0ddd6 !important', fontSize: '1.3em', fontWeight: '400', fontFamily: 'var(--font-serif)' },
  '.cm-header-3, .tok-heading3': { color: '#d4d1c8 !important', fontSize: '1.1em', fontWeight: '500' },
  '.cm-strong, .tok-strong': { color: '#e8e6e0 !important', fontWeight: '600' },
  '.cm-em, .tok-emphasis': { color: '#c8a96e !important', fontStyle: 'italic' },
  '.cm-link, .tok-link': { color: '#4a9eff !important' },
  '.cm-url, .tok-url': { color: '#4a9eff !important', opacity: 0.7 },
  '.cm-quote, .tok-quote': { color: '#9b9890 !important', borderLeft: '2px solid #c8a96e', paddingLeft: '12px' },
  '.cm-code, .tok-monospace': { fontFamily: 'var(--font-mono)', fontSize: '0.9em', color: '#b88af0 !important', background: 'rgba(184,138,240,0.08)', padding: '1px 4px', borderRadius: '3px' },
  '.cm-hr': { color: 'var(--border-md) !important' },
}, { dark: true });

function countWordsAndChars(text: string) {
  const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (text.match(/\b[a-zA-Z]+\b/g) || []).length;
  return { wordCount: cn + en, charCount: text.length };
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ documentId, readOnly = false, onContentChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const lineNumbersCompartment = useRef(new Compartment());
  const showLineNumbers = useSelector((s: RootState) => s.settings.showLineNumbers);
  const doc = useSelector((s: RootState) => s.documents.openDocuments[documentId]);
  const isInitialized = useRef(false);

  const handleChange = useCallback((content: string) => {
    const { wordCount, charCount } = countWordsAndChars(content);
    dispatch(updateStats({ wordCount, charCount }));
    dispatch(setDocumentContent({ id: documentId, content }));
    dispatch(markTabDirty({ id: documentId, dirty: true }));

    autoSave.schedule(documentId, content);
    onContentChange?.(content);
  }, [documentId, dispatch, onContentChange]);

  useEffect(() => {
    if (!editorRef.current || isInitialized.current) return;
    isInitialized.current = true;

    const extensions = [
      history(),
      drawSelection(),
      dropCursor(),
      rectangularSelection(),
      highlightActiveLine(),
      lineNumbersCompartment.current.of(showLineNumbers ? lineNumbers() : []),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      markdown({ base: markdownLanguage }),
      oneDark,
      themeExtension,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          handleChange(update.state.doc.toString());
        }
        if (update.selectionSet) {
          const sel = update.state.selection.main;
          const line = update.state.doc.lineAt(sel.head);
          dispatch(updateCursor({ line: line.number, col: sel.head - line.from + 1 }));
        }
      }),
      EditorState.readOnly.of(readOnly),
      EditorView.focusChangeEffect.of((_, focusing) => {
        if (!focusing) autoSave.flush(documentId);
        return null;
      }),
    ];

    const state = EditorState.create({
      doc: doc?.content || '',
      extensions,
    });

    viewRef.current = new EditorView({ state, parent: editorRef.current });

    // Initial word count
    const { wordCount, charCount } = countWordsAndChars(doc?.content || '');
    dispatch(updateStats({ wordCount, charCount }));

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
      isInitialized.current = false;
    };
  }, [documentId]); // eslint-disable-line

  // Sync external content changes (e.g., from another device)
  useEffect(() => {
    if (!viewRef.current || !doc) return;
    const currentContent = viewRef.current.state.doc.toString();
    if (currentContent !== doc.content) {
      viewRef.current.dispatch({
        changes: { from: 0, to: currentContent.length, insert: doc.content },
      });
    }
  }, [doc?.content]); // eslint-disable-line

  // Update line numbers
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: lineNumbersCompartment.current.reconfigure(showLineNumbers ? lineNumbers() : []),
    });
  }, [showLineNumbers]);

  return (
    <div
      ref={editorRef}
      style={{ flex: 1, overflow: 'hidden', height: '100%', position: 'relative' }}
    />
  );
};
