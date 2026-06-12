"use client";

import type { ContentHistoryItem, Institution, SavedContentItem, UnifiedGenerationRecord } from "@/types/content";

const historyKey = "kidsauto.history";
const institutionKey = "kidsauto.institution";
const unifiedHistoryKey = "kidsauto.unifiedHistory";
const usageKey = "kidsauto.dailyUsage";
const savedItemsKey = "kidsauto.savedItems";

export const defaultInstitution: Institution = {
  id: "demo_institution",
  name: "키즈오토 어린이집",
  type: "daycare",
  address: "서울시 강남구 테헤란로 123",
  phone: "02-1234-5678"
};

export function getCurrentUserId() {
  if (typeof window === "undefined") return "anonymous";
  const raw = window.localStorage.getItem("kidsauto.demoUser");
  if (!raw) return "anonymous";
  try {
    const user = JSON.parse(raw) as { id?: string; email?: string };
    return user.id ?? user.email ?? "anonymous";
  } catch {
    return "anonymous";
  }
}

function scopedKey(key: string) {
  return `${key}.${getCurrentUserId()}`;
}

export function readHistory(): ContentHistoryItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(scopedKey(historyKey)) ?? window.localStorage.getItem(historyKey);
  return raw ? (JSON.parse(raw) as ContentHistoryItem[]) : [];
}

export function saveHistory(item: ContentHistoryItem) {
  if (typeof window === "undefined") return;
  const history = [item, ...readHistory()].slice(0, 50);
  window.localStorage.setItem(scopedKey(historyKey), JSON.stringify(history));
}

export function readInstitution(): Institution {
  if (typeof window === "undefined") return defaultInstitution;
  const raw = window.localStorage.getItem(institutionKey);
  return raw ? (JSON.parse(raw) as Institution) : defaultInstitution;
}

export function saveInstitution(institution: Institution) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(institutionKey, JSON.stringify(institution));
}

export function readUnifiedHistory(): UnifiedGenerationRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(scopedKey(unifiedHistoryKey)) ?? window.localStorage.getItem(unifiedHistoryKey);
  return raw ? (JSON.parse(raw) as UnifiedGenerationRecord[]) : [];
}

export function saveUnifiedRecord(record: UnifiedGenerationRecord) {
  if (typeof window === "undefined") return;
  const existing = readUnifiedHistory().filter((item) => item.id !== record.id);
  window.localStorage.setItem(scopedKey(unifiedHistoryKey), JSON.stringify([record, ...existing].slice(0, 50)));
}

export function readDailyUsage(date = new Date().toISOString().slice(0, 10)) {
  if (typeof window === "undefined") return { date, generationCount: 0, regenerationCount: 0 };
  const raw = window.localStorage.getItem(scopedKey(usageKey));
  const usage = raw ? (JSON.parse(raw) as { date: string; generationCount: number; regenerationCount: number }) : null;
  return usage?.date === date ? usage : { date, generationCount: 0, regenerationCount: 0 };
}

export function saveDailyUsage(usage: { date: string; generationCount: number; regenerationCount: number }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(scopedKey(usageKey), JSON.stringify(usage));
}

export function readSavedItems(): SavedContentItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(scopedKey(savedItemsKey));
  return raw ? (JSON.parse(raw) as SavedContentItem[]) : [];
}

export function saveSavedItem(item: Omit<SavedContentItem, "userId">) {
  if (typeof window === "undefined") return;
  const userId = getCurrentUserId();
  const savedItem: SavedContentItem = { ...item, userId };
  const existing = readSavedItems().filter((saved) => saved.id !== item.id);
  window.localStorage.setItem(scopedKey(savedItemsKey), JSON.stringify([savedItem, ...existing].slice(0, 100)));
}

export function deleteSavedItem(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(scopedKey(savedItemsKey), JSON.stringify(readSavedItems().filter((item) => item.id !== id)));
}
