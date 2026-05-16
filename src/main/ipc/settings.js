const { ipcMain } = require('electron');
const { getDb, saveDatabase } = require('../database/db');

function registerSettingsHandlers() {
  ipcMain.handle('settings:get-all', () => {
    const db = getDb();
    const stmt = db.prepare('SELECT key, value FROM app_settings');
    const rows = stmt.all();
    stmt.free();
    const settings = {};
    for (const row of rows) {
      try { settings[row.key] = JSON.parse(row.value); }
      catch { settings[row.key] = row.value; }
    }
    return settings;
  });

  ipcMain.handle('settings:get', (_, { key }) => {
    const db = getDb();
    const stmt = db.prepare('SELECT value FROM app_settings WHERE key = ?');
    const row = stmt.get([key]);
    stmt.free();
    if (!row) return null;
    try { return JSON.parse(row.value); } catch { return row.value; }
  });

  ipcMain.handle('settings:set', (_, { key, value }) => {
    const db = getDb();
    const now = Date.now();
    const valueStr = JSON.stringify(value);
    // 先删后插，避免ON CONFLICT在某些sql.js版本不兼容
    db.prepare('DELETE FROM app_settings WHERE key = ?').run([key]);
    db.prepare('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)').run([key, valueStr, now]);
    saveDatabase();
    return { success: true };
  });

  ipcMain.handle('settings:set-many', (_, { settings }) => {
    const db = getDb();
    const now = Date.now();
    db.run('BEGIN TRANSACTION');
    try {
      const delStmt = db.prepare('DELETE FROM app_settings WHERE key = ?');
      const insStmt = db.prepare('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)');
      for (const [key, value] of Object.entries(settings)) {
        delStmt.run([key]);
        insStmt.run([key, JSON.stringify(value), now]);
      }
      delStmt.free();
      insStmt.free();
      db.run('COMMIT');
      saveDatabase();
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }
    return { success: true };
  });

  // User profile
  ipcMain.handle('profile:get', () => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM user_profile LIMIT 1');
    const result = stmt.get();
    stmt.free();
    return result;
  });

  ipcMain.handle('profile:update', (_, { name, email, avatar }) => {
    const db = getDb();
    const idStmt = db.prepare('SELECT id FROM user_profile LIMIT 1');
    const userId = idStmt.get()?.id;
    idStmt.free();
    
    const parts = [];
    const vals = [];
    if (name !== undefined) { parts.push('name = ?'); vals.push(name); }
    if (email !== undefined) { parts.push('email = ?'); vals.push(email); }
    if (avatar !== undefined) { parts.push('avatar = ?'); vals.push(avatar); }
    vals.push(userId);
    db.prepare(`UPDATE user_profile SET ${parts.join(', ')} WHERE id = ?`).run(vals);
    saveDatabase();
    return { success: true };
  });
}

module.exports = { registerSettingsHandlers };