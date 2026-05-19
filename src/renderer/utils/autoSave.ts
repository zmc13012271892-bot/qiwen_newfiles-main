import { ipc } from './ipc';

class AutoSaveManager {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pending: Map<string, string> = new Map();
  private saving: Set<string> = new Set();
  private interval: number = 500;
  private onSaveCb?: (id: string) => void;
  private onSavedCb?: (id: string) => void;

  configure(opts: { interval?: number; onSave?: (id: string) => void; onSaved?: (id: string) => void }) {
    if (opts.interval !== undefined) this.interval = opts.interval;
    if (opts.onSave) this.onSaveCb = opts.onSave;
    if (opts.onSaved) this.onSavedCb = opts.onSavedCb;
  }

  schedule(id: string, content: string) {
    this.pending.set(id, content);
    const existing = this.timers.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => this.flush(id), this.interval);
    this.timers.set(id, timer);
  }

  async flush(id: string) {
    const content = this.pending.get(id);
    if (content === undefined || this.saving.has(id)) return;

    this.pending.delete(id);
    const t = this.timers.get(id);
    if (t) { clearTimeout(t); this.timers.delete(id); }

    this.saving.add(id);
    this.onSaveCb?.(id);
    try {
      await ipc.invoke('documents:update', { id, content });
      this.onSavedCb?.(id);
    } catch (e) {
      console.error('[AutoSave] flush failed', id, e);
      // 失败重新加回 pending
      this.pending.set(id, content);
    } finally {
      this.saving.delete(id);
    }
  }

  async flushAll() {
    const ids = [...new Set([...this.pending.keys(), ...this.timers.keys()])];
    // 顺序执行，避免并发写入同一文档
    for (const id of ids) {
      await this.flush(id);
    }
  }

  hasPending() { return this.pending.size > 0; }
}

export const autoSave = new AutoSaveManager();
