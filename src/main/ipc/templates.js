const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { getDb, saveDatabase } = require('../database/db');
const log = require('electron-log');

function registerTemplateHandlers() {

  // ── 列出所有模板（可按分类筛选）─────────────────────────
  ipcMain.handle('templates:list', (_, { category } = {}) => {
    const db = getDb();
    const sql = category && category !== 'all'
      ? 'SELECT * FROM templates WHERE category = ? ORDER BY use_count DESC, updated_at DESC'
      : 'SELECT * FROM templates ORDER BY use_count DESC, updated_at DESC';
    const stmt = db.prepare(sql);
    const rows = category && category !== 'all' ? stmt.all([category]) : stmt.all();
    stmt.free();
    return rows.map(r => ({
      ...r,
      tags: r.tags ? JSON.parse(r.tags) : [],
      isBuiltin: Boolean(r.is_builtin),
    }));
  });

  // ── 获取单个模板 ─────────────────────────────────────────
  ipcMain.handle('templates:get', (_, { id }) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM templates WHERE id = ?');
    const row = stmt.get([id]);
    stmt.free();
    if (!row) return null;
    return { ...row, tags: row.tags ? JSON.parse(row.tags) : [], isBuiltin: Boolean(row.is_builtin) };
  });

  // ── 创建自定义模板 ───────────────────────────────────────
  ipcMain.handle('templates:create', (_, { title, content, category, description = '', tags = [] }) => {
    const db = getDb();
    const id = uuidv4();
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO templates (id, title, content, category, description, tags, is_builtin, use_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `);
    stmt.run([id, title, content, category, description, JSON.stringify(tags), now, now]);
    stmt.free();
    saveDatabase();
    log.info('[templates:create] created:', title);
    return { id, title, content, category, description, tags, isBuiltin: false, useCount: 0, createdAt: now, updatedAt: now };
  });

  // ── 更新模板 ─────────────────────────────────────────────
  ipcMain.handle('templates:update', (_, { id, title, content, category, description, tags }) => {
    const db = getDb();
    const now = Date.now();
    const parts = ['updated_at = ?'];
    const vals = [now];
    if (title !== undefined) { parts.push('title = ?'); vals.push(title); }
    if (content !== undefined) { parts.push('content = ?'); vals.push(content); }
    if (category !== undefined) { parts.push('category = ?'); vals.push(category); }
    if (description !== undefined) { parts.push('description = ?'); vals.push(description); }
    if (tags !== undefined) { parts.push('tags = ?'); vals.push(JSON.stringify(tags)); }
    vals.push(id);
    const stmt = db.prepare(`UPDATE templates SET ${parts.join(', ')} WHERE id = ? AND is_builtin = 0`);
    stmt.run(vals);
    stmt.free();
    saveDatabase();
    return { success: true };
  });

  // ── 删除模板（仅自定义）──────────────────────────────────
  ipcMain.handle('templates:delete', (_, { id }) => {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM templates WHERE id = ? AND is_builtin = 0');
    stmt.run([id]);
    stmt.free();
    saveDatabase();
    return { success: true };
  });

  // ── 使用模板（计数 +1，返回内容）────────────────────────
  ipcMain.handle('templates:use', (_, { id }) => {
    const db = getDb();
    const upStmt = db.prepare('UPDATE templates SET use_count = use_count + 1 WHERE id = ?');
    upStmt.run([id]);
    upStmt.free();
    const selStmt = db.prepare('SELECT content FROM templates WHERE id = ?');
    const row = selStmt.get([id]);
    selStmt.free();
    saveDatabase();
    return row ? row.content : '';
  });
}

module.exports = { registerTemplateHandlers };
