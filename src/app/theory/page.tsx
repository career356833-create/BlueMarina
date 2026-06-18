"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, Search } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { getTheoryCategories, theories, type TheoryItem } from "@/data/theories";
import { getTheoryQuestionCount } from "@/lib/boat/theory";

const statusLabel: Record<TheoryItem["status"], string> = {
  ready: "준비됨",
  draft: "초안 준비중",
  "coming-soon": "준비중"
};

function TheoryStatusBadge({ status }: { status: TheoryItem["status"] }) {
  const className =
    status === "ready"
      ? "bg-emerald-100 text-emerald-700"
      : status === "draft"
        ? "bg-sky-100 text-sky-700"
        : "bg-slate-100 text-slate-500";

  return <span className={`rounded-full px-2 py-1 text-[11px] font-black ${className}`}>{statusLabel[status]}</span>;
}

export default function TheoryPage() {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [query, setQuery] = useState("");
  const categories = useMemo(() => ["전체", ...getTheoryCategories()], []);

  const filteredTheories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return theories.filter((theory) => {
      const matchesCategory = selectedCategory === "전체" || theory.category === selectedCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        theory.title.toLowerCase().includes(normalizedQuery) ||
        theory.tag.toLowerCase().includes(normalizedQuery) ||
        theory.category.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory]);

  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black text-sky-700">Blue Marina Theory</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">이론학습</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                태그별 이론, 시험 포인트, 관련 문제를 연결하기 위한 학습 구조입니다. 실제 이론 본문은 검증 후 순차적으로 채워집니다.
              </p>
            </div>
            <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-black text-sky-800">
              현재 {theories.length}개 주제 구조 준비
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-black transition ${
                    selectedCategory === category ? "bg-sky-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-sky-50"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 lg:w-80">
              <Search size={18} className="text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="태그 또는 카테고리 검색"
                className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTheories.map((theory) => (
            <Link
              key={theory.id}
              href={`/theory/${encodeURIComponent(theory.tag)}`}
              className="group rounded-[1.75rem] border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <BookOpenCheck size={24} />
                </div>
                <TheoryStatusBadge status={theory.status} />
              </div>
              <p className="mt-5 text-xs font-black text-sky-700">{theory.category}</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{theory.title}</h2>
              <p className="mt-3 min-h-12 text-sm font-semibold leading-6 text-slate-500">{theory.summary || "이론 준비중"}</p>
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <span className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                    일반 {getTheoryQuestionCount(theory, "general")}문항
                  </span>
                  <span className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                    요트 {getTheoryQuestionCount(theory, "yacht")}문항
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500">태그 기반 자동 연결</span>
                  <span className="flex items-center gap-1 text-sm font-black text-sky-700">
                    보기 <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>

        {filteredTheories.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-sky-200 bg-sky-50 p-6 text-center">
            <p className="text-sm font-black text-slate-700">검색 조건에 맞는 이론 주제가 없습니다.</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">태그 매핑과 이론 콘텐츠가 추가되면 목록이 확장됩니다.</p>
          </section>
        ) : null}
      </div>
    </AppFrame>
  );
}
