export type TodaySeaSourceStatus = "AVAILABLE" | "STALE" | "DISABLED" | "ERROR" | "UNKNOWN";

export type TodaySeaSourceResult<T> = {
  status: TodaySeaSourceStatus;
  data: T | null;
  code: string | null;
};

export function classifyTodaySeaSource<T>(httpOk: boolean, payload: unknown): TodaySeaSourceResult<T> {
  if (!payload || typeof payload !== "object") return { status: "ERROR", data: null, code: "INVALID_RESPONSE" };
  const body = payload as Record<string, unknown>;
  if (!httpOk || body.ok !== true) {
    const code = typeof body.code === "string" ? body.code : "SOURCE_ERROR";
    return { status: code === "SOURCE_DISABLED" || code === "API_KEY_MISSING" ? "DISABLED" : "ERROR", data: null, code };
  }
  const freshness = body.freshness;
  return { status: freshness === "stale" ? "STALE" : freshness === "unavailable" ? "UNKNOWN" : "AVAILABLE", data: body as T, code: null };
}

export function selectExplicitStation<T extends { stationId: string }>(rows: T[], selectedId: string): T | null {
  return selectedId ? rows.find((row) => row.stationId === selectedId) ?? null : null;
}

export function formatSeoulCalendarDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
