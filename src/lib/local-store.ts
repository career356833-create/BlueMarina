"use client";

import type { ContentHistoryItem, Institution, UnifiedGenerationRecord } from "@/types/content";

const historyKey = "kidsauto.history";
const institutionKey = "kidsauto.institution";
const unifiedHistoryKey = "kidsauto.unifiedHistory";
const usageKey = "kidsauto.dailyUsage";

export const defaultInstitution: Institution = {
  id: "demo_institution",
  name: "키즈오토 어린이집",
  type: "daycare",
  address: "서울시 강남구 테헤란로 123",
  phone: "02-1234-5678"
};

export function readHistory(): ContentHistoryItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(historyKey);
  return raw ? (JSON.parse(raw) as ContentHistoryItem[]) : [];
}

export function saveHistory(item: ContentHistoryItem) {
  if (typeof window === "undefined") return;
  const history = [item, ...readHistory()].slice(0, 50);
  window.localStorage.setItem(historyKey, JSON.stringify(history));
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
  const raw = window.localStorage.getItem(unifiedHistoryKey);
  return raw ? (JSON.parse(raw) as UnifiedGenerationRecord[]) : [];
}

export function saveUnifiedRecord(record: UnifiedGenerationRecord) {
  if (typeof window === "undefined") return;
  const existing = readUnifiedHistory().filter((item) => item.id !== record.id);
  window.localStorage.setItem(unifiedHistoryKey, JSON.stringify([record, ...existing].slice(0, 50)));
}

export function readDailyUsage(date = new Date().toISOString().slice(0, 10)) {
  if (typeof window === "undefined") return { date, generationCount: 0, regenerationCount: 0 };
  const raw = window.localStorage.getItem(usageKey);
  const usage = raw ? (JSON.parse(raw) as { date: string; generationCount: number; regenerationCount: number }) : null;
  return usage?.date === date ? usage : { date, generationCount: 0, regenerationCount: 0 };
}

export function saveDailyUsage(usage: { date: string; generationCount: number; regenerationCount: number }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(usageKey, JSON.stringify(usage));
}
