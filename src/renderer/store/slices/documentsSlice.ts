import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Document, DocumentMeta } from '../../../shared/types';
import { ipc } from '../../utils/ipc';

interface DocumentsState {
  items: Record<string, DocumentMeta>;
  openDocuments: Record<string, Document>;
  tree: DocumentMeta[];
  loading: boolean;
  saving: Record<string, boolean>;
  error: string | null;
}

const initialState: DocumentsState = {
  items: {},
  openDocuments: {},
  tree: [],
  loading: false,
  saving: {},
  error: null,
};

export const fetchDocuments = createAsyncThunk(
  'documents/fetchAll',
  async ({ workspaceId, parentId }: { workspaceId: string; parentId?: string }) => {
    return ipc.invoke<DocumentMeta[]>('documents:list', { workspaceId, parentId });
  }
);

export const fetchDocument = createAsyncThunk(
  'documents/fetchOne',
  async (id: string) => {
    return ipc.invoke<Document>('documents:get', { id });
  }
);

export const createDocument = createAsyncThunk(
  'documents/create',
  async (payload: { workspaceId: string; parentId?: string; title?: string; isFolder?: boolean }) => {
    return ipc.invoke<Document>('documents:create', payload);
  }
);

export const updateDocument = createAsyncThunk(
  'documents/update',
  async ({ id, ...data }: { id: string; title?: string; content?: string; tags?: string[] }) => {
    await ipc.invoke('documents:update', { id, ...data });
    return { id, ...data, updatedAt: Date.now() };
  }
);

export const deleteDocument = createAsyncThunk(
  'documents/delete',
  async (id: string) => {
    await ipc.invoke('documents:delete', { id });
    return id;
  }
);

export const searchDocuments = createAsyncThunk(
  'documents/search',
  async ({ workspaceId, query }: { workspaceId: string; query: string }) => {
    return ipc.invoke<DocumentMeta[]>('documents:search', { workspaceId, query });
  }
);

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setDocumentContent: (state, action: PayloadAction<{ id: string; content: string }>) => {
      const { id, content } = action.payload;
      if (state.openDocuments[id]) {
        state.openDocuments[id].content = content;
        state.openDocuments[id].updatedAt = Date.now();
      }
    },
    setSaving: (state, action: PayloadAction<{ id: string; saving: boolean }>) => {
      state.saving[action.payload.id] = action.payload.saving;
    },
    closeDocument: (state, action: PayloadAction<string>) => {
      delete state.openDocuments[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => { state.loading = true; })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.tree = action.payload;
        for (const doc of action.payload) {
          state.items[doc.id] = doc;
        }
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load documents';
      })
      .addCase(fetchDocument.fulfilled, (state, action) => {
        if (action.payload) {
          state.openDocuments[action.payload.id] = action.payload;
          state.items[action.payload.id] = action.payload;
        }
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        const doc = action.payload;
        state.items[doc.id] = doc;
        state.tree.unshift(doc);
        state.openDocuments[doc.id] = doc;
      })
      .addCase(updateDocument.fulfilled, (state, action) => {
        const { id, title, content, updatedAt } = action.payload;
        if (state.items[id]) {
          if (title) state.items[id].title = title;
          state.items[id].updatedAt = updatedAt!;
        }
        if (state.openDocuments[id]) {
          if (title) state.openDocuments[id].title = title;
          if (content !== undefined) state.openDocuments[id].content = content;
          state.openDocuments[id].updatedAt = updatedAt!;
        }
        if (title) {
          const treeDoc = state.tree.find(d => d.id === id);
          if (treeDoc) treeDoc.title = title;
        }
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        const id = action.payload;
        delete state.items[id];
        delete state.openDocuments[id];
        state.tree = state.tree.filter(d => d.id !== id);
      });
  },
});

export const { setDocumentContent, setSaving, closeDocument } = documentsSlice.actions;
export default documentsSlice.reducer;
