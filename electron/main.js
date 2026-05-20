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

    registerDocumentHandlers();
    registerWorkspaceHandlers();
    registerSettingsHandlers();
    registerReferenceHandlers();
    log.info('All IPC handlers registered successfully');

    // ── 首次运行判断（直接在主进程查DB，最可靠）─────────────
    ipcMain.handle('app:is-first-run', () => {
      try {
        const d = dbModule.getDb();
        // 用 stmt.all() 查所有工作区，比 COUNT 更可靠（避免列名歧义）
        const stmt = d.prepare('SELECT id FROM workspaces LIMIT 1');
        const rows = stmt.all();
        stmt.free();
        const count = rows.length;
        log.info('app:is-first-run workspace count:', count);
        return count === 0; // true = 新用户，显示引导页
      } catch (e) {
        log.error('app:is-first-run error:', e);
        return true; // 出错时保守处理，显示引导页
      }
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
      webSecurity: !isDev,
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
