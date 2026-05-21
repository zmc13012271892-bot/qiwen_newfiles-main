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

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  is_builtin INTEGER NOT NULL DEFAULT 0,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
`;

async function initDatabase() {
  const dbPath = getDbPath();
  log.info(`Opening database at: ${dbPath}`);

  try {
    if (!SQL) {
        log.info('Initializing sql.js...');
        // 尝试多个路径，兼容不同安装场景（含中文路径的 Program Files）
        const candidatePaths = [
          path.join(process.resourcesPath, 'sql.js', 'dist'),
          path.join(app.getAppPath(), '..', 'sql.js', 'dist'),
          path.join(path.dirname(app.getPath('exe')), 'resources', 'sql.js', 'dist'),
          path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist'),
        ];
        let sqlJsPath = candidatePaths[0];
        for (const p of candidatePaths) {
          if (fs.existsSync(path.join(p, 'sql-wasm.wasm'))) {
            sqlJsPath = p;
            log.info(`Found sql.js wasm at: ${p}`);
            break;
          }
        }
        log.info(`Using SQL.js path: ${sqlJsPath}`);
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

  // ── 内置模板（首次运行插入）──────────────────────────────
  try {
    const tmplCheck = db.prepare('SELECT id FROM templates WHERE is_builtin = 1 LIMIT 1');
    const hasTmpl = tmplCheck.step();
    tmplCheck.free();
    if (!hasTmpl) {
      const { v4: uuid4 } = require('uuid');
      const t = Date.now();
      const ti = db.prepare('INSERT INTO templates (id,title,content,category,description,tags,is_builtin,use_count,created_at,updated_at) VALUES (?,?,?,?,?,?,1,0,?,?)');
      const TL = [
        {c:'academic',t:'学术论文框架',d:'适合学术期刊投稿的标准论文结构',tags:['论文','学术'],h:'<h1>论文标题</h1><h2>摘要</h2><p>简要描述研究背景、目的、方法和主要结论。</p><h2>1. 引言</h2><p>阐述研究背景，指出研究问题。</p><h2>2. 文献综述</h2><p>梳理已有研究成果。</p><h2>3. 研究方法</h2><p>描述研究设计和数据分析方法。</p><h2>4. 结果与分析</h2><p>呈现研究数据和发现。</p><h2>5. 结论</h2><p>总结研究发现和未来方向。</p><h2>参考文献</h2><p>[1] 作者. 年份. 标题. 期刊名.</p>'},
        {c:'academic',t:'文献综述模板',d:'系统梳理某一领域研究现状',tags:['文献','综述'],h:'<h1>文献综述：[主题]</h1><h2>1. 研究背景</h2><p>...</p><h2>2. 核心概念界定</h2><p>...</p><h2>3. 研究现状</h2><h3>3.1 国外研究</h3><p>...</p><h3>3.2 国内研究</h3><p>...</p><h2>4. 现有研究不足</h2><p>...</p><h2>5. 研究展望</h2><p>...</p><h2>参考文献</h2>'},
        {c:'academic',t:'实验报告',d:'理工科实验记录与分析格式',tags:['实验','报告'],h:'<h1>实验报告</h1><p><strong>实验名称：</strong>　<strong>日期：</strong>　<strong>姓名：</strong></p><h2>一、实验目的</h2><p>...</p><h2>二、实验原理</h2><p>...</p><h2>三、实验步骤</h2><p>1. </p><p>2. </p><h2>四、数据记录与分析</h2><p>...</p><h2>五、结论</h2><p>...</p>'},
        {c:'legal',t:'劳动合同框架',d:'标准劳动合同基本条款',tags:['合同','劳动'],h:'<h1>劳动合同</h1><p>甲方：___　法定代表人：___</p><p>乙方：___　身份证号：___</p><h2>第一条　合同期限</h2><p>自　年　月　日至　年　月　日。</p><h2>第二条　工作内容与地点</h2><p>岗位：___　地点：___。</p><h2>第三条　工作时间</h2><p>___工时制，每周___天，每天___小时。</p><h2>第四条　劳动报酬</h2><p>月工资___元，每月___日发放。</p><h2>第五条　社会保险</h2><p>依法缴纳。</p><p>甲方签章：　　乙方签名：　　日期：</p>'},
        {c:'legal',t:'法律意见书',d:'律师出具法律意见标准格式',tags:['法律意见','律师'],h:'<h1>法律意见书</h1><p><strong>致：</strong>___　<strong>事由：</strong>___<strong>日期：</strong>___</p><h2>一、委托事项</h2><p>...</p><h2>二、基本情况</h2><p>...</p><h2>三、法律分析</h2><h3>（一）适用法律</h3><p>...</p><h3>（二）风险分析</h3><p>...</p><h2>四、法律意见</h2><p>1. </p><p>2. </p>'},
        {c:'legal',t:'案情分析报告',d:'案件事实与法律适用分析',tags:['案情','诉讼'],h:'<h1>案情分析报告</h1><h2>一、基本案情</h2><p>当事人：</p><p>争议焦点：</p><h2>二、证据梳理</h2><h3>我方证据</h3><p>1. </p><h3>对方证据</h3><p>1. </p><h2>三、法律依据</h2><p>...</p><h2>四、争议分析</h2><p>我方：</p><p>对方：</p><h2>五、策略建议</h2><p>1. </p><h2>六、风险评估</h2><p>胜诉可能：□高 □中 □低</p>'},
        {c:'education',t:'教案模板',d:'课堂教学设计标准格式',tags:['教案','教学'],h:'<h1>教案</h1><p><strong>课题：</strong>　<strong>年级：</strong>　<strong>课时：</strong>第　课时</p><h2>一、教学目标</h2><p>知识目标：</p><p>能力目标：</p><p>情感目标：</p><h2>二、重难点</h2><p>重点：　难点：</p><h2>三、教学过程</h2><h3>导入（5分钟）</h3><p>...</p><h3>新课（25分钟）</h3><p>...</p><h3>练习（10分钟）</h3><p>...</p><h3>小结（5分钟）</h3><p>...</p><h2>四、教学反思</h2><p>（课后填写）</p>'},
        {c:'education',t:'课程设计方案',d:'学期课程整体规划',tags:['课程','规划'],h:'<h1>课程设计方案</h1><h2>一、课程基本信息</h2><p>课程名称：　适用年级：　总课时：</p><h2>二、课程目标</h2><p>1. </p><p>2. </p><h2>三、内容框架</h2><h3>第一单元：</h3><p>课时：　核心内容：</p><h3>第二单元：</h3><p>课时：　核心内容：</p><h2>四、评价体系</h2><p>平时（___%）　期中（___%）　期末（___%）</p>'},
        {c:'medical',t:'门诊病历',d:'门诊病历标准书写格式',tags:['病历','门诊'],h:'<h1>门诊病历</h1><p><strong>姓名：</strong>　<strong>性别：</strong>　<strong>年龄：</strong>　<strong>日期：</strong></p><h2>主诉</h2><p>（主要症状及时间）</p><h2>现病史</h2><p>患者于　前出现___，伴/不伴___。</p><h2>既往史</h2><p>手术史：　过敏史：</p><h2>体格检查</h2><p>T：　P：　R：　BP：</p><h2>辅助检查</h2><p>...</p><h2>诊断</h2><p>1. </p><h2>处理</h2><p>1. </p>'},
        {c:'medical',t:'出院小结',d:'住院患者出院记录',tags:['出院','住院'],h:'<h1>出院小结</h1><p><strong>姓名：</strong>　<strong>住院号：</strong>　<strong>入院：</strong>　<strong>出院：</strong></p><h2>入院诊断</h2><p></p><h2>出院诊断</h2><p></p><h2>住院经过</h2><p>患者因___入院，经___治疗，病情好转出院。</p><h2>出院医嘱</h2><p>1. 继续服用：</p><p>2. 随访：</p>'},
        {c:'general',t:'会议纪要',d:'正式会议记录标准格式',tags:['会议','纪要'],h:'<h1>会议纪要</h1><p><strong>名称：</strong>　<strong>时间：</strong>　<strong>地点：</strong>　<strong>主持：</strong>　<strong>记录：</strong></p><h2>一、议题</h2><p>1. </p><h2>二、讨论与决议</h2><h3>议题一：</h3><p>讨论：</p><p>决议：</p><h2>三、行动计划</h2><p>事项 | 负责人 | 时间</p><h2>四、下次会议</h2><p>时间：　地点：</p>'},
        {c:'general',t:'工作周报',d:'每周工作总结与计划',tags:['周报','工作'],h:'<h1>工作周报</h1><p><strong>姓名：</strong>　<strong>部门：</strong>　<strong>周期：</strong>第　周</p><h2>一、本周完成</h2><p>1. 【任务】进展：　完成度：</p><h2>二、遇到问题</h2><p>1. 问题：　解决方案：</p><h2>三、下周计划</h2><p>1. </p><p>2. </p><h2>四、需要协调</h2><p>...</p>'},
        {c:'general',t:'项目策划书',d:'项目可行性分析与执行方案',tags:['项目','策划'],h:'<h1>项目策划书</h1><h2>一、项目概述</h2><p>名称：　背景：　目标：</p><h2>二、市场分析</h2><p>目标用户：　竞品：</p><h2>三、执行方案</h2><h3>核心内容</h3><p>...</p><h3>时间表</h3><p>阶段一：　阶段二：</p><h2>四、资源需求</h2><p>人力：　预算：</p><h2>五、风险评估</h2><p>风险：　应对：</p>'},
        {c:'writing',t:'短篇小说框架',d:'小说创作基本结构',tags:['小说','创作'],h:'<h1>故事标题</h1><h2>人物设定</h2><p>主角：姓名、性格、动机</p><p>配角：</p><h2>故事梗概</h2><p>（核心冲突和结局）</p><h2>正文</h2><h3>开篇</h3><p>（引入人物背景）</p><h3>发展</h3><p>（冲突升级）</p><h3>高潮</h3><p>（核心冲突爆发）</p><h3>结局</h3><p>（收束与余韵）</p>'},
        {c:'writing',t:'读书笔记',d:'结构化阅读与思考记录',tags:['读书','笔记'],h:'<h1>读书笔记</h1><p><strong>书名：</strong>　<strong>作者：</strong>　<strong>日期：</strong></p><h2>一、核心观点</h2><p>1. </p><p>2. </p><h2>二、精彩摘录</h2><blockquote><p>...</p></blockquote><p>感想：</p><h2>三、结构梳理</h2><p>...</p><h2>四、启发与行动</h2><p>打算实践：</p>'},
      ];
      for (const tmpl of TL) {
        ti.run([uuid4(), tmpl.t, tmpl.h, tmpl.c, tmpl.d, JSON.stringify(tmpl.tags), t, t]);
      }
      ti.free();
      log.info('[seedDefaultData] inserted', TL.length, 'builtin templates');
    }
  } catch(e) {
    log.error('[seedDefaultData] template seed error:', e);
  }
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