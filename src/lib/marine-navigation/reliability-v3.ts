import { createHash } from "node:crypto";
import type { KhoaNavigationAid, KhoaNavigationAidCategoryCode, KhoaNavigationAidPage } from "./adapters/khoa-navigation-aids";
import type { KhoaNavigationWarningDetailItem, KhoaNavigationWarningListItem } from "./adapters/khoa-navigation-warnings";
import type { KhoaNavigationWarningPage } from "./adapters/khoa-navigation-warnings";

export const AID_CATEGORY_IDS = ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09"] as const;
// Existing navigation-aid revalidation interval; it is a review limit, not a safety guarantee.
export const AID_REVIEW_INTERVAL_MS = 86_400_000;
// Existing warning cache interval. Expiry disables any claim of current status.
export const WARNING_CURRENT_WINDOW_MS = 600_000;

export type AidSnapshot = {
  categoryId: KhoaNavigationAidCategoryCode;
  source: "국립해양조사원(KHOA)";
  fetchedAt: string;
  sourceObservedAt: string | null;
  itemCount: number;
  validationStatus: "VALID";
  payloadChecksum: string;
  items: KhoaNavigationAid[];
};
export type ValidatedAidPage = KhoaNavigationAidPage & { rawItemCount: number; completeXml: boolean };
export type AidSlot = { snapshot?: AidSnapshot; lastAttemptAt: string | null; lastSuccessAt: string | null; lastErrorClass: string | null; attemptCount?: number };
export type AidStore = { version: 3; categories: Partial<Record<KhoaNavigationAidCategoryCode, AidSlot>> };
export type AidCategoryHealth = { categoryId: KhoaNavigationAidCategoryCode; state: "VALID" | "STALE" | "FAILED" | "NEVER_FETCHED"; itemCount: number; payloadChecksum: string | null; lastAttemptAt: string | null; lastSuccessAt: string | null; lastErrorClass: string | null; attemptCount: number };

export type WarningListSnapshot = { source: "국립해양조사원(KHOA)"; fetchedAt: string; itemCount: number; documentNumbers: string[]; payloadChecksum: string; items: KhoaNavigationWarningListItem[] };
export type WarningListStore = { version: 3; snapshot?: WarningListSnapshot; lastAttemptAt: string | null; lastSuccessAt: string | null; lastErrorClass: string | null };
export type WarningDetailSnapshot = { documentNumber: string; fetchedAt: string; itemCount: number; payloadChecksum: string; items: KhoaNavigationWarningDetailItem[] };
export type WarningDetailStore = { version: 3; documents: Record<string, { snapshot?: WarningDetailSnapshot; lastAttemptAt: string | null; lastSuccessAt: string | null; lastErrorClass: string | null }> };

export function checksum(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
export function validTime(value: unknown) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }

export function validateAidPage(page: ValidatedAidPage, categoryId: KhoaNavigationAidCategoryCode, expectedTotal: number, expectedPage: number, rows: number) {
  if (!page.completeXml || page.pageNo !== expectedPage || page.numOfRows !== rows || page.totalCount !== expectedTotal) return false;
  if (page.rawItemCount !== Math.min(rows, Math.max(0, expectedTotal - (expectedPage - 1) * rows))) return false;
  if (page.quality.invalidRecordCount || page.quality.invalidCoordinateCount || page.quality.duplicateIds.length || page.quality.missingNameCount) return false;
  return page.items.length === page.rawItemCount && page.items.every((item) => item.aidCategoryCode === categoryId && item.sourceRecordId.length > 0 &&
    (item.koreanName !== null || item.englishName !== null) && Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 && Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180);
}

