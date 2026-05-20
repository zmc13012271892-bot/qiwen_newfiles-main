const log = require('electron-log');
const { ipcMain } = require('electron');
const { getDb, saveDatabase } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

function registerWorkspaceHandlers() {
  ipcMain.handle('workspaces:list', () => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM workspaces ORDER BY created_at ASC');
    const result = stmt.all();
    stmt.free();
    log.info('[workspaces:list] returning', result.length, 'workspaces');
    return result;
  });

  ipcMain.handle('workspaces:get', (_, { id }) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM workspaces WHERE id = ?');
    const result = stmt.get([id]);
    stmt.free();
    return result;
  });

  ipcMain.handle('workspaces:create', (_, { name, description = '', icon = '📁', color = '#c8a96e', profession = 'general' }) => {
    log.info('[workspaces:create] creating workspace:', name);
    const db = getDb();
    const id = uuidv4();
    const now = Date.now();

    try {
      const stmt = db.prepare(`
        INSERT INTO workspaces (id, name, description, icon, color, profession, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run([id, name, description, icon, color, profession, now, now]);
      stmt.free();
      saveDatabase();
      log.info('[workspaces:create] SUCCESS, id:', id);
      return { id, name, description, icon, color, profession, createdAt: now, updatedAt: now };
    } catch (err) {
      log.error('[workspaces:create] FAILED:', err);
      throw err;
    }
  });

  ipcMain.handle('workspaces:update', (_, { id, name, description, icon, color }) => {
    const db = getDb();
    const now = Date.now();
    const parts = [];
    const vals = [];
    if (name !== undefined) { parts.push('name = ?'); vals.push(name); }
    if (description !== undefined) { parts.push('description = ?'); vals.push(description); }
    if (icon !== undefined) { parts.push('icon = ?'); vals.push(icon); }
    if (color !== undefined) { parts.push('color = ?'); vals.push(color); }
    parts.push('updated_at = ?');
    vals.push(now);
    vals.push(id);
    db.prepare(`UPDATE workspaces SET ${parts.join(', ')} WHERE id = ?`).run(vals);
    saveDatabase();
    return { success: true };
  });

  ipcMain.handle('workspaces:delete', (_, { id }) => {
    const db = getDb();
    db.prepare('DELETE FROM workspaces WHERE id = ?').run([id]);
    saveDatabase();
    return { success: true };
  });
}

module.exports = { registerWorkspaceHandlers };