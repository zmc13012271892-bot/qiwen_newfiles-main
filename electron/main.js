const { app, BrowserWindow, ipcMain, shell, dialog, Menu, nativeTheme } = require('electron');
const path = require('path');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');
require('@electron/remote/main').initialize();

const isDev = process.env.NODE_ENV === 'development';
log.transports.file.level = 'info';
autoUpdater.logger = log;

let mainWindow = null;
let db = null;

// ── 数据库 + IPC 全部注册 ─────────────────────────────────
let _saveDatabase = null;
let _closeDb = null;

async function initDB() {
  try {
    log.info('Starting DB initialization...');
    const dbModule = require('../src/main/database/db');
    db = await dbModule.initDatabase();
    _saveDatabase = dbModule.saveDatabase;
    _closeDb = dbModule.closeDb;
    log.info('Database initialized successfully');

    const { registerDocumentHandlers }  = require('../src/main/ipc/documents');
    const { registerWorkspaceHandlers } = require('../src/main/ipc/workspaces');
    const { registerSettingsHandlers }  = require('../src/main/ipc/settings');
    const { registerReferenceHandlers } = require('../src/main/ipc/references');
    const { registerTemplateHandlers } = require('../src/main/ipc/templates');

    registerDocumentHandlers();
    registerWorkspaceHandlers();
    registerSettingsHandlers();
    registerReferenceHandlers();
    registerTemplateHandlers();
    log.info('All IPC handlers registered successfully');

    // ── 首次运行判断（直接在主进程查DB，最可靠）─────────────
    ipcMain.handle('app:is-first-run', () => {
      try {
        const d = dbModule.getDb();
        // sql.js 用 stmt.step() 检查是否有行（stmt.all 不可靠）
        const stmt = d.prepare('SELECT id FROM workspaces LIMIT 1');
        const hasWorkspace = stmt.step();
        stmt.free();
        log.info('app:is-first-run hasWorkspace:', hasWorkspace);
        return !hasWorkspace; // false=有工作区=老用户，true=新用户显示引导页
      } catch (e) {
        log.error('app:is-first-run error:', e);
        return true;
      }
    });

    // ── AI API 代理（绕过渲染进程 CORS 限制）───────────────
    const https = require('https');
    const http  = require('http');

    ipcMain.handle('ai:chat-stream', async (event, { messages, apiKey, model }) => {
      return new Promise((resolve, reject) => {
        const effectiveModel = model || 'doubao-seed-2-0-pro-260215';
        const effectiveKey = apiKey || 'ark-0f0fd51c-1395-45bd-9df0-29a195257d96-5ab55';
        
        const body = JSON.stringify({
          model: effectiveModel,
          max_tokens: 2048,
          stream: false,
          messages,
        });

        log.info('[ai:chat-stream] Requesting model:', effectiveModel);

        const options = {
          hostname: 'ark.cn-beijing.volces.com',
          path: '/api/v3/chat/completions',
          method: 'POST',
          timeout: 60000, // 60秒超时
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${effectiveKey}`,
            'Content-Length': Buffer.byteLength(body),
          },
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              log.info('[ai:chat-stream] Response status:', res.statusCode);
              const json = JSON.parse(data);
              if (json.error) {
                log.error('[ai:chat-stream] API error:', json.error);
                reject(new Error(json.error.message || `API错误: ${JSON.stringify(json.error)}`));
              } else {
                const content = json.choices?.[0]?.message?.content || '';
                log.info('[ai:chat-stream] Success, content length:', content.length);
                resolve(content);
              }
            } catch(e) {
              log.error('[ai:chat-stream] Parse error:', e, 'Raw data:', data.slice(0, 200));
              reject(new Error('响应解析失败: ' + e.message));
            }
          });
        });
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('请求超时（60秒），请检查网络连接'));
        });
        req.on('error', (err) => {
          log.error('[ai:chat-stream] Request error:', err);
          reject(new Error('网络请求失败: ' + err.message));
        });
        req.write(body);
        req.end();
      });
    });

    return true;
  } catch (err) {
    log.error('DB init failed:', err);
    // 主进程弹窗提示，让用户知道出了问题
    const { dialog } = require('electron');
    dialog.showErrorBox('启文启动失败', 
      `数据库初始化失败，请重新安装应用。\n\n错误：${err.message}`);
    return false;
  }
}

// ── 窗口创建 ──────────────────────────────────────────────
function createWindow() {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    center: true,
    maximizable: true,
    fullscreenable: true,
    // Windows上明确禁止启动时最大化
    ...(isWin ? { resizable: true } : {}),
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 16, y: 12 },
    backgroundColor: '#0a0a0f',
    vibrancy: isMac ? 'sidebar' : undefined,
    frame: !isWin,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../electron/preload.js'),
      webSecurity: false, // 桌面应用不需要 web 安全限制
    },
  });

  require('@electron/remote/main').enable(mainWindow.webContents);

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);
  mainWindow.once('ready-to-show', () => {
    // 确保不是最大化状态再显示
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    mainWindow.show();
    mainWindow.center();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });
  // ── 关闭前等待 renderer 把未保存内容写入 DB ──────────────
  let isReallyClosing = false;
  let isWaitingForFlush = false;  // 防止重复注册 flush-complete 监听器

  mainWindow.on('close', (e) => {
    if (isReallyClosing) return;
    e.preventDefault();

    // 避免重复触发（用户快速多次点关闭）
    if (isWaitingForFlush) return;
    isWaitingForFlush = true;

    // 通知 renderer flush 所有未保存内容
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app-before-close');
    }

    // 超时兜底：5秒后强制写盘关闭
    const forceClose = setTimeout(() => {
      log.warn('Save timeout - force save and close');
      try { if (_saveDatabase) _saveDatabase(); } catch(e) { log.error(e); }
      isReallyClosing = true;
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
    }, 5000);

    // renderer 保存完成 → 再写一次磁盘 → 关闭
    ipcMain.once('flush-complete', () => {
      clearTimeout(forceClose);
      try { if (_saveDatabase) _saveDatabase(); } catch(e) { log.error(e); }
      isReallyClosing = true;
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
    });
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  setupMenu();
  setupIPC();
  setupAutoUpdater();
}

// ── 菜单 ──────────────────────────────────────────────────
function setupMenu() {
  const isMac = process.platform === 'darwin';
  const send = (ch) => () => mainWindow?.webContents.send(ch);
  const template = [
    ...(isMac ? [{ label: app.name, submenu: [
      { role: 'about', label: '关于启文' }, { type: 'separator' },
      { label: '偏好设置', accelerator: 'Cmd+,', click: send('open-settings') },
      { type: 'separator' }, { role: 'services' }, { type: 'separator' },
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
      { type: 'separator' }, { role: 'quit', label: '退出启文' },
    ]}] : []),
    { label: '文件', submenu: [
      { label: '新建文档', accelerator: 'CmdOrCtrl+N', click: send('new-document') },
      { label: '新建窗口', accelerator: 'CmdOrCtrl+Shift+N', click: createWindow },
      { type: 'separator' },
      { label: '保存', accelerator: 'CmdOrCtrl+S', click: send('save-document') },
      { type: 'separator' },
      { label: '导出 PDF', click: send('export-pdf') },
      ...(!isMac ? [{ type: 'separator' }, { role: 'quit', label: '退出' }] : []),
    ]},
    { label: '编辑', submenu: [
      { role: 'undo', label: '撤销' }, { role: 'redo', label: '重做' },
      { type: 'separator' },
      { role: 'cut', label: '剪切' }, { role: 'copy', label: '复制' }, { role: 'paste', label: '粘贴' },
      { type: 'separator' },
      { label: '查找', accelerator: 'CmdOrCtrl+F', click: send('find-replace') },
    ]},
    { label: '视图', submenu: [
      { label: '切换侧边栏', accelerator: 'CmdOrCtrl+\\', click: send('toggle-sidebar') },
      { label: '专注模式', accelerator: 'CmdOrCtrl+Shift+F', click: send('focus-mode') },
      { type: 'separator' },
      { role: 'zoomIn', label: '放大' }, { role: 'zoomOut', label: '缩小' }, { role: 'resetZoom', label: '实际大小' },
      { type: 'separator' }, { role: 'togglefullscreen', label: '全屏' },
    ]},
    { label: '帮助', submenu: [
      { label: '键盘快捷键', click: send('show-shortcuts') },
      { label: '官方网站', click: () => shell.openExternal('https://qiwen.studio') },
      ...(!isMac ? [{ label: '关于启文', click: () => dialog.showMessageBox(mainWindow, {
        title: '关于启文', message: '启文 v1.0.0\n启于思，行于文\n\n© 2024 启文团队',
      })}] : []),
    ]},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── 系统级 IPC ────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-app-path',    () => app.getPath('userData'));
  ipcMain.handle('get-platform',    () => process.platform);

  // ── 导出 docx ───────────────────────────────────────────────
  ipcMain.handle('documents:export-docx', async (event, { id, title, html }) => {
    // 打开系统"另存为"对话框
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '另存为 Word 文档',
      defaultPath: `${title || '无标题'}.docx`,
      filters: [
        { name: 'Word 文档', extensions: ['docx'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) return { canceled: true };

    const filePath = result.filePath;

    try {
      // 用 htmlDocx 或手动构建最小 docx（Word XML 格式）
      // 这里使用纯 Node.js 内置方式，不依赖额外 npm 包：
      // 将 HTML 转换为 Word XML 并打包成 docx（Open XML 格式）
      const fs = require('fs');
      const path = require('path');
      const JSZip = require('jszip'); // electron-builder 里通常已包含

      // 把 HTML 转成基础 Word XML
      const wordXml = htmlToWordXml(html, title);

      // 构建最小 docx 结构
      const zip = new JSZip();

      zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

      zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

      zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

      zip.file('word/styles.xml', getWordStyles());
      zip.file('word/document.xml', wordXml);

      const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      fs.writeFileSync(filePath, buf);
      log.info('[export-docx] Saved to:', filePath);
      return { success: true, filePath };
    } catch (err) {
      // JSZip 不可用时，降级写一个 Word XML 格式的 .docx（部分 Word 版本可以打开）
      try {
        const fs = require('fs');
        const wordXml = htmlToWordXml(html, title);
        fs.writeFileSync(filePath, wordXml, 'utf8');
        return { success: true, filePath };
      } catch (e2) {
        log.error('[export-docx] Failed:', e2);
        throw e2;
      }
    }
  });

  // 将 HTML 字符串转为 Word XML 段落
  function htmlToWordXml(html, title) {
    // 去除 HTML 标签，保留文本和基本换行
    const stripTags = (s) => s
      .replace(/<br\s*\/?>/gi, '
')
      .replace(/<\/p>/gi, '
')
      .replace(/<\/h[1-6]>/gi, '
')
      .replace(/<\/li>/gi, '
')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');

    const text = stripTags(html || '');
    const paragraphs = text.split('
').filter(l => l.trim());

    const xmlEscape = (s) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const paras = paragraphs.map(line =>
      `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(line.trim())}</w:t></w:r></w:p>`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>${xmlEscape(title || '无标题')}</w:t></w:r>
    </w:p>
    ${paras}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  }

  function getWordStyles() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr>
  </w:style>
</w:styles>`;
  }

  ipcMain.handle('show-save-dialog', async (_, o) => dialog.showSaveDialog(mainWindow, o));
  ipcMain.handle('show-open-dialog', async (_, o) => dialog.showOpenDialog(mainWindow, o));
  ipcMain.handle('show-message-box', async (_, o) => dialog.showMessageBox(mainWindow, o));
  ipcMain.handle('open-external',    async (_, url) => shell.openExternal(url));
  ipcMain.handle('get-theme',        () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

  ipcMain.on('set-title',           (_, t) => mainWindow?.setTitle(t));
  ipcMain.on('window-minimize',     () => mainWindow?.minimize());
  ipcMain.on('window-maximize',     () => mainWindow?.isMaximized() ? mainWindow.restore() : mainWindow?.maximize());
  ipcMain.on('window-close',        () => mainWindow?.close());
  ipcMain.on('toggle-always-on-top',() => mainWindow?.setAlwaysOnTop(!mainWindow?.isAlwaysOnTop()));

  nativeTheme.on('updated', () =>
    mainWindow?.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
  );
}

// ── 自动更新 ──────────────────────────────────────────────
function setupAutoUpdater() {
  if (isDev) return;
  autoUpdater.checkForUpdatesAndNotify();
  autoUpdater.on('update-available', () => mainWindow?.webContents.send('update-available'));
  autoUpdater.on('update-downloaded', () => mainWindow?.webContents.send('update-downloaded'));
}

// ── 启动 ──────────────────────────────────────────────────
app.whenReady().then(async () => {
  await initDB();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => {
  try {
    if (_saveDatabase) _saveDatabase(); // 先写磁盘
    if (_closeDb) _closeDb();           // 再关闭
    else if (db) db.close();
  } catch (e) { log.error('Error on quit:', e); }
});
process.on('uncaughtException', (err) => log.error('Uncaught:', err));
process.on('unhandledRejection', (r) => log.error('Rejection:', r));