export function buildAidSnapshot(categoryId: KhoaNavigationAidCategoryCode, pages: ValidatedAidPage[], fetchedAt: string, rows: number): AidSnapshot {
  if (!validTime(fetchedAt) || pages.length === 0) throw new Error("INVALID_FETCH_TIME_OR_PAGES");
  const expectedTotal = pages[0].totalCount;
  if (!Number.isInteger(expectedTotal) || expectedTotal < 0 || pages.length !== Math.max(1, Math.ceil(expectedTotal / rows))) throw new Error("INCOMPLETE_CATEGORY");
  for (const [index, page] of pages.entries()) if (!validateAidPage(page, categoryId, expectedTotal, index + 1, rows)) throw new Error("INVALID_CATEGORY_PAGE");
  const items = pages.flatMap((page) => page.items);
  if (items.length !== expectedTotal || new Set(items.map((item) => item.sourceRecordId)).size !== expectedTotal) throw new Error("CATEGORY_COUNT_OR_ID_MISMATCH");
  return { categoryId, source: "국립해양조사원(KHOA)", fetchedAt, sourceObservedAt: null, itemCount: items.length, validationStatus: "VALID", payloadChecksum: checksum(items), items };
}

export function isValidAidSnapshot(value: AidSnapshot | undefined, categoryId: KhoaNavigationAidCategoryCode): value is AidSnapshot {
  return !!value && value.categoryId === categoryId && value.source === "국립해양조사원(KHOA)" && value.validationStatus === "VALID" && validTime(value.fetchedAt) &&
    value.itemCount === value.items.length && value.payloadChecksum === checksum(value.items) &&
    new Set(value.items.map((item) => item.sourceRecordId)).size === value.itemCount &&
    value.items.every((item) => item.aidCategoryCode === categoryId && !!item.sourceRecordId && (item.koreanName !== null || item.englishName !== null) &&
      Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 && Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180);
}

export function shouldCollectAid(store: AidStore, categoryId: KhoaNavigationAidCategoryCode, forceRefresh = false) {
  return forceRefresh || !isValidAidSnapshot(store.categories[categoryId]?.snapshot, categoryId);
}

export function recordAidAttempt(store: AidStore, categoryId: KhoaNavigationAidCategoryCode, attemptedAt: string, snapshot: AidSnapshot | null, errorClass: string | null) {
  if (!validTime(attemptedAt) || snapshot && !isValidAidSnapshot(snapshot, categoryId)) throw new Error("INVALID_AID_ATTEMPT");
  const previous = store.categories[categoryId];
  const slot: AidSlot = {
    snapshot: snapshot ?? previous?.snapshot,
    lastAttemptAt: attemptedAt,
    lastSuccessAt: snapshot?.fetchedAt ?? previous?.lastSuccessAt ?? null,
    lastErrorClass: snapshot ? null : errorClass ?? "UNKNOWN_FAILURE",
    attemptCount: (previous?.attemptCount ?? 0) + 1,
  };
  store.categories[categoryId] = slot;
  return slot;
}

export function evaluateAids(store: AidStore, now = Date.now()) {
  const categories: AidCategoryHealth[] = AID_CATEGORY_IDS.map((categoryId) => {
    const slot = store.categories[categoryId];
    const snapshot = slot?.snapshot;
    const valid = isValidAidSnapshot(snapshot, categoryId);
    const state = valid ? now - Date.parse(snapshot.fetchedAt) > AID_REVIEW_INTERVAL_MS ? "STALE" : "VALID" : slot?.lastAttemptAt ? "FAILED" : "NEVER_FETCHED";
    return { categoryId, state, itemCount: valid ? snapshot.itemCount : 0, payloadChecksum: valid ? snapshot.payloadChecksum : null, lastAttemptAt: slot?.lastAttemptAt ?? null, lastSuccessAt: valid ? snapshot.fetchedAt : null, lastErrorClass: slot?.lastErrorClass ?? null, attemptCount: slot?.attemptCount ?? 0 };
  });
  const validSnapshots = AID_CATEGORY_IDS.flatMap((categoryId) => isValidAidSnapshot(store.categories[categoryId]?.snapshot, categoryId) ? [store.categories[categoryId]!.snapshot!] : []);
  const complete = categories.filter((category) => category.state === "VALID").length;
  const present = validSnapshots.length;
  const state = present === 0 ? "UNAVAILABLE" : present === 9 ? complete === 9 ? "AVAILABLE" : "STALE" : "PARTIAL";
  const items = validSnapshots.flatMap((snapshot) => snapshot.items);
  const lastSuccessAt = validSnapshots.map((snapshot) => snapshot.fetchedAt).sort().at(-1) ?? null;
  return { state, categories, complete, present, items, lastSuccessAt, dataMode: "SNAPSHOT" as const, freshness: state === "AVAILABLE" ? "fresh" : state === "STALE" ? "stale" : "partial" };
}

