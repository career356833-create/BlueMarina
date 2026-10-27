export type WakeState = "OFF" | "REQUESTING" | "ACTIVE" | "SUSPENDED" | "UNSUPPORTED" | "FAILED";
type Lock = { release: () => Promise<void>; addEventListener: (event: "release", listener: () => void) => void };
export class NavigationWakeLock {
  private lock: Lock | null = null;
  private enabled = false;
  private visible = true;
  private pending = false;
  private generation = 0;
  constructor(private request: (() => Promise<Lock>) | undefined, private notify: (state: WakeState) => void) {}
  setEnabled(enabled: boolean) { this.enabled = enabled; if (!enabled) this.clear(); else void this.acquire(); }
  setVisible(visible: boolean) { this.visible = visible; if (!visible) this.clear(); else if (this.enabled) void this.acquire(); }
  private clear() { this.generation++; const old = this.lock; this.lock = null; void old?.release().catch(()=>{}); this.notify(this.enabled ? "SUSPENDED" : "OFF"); }
  private async acquire() {
    if (!this.enabled || !this.visible || this.lock || this.pending) return;
    if (!this.request) { this.notify("UNSUPPORTED"); return; }
    const generation = this.generation; this.pending = true; this.notify("REQUESTING");
    try {
      const lock = await this.request();
      if (generation !== this.generation || !this.enabled || !this.visible) { await lock.release(); return; }
      this.lock = lock; this.notify("ACTIVE");
      lock.addEventListener("release", () => { if(this.lock === lock) { this.lock=null; this.notify(this.enabled ? "SUSPENDED" : "OFF"); } });
    } catch { if (generation === this.generation) this.notify("FAILED"); }
    finally { this.pending = false; if (generation !== this.generation && this.enabled && this.visible) void this.acquire(); }
  }
  destroy() { this.enabled = false; this.clear(); }
}
