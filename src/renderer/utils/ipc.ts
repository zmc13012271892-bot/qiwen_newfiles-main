// IPC 工具 — 渲染进程与主进程通信桥接
// preload.js 通过 contextBridge 把 electronAPI 注入到 window 上
// 所有数据库/系统调用都走这里

declare global {
  interface Window {
    electronAPI: {
      // 系统
      getAppVersion: () => Promise<string>;
      getAppPath:    () => Promise<string>;
      getPlatform:   () => Promise<string>;
      getTheme:      () => Promise<string>;
      openExternal:  (url: string) => Promise<void>;
      // 窗口
      minimize:           () => void;
      maximize:           () => void;
      close:              () => void;
      setTitle:           (t: string) => void;
      toggleAlwaysOnTop:  () => void;
      // 对话框
      showSaveDialog: (o: any) => Promise<any>;
      showOpenDialog: (o: any) => Promise<any>;
      showMessageBox: (o: any) => Promise<any>;
      // 事件监听
      onMenuAction:    (ch: string, cb: (...a: any[]) => void) => void;
      removeMenuAction:(ch: string, cb: (...a: any[]) => void) => void;
      onThemeChanged:  (cb: (t: string) => void) => void;
      onUpdateAvailable:(cb: () => void) => void;
      onUpdateDownloaded:(cb: () => void) => void;
      // 数据库 IPC（通用 invoke）
      invoke: (channel: string, payload?: any) => Promise<any>;
    };
  }
}

// 是否在 Electron 环境中运行
export const isElectron = (): boolean =>
  typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';

// 通用 IPC 调用（所有数据库操作都用这个）
export const ipc = {
  async invoke<T = any>(channel: string, payload?: any): Promise<T> {
    if (!isElectron()) {
      // 开发时在浏览器里跑，返回 mock 数据防止崩溃
      console.warn(`[IPC Mock] ${channel}`, payload);
      return undefined as any;
    }
    return window.electronAPI.invoke(channel, payload);
  },
};

// 直接访问 electronAPI
export const electronAPI = typeof window !== 'undefined' ? window.electronAPI : null;