export function validWarningList(snapshot: WarningListSnapshot | undefined): snapshot is WarningListSnapshot {
  return !!snapshot && validTime(snapshot.fetchedAt) && snapshot.source === "국립해양조사원(KHOA)" && snapshot.itemCount === snapshot.items.length &&
    snapshot.payloadChecksum === checksum(snapshot.items) && JSON.stringify(snapshot.documentNumbers) === JSON.stringify([...new Set(snapshot.items.map((item) => item.documentNumber))]);
}
export function validateWarningPage<T extends { documentNumber: string }>(page: KhoaNavigationWarningPage<T>, metadataPresent: boolean, expectedTotal: number, expectedPage: number, rows: number, documentNumber?: string) {
  return metadataPresent && Number.isInteger(expectedTotal) && expectedTotal >= 0 && page.totalCount === expectedTotal &&
    page.pageNo === expectedPage && page.numOfRows === rows &&
    page.items.length === Math.min(rows, Math.max(0, expectedTotal - (expectedPage - 1) * rows)) &&
    page.items.every((item) => item.documentNumber.length > 0 && (!documentNumber || item.documentNumber === documentNumber));
}
export function validWarningDetail(snapshot: WarningDetailSnapshot | undefined, documentNumber: string): snapshot is WarningDetailSnapshot {
  return !!snapshot && snapshot.documentNumber === documentNumber && validTime(snapshot.fetchedAt) && snapshot.itemCount > 0 && snapshot.itemCount === snapshot.items.length && snapshot.payloadChecksum === checksum(snapshot.items) &&
    snapshot.items.every((item) => item.documentNumber === documentNumber);
}

export function evaluateWarnings(listStore: WarningListStore, detailStore: WarningDetailStore, now = Date.now()) {
  const list = listStore.snapshot;
  const validList = validWarningList(list);
  const lastSuccessAt = validList ? list.fetchedAt : null;
  const sourceFailedAfterSuccess = !!(validList && listStore.lastErrorClass && validTime(listStore.lastAttemptAt) && Date.parse(listStore.lastAttemptAt!) > Date.parse(list.fetchedAt));
  const current = validList && !sourceFailedAfterSuccess && now >= Date.parse(list.fetchedAt) && now - Date.parse(list.fetchedAt) <= WARNING_CURRENT_WINDOW_MS;
  const documentNumbers = validList ? list.documentNumbers : [];
  const details = current ? documentNumbers.flatMap((number) => {
    const snapshot = detailStore.documents[number]?.snapshot;
    return validWarningDetail(snapshot, number) && Date.parse(snapshot.fetchedAt) >= Date.parse(list.fetchedAt) ? snapshot.items : [];
  }) : [];
  const failedDocumentNumbers = current ? documentNumbers.filter((number) => {
    const snapshot = detailStore.documents[number]?.snapshot;
    return !validWarningDetail(snapshot, number) || Date.parse(snapshot.fetchedAt) < Date.parse(list.fetchedAt);
  }) : [];
  const state = !current ? "CURRENT_STATUS_UNAVAILABLE" : documentNumbers.length === 0 ? "AVAILABLE_EMPTY" : failedDocumentNumbers.length ? "PARTIAL" : "AVAILABLE";
  return { state, listItems: current ? list.items : [], detailItems: details, documentNumbers, failedDocumentNumbers, lastSuccessAt, dataMode: "SNAPSHOT" as const, freshness: current ? "fresh" : "historical" };
}
