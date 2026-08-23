import type { FishRoleDatabaseClient, FishRoleDbRow } from "../types";
export class FakeFishRoleDatabaseClient implements FishRoleDatabaseClient {
  readonly tables = new Map<string, FishRoleDbRow[]>(); readonly locks = new Set<string>();
  async select(table: string, query: FishRoleDbRow) { return (this.tables.get(table) ?? []).filter((row) => Object.entries(query).every(([key, value]) => row[key] === value)); }
  async insert(table: string, row: FishRoleDbRow) { const rows = this.tables.get(table) ?? []; rows.push({ ...row }); this.tables.set(table, rows); return row; }
  async update(table: string, patch: FishRoleDbRow, match: FishRoleDbRow) { const rows = this.tables.get(table) ?? []; const index = rows.findIndex((row) => Object.entries(match).every(([key, value]) => row[key] === value)); if (index < 0) return null; rows[index] = { ...rows[index], ...patch }; return rows[index]; }
  async withAdvisoryLock<T>(key: string, work: () => Promise<T>) { if (this.locks.has(key)) throw new Error("operation lock conflict"); this.locks.add(key); try { return await work(); } finally { this.locks.delete(key); } }
}
