const log = require('electron-log');
const { ipcMain } = require('electron');
const { getDb, saveDatabase } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

function registerDocumentHandlers() {
  // List documents in workspace
  ipcMain.handle('documents:list', (_, { workspaceId, parentId = null }) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT d.*, GROUP_CONCAT(dt.tag) as tags_raw
      FROM documents d
      LEFT JOIN document_tags dt ON dt.document_id = d.id
      WHERE d.workspace_id = ? AND d.parent_id IS ? AND d.is_archived = 0
      GROUP BY d.id
      ORDER BY d.is_pinned DESC, d.sort_order ASC, d.updated_at DESC
    `);
    const docs = stmt.all([workspaceId, parentId]);
    stmt.free();

    return docs.map(normalizeDocument);
  });

  // Get single document with content
  ipcMain.handle('documents:get', (_, { id }) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT d.*, dc.content, GROUP_CONCAT(dt.tag) as tags_raw
      FROM documents d
      LEFT JOIN document_contents dc ON dc.document_id = d.id
      LEFT JOIN document_tags dt ON dt.document_id = d.id
      WHERE d.id = ?
      GROUP BY d.id
    `);
    const doc = stmt.get([id]);
    stmt.free();

    if (!doc) return null;
    return normalizeDocument(doc);
  });

  // Create document
  ipcMain.handle('documents:create', (_, { workspaceId, parentId = null, title = '无标题', content = '', contentType = 'markdown', isFolder = false }) => {
    const db = getDb();
    const id = uuidv4();
    const now = Date.now();

    db.run('BEGIN TRANSACTION');
    try {
      db.prepare(`
        INSERT INTO documents (id, title, content_type, parent_id, workspace_id, is_folder, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run([id, title, contentType, parentId, workspaceId, isFolder ? 1 : 0, now, now]);

      if (!isFolder) {
        db.prepare(`
          INSERT INTO document_contents (document_id, content, updated_at) VALUES (?, ?, ?)
        `).run([id, content, now]);
      }
      db.run('COMMIT');
      saveDatabase();
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }

    return { id, title, content, contentType, parentId, workspaceId, isFolder, tags: [], isFavorite: false, isPinned: false, isArchived: false, wordCount: 0, charCount: 0, createdAt: now, updatedAt: now };
  });

  // Update document content
  ipcMain.handle('documents:update', (_, { id, title, content, tags }) => {
    log.info('[documents:update] called, id:', id, 'contentLen:', content?.length);
    const db = getDb();
    const now = Date.now();

    const wordCount = content ? countWords(content) : undefined;
    const charCount = content ? content.length : undefined;

    db.run('BEGIN TRANSACTION');
    try {
      if (title !== undefined || wordCount !== undefined) {
        const parts = [];
        const vals = [];
        if (title !== undefined) { parts.push('title = ?'); vals.push(title); }
        if (wordCount !== undefined) { parts.push('word_count = ?', 'char_count = ?'); vals.push(wordCount, charCount); }
        parts.push('updated_at = ?');
        vals.push(now);
        vals.push(id);
        const updStmt = db.prepare(`UPDATE documents SET ${parts.join(', ')} WHERE id = ?`); updStmt.run(vals); updStmt.free();
      }

      if (content !== undefined) {
        const delStmt = db.prepare('DELETE FROM document_contents WHERE document_id = ?');
        delStmt.run([id]); delStmt.free();
        const insStmt = db.prepare('INSERT INTO document_contents (document_id, content, updated_at) VALUES (?, ?, ?)');
        insStmt.run([id, content, now]); insStmt.free();

        // Auto-save version every 5 minutes
        const versionStmt = db.prepare(`
          SELECT created_at FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT 1
        `);
        const lastVersion = versionStmt.get([id]);
        versionStmt.free();
        
        if (!lastVersion || (now - lastVersion.created_at) > 5 * 60 * 1000) {
          const titleStmt = db.prepare('SELECT title FROM documents WHERE id = ?');
          const doc = titleStmt.get([id]);
          titleStmt.free();
          
          const verStmt = db.prepare(`INSERT INTO document_versions (id, document_id, content, title, word_count, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
          verStmt.run([uuidv4(), id, content, doc?.title || '', wordCount || 0, now]); verStmt.free();
        }
      }

      if (tags !== undefined) {
        db.prepare('DELETE FROM document_tags WHERE document_id = ?').run([id]);
        const insertTag = db.prepare('INSERT INTO document_tags (document_id, tag) VALUES (?, ?)');
        for (const tag of tags) insertTag.run([id, tag]);
        insertTag.free();
      }
      db.run('COMMIT');
      saveDatabase();
      log.info('[documents:update] saved successfully, id:', id);
    } catch (err) {
      log.error('[documents:update] FAILED, id:', id, 'error:', err);
      db.run('ROLLBACK');
      throw err;
    }

    return { success: true, updatedAt: now };
  });

  // Delete document
  ipcMain.handle('documents:delete', (_, { id }) => {
    const db = getDb();
    db.run('BEGIN TRANSACTION');
    try {
      db.prepare('DELETE FROM documents WHERE id = ?').run([id]);
      db.run('COMMIT');
      saveDatabase();
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }
    return { success: true };
  });

  // Toggle favorite
  ipcMain.handle('documents:toggle-favorite', (_, { id }) => {
    const db = getDb();
    const stmt = db.prepare('SELECT is_favorite FROM documents WHERE id = ?');
    const doc = stmt.get([id]);
    stmt.free();
    
    const newVal = doc.is_favorite ? 0 : 1;
    db.prepare('UPDATE documents SET is_favorite = ?, updated_at = ? WHERE id = ?').run([newVal, Date.now(), id]);
    saveDatabase();
    return { isFavorite: Boolean(newVal) };
  });

  // Search documents
  ipcMain.handle('documents:search', (_, { workspaceId, query }) => {
    const db = getDb();
    const q = `%${query}%`;
    const stmt = db.prepare(`
      SELECT d.*, dc.content, GROUP_CONCAT(dt.tag) as tags_raw
      FROM documents d
      LEFT JOIN document_contents dc ON dc.document_id = d.id
      LEFT JOIN document_tags dt ON dt.document_id = d.id
      WHERE d.workspace_id = ? AND d.is_archived = 0
        AND (d.title LIKE ? OR dc.content LIKE ?)
      GROUP BY d.id
      ORDER BY d.updated_at DESC
      LIMIT 50
    `);
    const docs = stmt.all([workspaceId, q, q]);
    stmt.free();

    return docs.map(normalizeDocument);
  });

  // Get document versions
  ipcMain.handle('documents:versions', (_, { id }) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT 20
    `);
    const result = stmt.all([id]);
    stmt.free();
    return result;
  });
}

function normalizeDocument(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content || '',
    contentType: row.content_type,
    parentId: row.parent_id,
    workspaceId: row.workspace_id,
    isFolder: Boolean(row.is_folder),
    tags: row.tags_raw ? row.tags_raw.split(',') : [],
    isFavorite: Boolean(row.is_favorite),
    isPinned: Boolean(row.is_pinned),
    isArchived: Boolean(row.is_archived),
    wordCount: row.word_count,
    charCount: row.char_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at,
  };
}

function countWords(text) {
  const plain = text.replace(/[#*_`~\[\]()>-]/g, ' ').trim();
  const cn = (plain.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (plain.match(/[a-zA-Z]+/g) || []).length;
  return cn + en;
}

module.exports = { registerDocumentHandlers };