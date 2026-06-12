"use client";

import type { ContentHistoryItem, Institution } from "@/types/content";

const historyKey = "kidsauto.history";
const institutionKey = "kidsauto.institution";

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
