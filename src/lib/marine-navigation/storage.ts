export interface StorageAdapter<T> { load(): T; save(value: T): void; clear(): void }

export function createLocalStorageAdapter<T>(key: string, fallback: T): StorageAdapter<T> {
  return {
    load() {
      if (typeof window === "undefined") return fallback;
      try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
    },
    save(value) { if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value)); },
    clear() { if (typeof window !== "undefined") window.localStorage.removeItem(key); },
  };
}

export const waypointStorageKey = "blue-marina-navigation:waypoints:v1";
export const trackStorageKey = "blue-marina-navigation:tracks:v1";
