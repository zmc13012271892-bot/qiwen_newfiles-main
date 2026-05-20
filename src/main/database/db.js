const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const log = require('electron-log');

let db = null;
let SQL = null;

function getDbPath() {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  return path.join(dbDir, 'qiwen.db');
}

const SCHEMA = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA synchronous=NORMAL;

CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon        TEXT DEFAULT '📁',
  color       TEXT DEFAULT '#c8a96e',
  profession  TEXT DEFAULT 'general',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL DEFAULT '无标题',
  content_type TEXT NOT NULL DEFAULT 'markdown',
  parent_id    TEXT,
  workspace_id TEXT NOT NULL,
  is_folder    INTEGER NOT NULL DEFAULT 0,
  is_favorite  INTEGER NOT NULL DEFAULT 0,
  is_pinned    INTEGER NOT NULL DEFAULT 0,
  is_archived  INTEGER NOT NULL DEFAULT 0,
  word_count   INTEGER NOT NULL DEFAULT 0,
  char_count   INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  synced_at    INTEGER
);

CREATE TABLE IF NOT EXISTS document_contents (
  document_id TEXT PRIMARY KEY,
  content     TEXT NOT NULL DEFAULT '',
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS document_tags (
  document_id TEXT NOT NULL,
  tag         TEXT NOT NULL,
  PRIMARY KEY (document_id, tag)
);

CREATE TABLE IF NOT EXISTS document_versions (
  id          TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  content     TEXT NOT NULL,
  title       TEXT NOT NULL,
  word_count  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_references (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title        TEXT NOT NULL,
  authors      TEXT NOT NULL DEFAULT '[]',
  year         INTEGER,
  journal      TEXT,
  volume       TEXT,
  issue        TEXT,
  pages        TEXT,
  doi          TEXT,
  url          TEXT,
  abstract     TEXT,
  keywords     TEXT NOT NULL DEFAULT '[]',
  tags         TEXT NOT NULL DEFAULT '[]',
  notes        TEXT,
  file_path    TEXT,
  citation_key TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'article',
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plugins (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  version      TEXT NOT NULL,
  description  TEXT DEFAULT '',
  author       TEXT DEFAULT '',
  category     TEXT DEFAULT 'utility',
  tags         TEXT NOT NULL DEFAULT '[]',
  is_enabled   INTEGER NOT NULL DEFAULT 1,
  is_paid      INTEGER NOT NULL DEFAULT 0,
  price        REAL NOT NULL DEFAULT 0,
  icon         TEXT DEFAULT '🔌',
  entry_point  TEXT NOT NULL,
  permissions  TEXT NOT NULL DEFAULT '[]',
  settings     TEXT NOT NULL DEFAULT '{}',
  installed_at INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profile (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL DEFAULT '本地用户',
  email          TEXT,
  avatar         TEXT,
  is_local       INTEGER NOT NULL DEFAULT 1,
  plan           TEXT NOT NULL DEFAULT 'free',
  ai_tokens_used INTEGER NOT NULL DEFAULT 0,
  ai_tokens_limit INTEGER NOT NULL DEFAULT 100000,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id          TEXT PRIMARY KEY,
  document_id TEXT,
  title       TEXT DEFAULT '新对话',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  timestamp       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_workspace ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_parent ON documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_references_workspace ON paper_references(workspace_id);
CREATE INDEX IF NOT EXISTS idx_references_year ON paper_references(year);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON document_tags(tag);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON document_versions(document_id, created_at DESC);
`;

async function initDatabase() {
  const dbPath = getDbPath();
  log.info(`Opening database at: ${dbPath}`);

  try {
    if (!SQL) {
        log.info('Initializing sql.js...');
        const sqlJsPath = path.join(process.resourcesPath, 'sql.js', 'dist');
        log.info(`SQL.js path: ${sqlJsPath}`);
        SQL = await initSqlJs({
          locateFile: file => path.join(sqlJsPath, file)
        });
        log.info('sql.js initialized successfully');
      }

    let existingData = null;
    if (fs.existsSync(dbPath)) {
      existingData = fs.readFileSync(dbPath);
      log.info(`Loading existing database (size: ${existingData.length} bytes)`);
    }

    db = new SQL.Database(existingData);
    log.info('Database created/opened successfully');

    db.run(SCHEMA);
    log.info('Schema executed');

    runMigrations();
    seedDefaultData();

    saveDatabase();
    log.info('Database initialized');
    return db;
  } catch (err) {
    log.error('Database initialization error:', err);
    throw err;
  }
}

function runMigrations() {
  const stmt = db.prepare('PRAGMA user_version');
  const result = stmt.get();
  const currentVersion = result['user_version'];
  stmt.free();
  log.info(`DB schema version: ${currentVersion}`);

  const migrations = [];

  for (let i = currentVersion; i < migrations.length; i++) {
    log.info(`Running migration ${i + 1}`);
    db.run(migrations[i]);
    db.run(`PRAGMA user_version = ${i + 1}`);
  }
}

function seedDefaultData() {
  const stmt = db.prepare('SELECT COUNT(*) as c FROM user_profile');
  const result = stmt.get();
  stmt.free();
  
  if (result.c === 0) {
    const { v4: uuidv4 } = require('uuid');
    const now = Date.now();
    db.run(`
      INSERT INTO user_profile (id, name, is_local, plan, ai_tokens_used, ai_tokens_limit, created_at)
      VALUES (?, '本地用户', 1, 'free', 0, 100000, ?)
    `, [uuidv4(), now]);
    log.info('Default user profile created');
  }

  const defaultSettings = {
    theme: 'dark',
    accentColor: '#c8a96e',
    fontSize: 15,
    fontFamily: 'default',
    lineHeight: 1.85,
    editorWidth: 'normal',
    spellCheck: false,
    autoSave: true,
    autoSaveInterval: 3000,
    showWordCount: true,
    showLineNumbers: false,
    focusModeBlur: 70,
    language: 'zh-CN',
    sidebarWidth: 220,
    rightPanelWidth: 260,
  };

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
  `);
  const now = Date.now();
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertStmt.run([key, JSON.stringify(value), now]);
  }
  insertStmt.free();
  log.info('Default settings seeded');
}

function saveDatabase() {
  if (db) {
    try {
      const data = db.export();
      const dbPath = getDbPath();
      fs.writeFileSync(dbPath, Buffer.from(data));
      log.info('[saveDatabase] wrote', data.length, 'bytes to', dbPath);
    } catch (err) {
      log.error('[saveDatabase] FAILED:', err);
    }
  }
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function closeDb() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    log.info('Database closed');
  }
}

setInterval(saveDatabase, 2000);

module.exports = { initDatabase, getDb, closeDb, saveDatabase };