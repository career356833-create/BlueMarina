"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Newspaper, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { readHistory, readUnifiedHistory } from "@/lib/local-store";
import { formatContentType } from "@/lib/utils";
import type { ContentHistoryItem, UnifiedGenerationRecord } from "@/types/content";

export function DashboardClient() {
  const [history, setHistory] = useState<ContentHistoryItem[]>([]);
  const [unifiedHistory, setUnifiedHistory] = useState<UnifiedGenerationRecord[]>([]);

  useEffect(() => {
    setHistory(readHistory());
    setUnifiedHistory(readUnifiedHistory());
  }, []);

  const stats = useMemo(() => {
    const month = new Date().getMonth();
    const thisMonth = history.filter((item) => new Date(item.createdAt).getMonth() === month);
    const unifiedThisMonth = unifiedHistory.filter((item) => new Date(item.createdAt).getMonth() === month);
    return {
      total: thisMonth.length + unifiedThisMonth.length * 5,
      notice: thisMonth.filter((item) => item.type === "notice").length + unifiedThisMonth.length,
      newsletter: thisMonth.filter((item) => item.type === "newsletter").length + unifiedThisMonth.length
    };
  }, [history, unifiedHistory]);

  const cards = [
    { label: "이번달 생성수", value: stats.total, icon: Sparkles },
    { label: "알림장 생성수", value: stats.notice, icon: Bell },
    { label: "가정통신문 생성수", value: stats.newsletter, icon: Newspaper }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge>Professional SaaS MVP</Badge>
          <h1 className="mt-3 text-2xl font-black text-ink sm:text-3xl">대시보드</h1>
          <p className="mt-2 text-sm text-muted">콘텐츠 생성 현황과 최근 결과를 한눈에 확인합니다.</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-md border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-muted">{card.label}</p>
                <Icon className="text-brand-600" size={20} />
              </div>
              <p className="mt-5 text-3xl font-black text-ink">{card.value}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-md border border-line bg-white shadow-soft">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-black">최근 생성 이력</h2>
        </div>
        <div className="divide-y divide-line">
          {history.length === 0 && unifiedHistory.length === 0 ? (
            <div className="flex min-h-44 items-center justify-center text-sm text-muted">
              아직 생성 이력이 없습니다.
            </div>
          ) : (
            <>
              {unifiedHistory.slice(0, 5).map((item) => (
                <div key={item.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-ink">{item.activityName} 통합 생성</p>
                    <p className="mt-1 text-sm text-muted">
                      5종 콘텐츠 · {item.className} · {item.keywords.join(", ")}
                    </p>
                  </div>
                  <div className="text-sm text-muted">{new Date(item.createdAt).toLocaleDateString("ko-KR")}</div>
                </div>
              ))}
              {history.slice(0, 3).map((item) => (
                <div key={item.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-ink">{item.content.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatContentType(item.type)} · {item.keywords.join(", ")}
                    </p>
                  </div>
                  <div className="text-sm text-muted">{new Date(item.createdAt).toLocaleDateString("ko-KR")}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
