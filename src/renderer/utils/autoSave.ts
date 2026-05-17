import { ipc } from './ipc';

type SaveFn = (id: string, content: string) => Promise<void>;

class AutoSaveManager {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pending: Map<string, string> = new Map();
  private defaultInterval: number = 1000;  // 1 秒，减少数据丢失
  private onSave?: (id: string) => void;
  private onSaved?: (id: string) => void;

  configure({ interval, onSave, onSaved }: {
    interval?: number;
    onSave?: (id: string) => void;
    onSaved?: (id: string) => void;
  }) {
    if (interval !== undefined) this.defaultInterval = interval;
    if (onSave) this.onSave = onSave;
    if (onSaved) this.onSaved = onSaved;
  }

  // 调度保存，interval 可覆盖默认值
  schedule(id: string, content: string, interval?: number) {
    this.pending.set(id, content);
    this.onSave?.(id);

    const existing = this.timers.get(id);
    if (existing) clearTimeout(existing);

    const delay = interval ?? this.defaultInterval;
    const timer = setTimeout(() => this.flush(id), delay);
    this.timers.set(id, timer);
  }

  async flush(id: string) {
    const content = this.pending.get(id);
    if (content === undefined) return;

    // 先清除 pending，避免重复保存
    this.pending.delete(id);
    this.timers.delete(id);

    try {
      await ipc.invoke('documents:update', { id, content });
      this.onSaved?.(id);
    } catch (error) {
      console.error('[AutoSave] Failed to save document:', id, error);
      // 保存失败则重新加入 pending，下次再试
      this.pending.set(id, content);
    }
  }

  async flushAll() {
    const ids = Array.from(this.pending.keys());
    await Promise.all(ids.map(id => this.flush(id)));
  }

  cancelAll() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  hasPending(id: string) {
    return this.pending.has(id);
  }

  pendingCount() {
    return this.pending.size;
  }
}

export const autoSave = new AutoSaveManager();
