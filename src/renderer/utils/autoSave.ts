import { ipc } from './ipc';

type SaveFn = (id: string, content: string) => Promise<void>;

class AutoSaveManager {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pending: Map<string, string> = new Map();
  private interval: number;
  private onSave?: (id: string) => void;
  private onSaved?: (id: string) => void;

  constructor(interval = 3000) {
    this.interval = interval;
  }

  configure({ interval, onSave, onSaved }: { interval?: number; onSave?: (id: string) => void; onSaved?: (id: string) => void }) {
    if (interval) this.interval = interval;
    if (onSave) this.onSave = onSave;
    if (onSaved) this.onSaved = onSaved;
  }

  schedule(id: string, content: string, title?: string) {
    this.pending.set(id, content);
    this.onSave?.(id);

    const existing = this.timers.get(id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      await this.flush(id);
    }, this.interval);

    this.timers.set(id, timer);
  }

  async flush(id: string) {
    const content = this.pending.get(id);
    if (content === undefined) return;

    try {
      await ipc.invoke('documents:update', { id, content });
      this.pending.delete(id);
      this.timers.delete(id);
      this.onSaved?.(id);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }

  async flushAll() {
    const promises = Array.from(this.pending.keys()).map(id => this.flush(id));
    await Promise.all(promises);
  }

  cancelAll() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  hasPending(id: string) {
    return this.pending.has(id);
  }
}

export const autoSave = new AutoSaveManager();
