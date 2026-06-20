"use client";

import { useMemo, useState } from "react";
import { Anchor, ChevronDown, Filter, Sailboat, Search, ShieldAlert, Sparkles } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { boatpediaCategories, boatpediaItems, type BoatpediaCategory } from "@/data/boatpedia-data";

type BoatpediaCategoryFilter = BoatpediaCategory | "전체";

function getCategoryCount(category: BoatpediaCategory) {
  return boatpediaItems.filter((item) => item.category === category).length;
}

export default function BoatpediaPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BoatpediaCategoryFilter>("전체");
  const [openId, setOpenId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return boatpediaItems.filter((item) => {
      const matchesCategory = category === "전체" || item.category === category;
      const searchable = [
        item.name,
        item.category,
        item.shortDescription,
        item.description,
        item.usage,
        item.caution,
        ...item.relatedItems
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = normalizedQuery.length === 0 || searchable.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.35),transparent_34%),linear-gradient(135deg,rgba(14,116,144,0.42),transparent_58%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <Sailboat size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Blue Marina Boatpedia</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">보트백과</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                보트 종류, 엔진, 세일링, 수상오토바이, 장비와 안전용품을 입문자도 이해하기 쉽게 정리했습니다.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">{boatpediaItems.length}</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">수록 항목</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">{boatpediaCategories.length}</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">카테고리</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">장비</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">운항 준비</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">안전</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">주의사항</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <label className="grid gap-2 text-sm font-black text-slate-800">
              <span className="flex items-center gap-2">
                <Search size={18} className="text-sky-700" />
                항목 검색
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="FRP 보트, 선외기, 구명조끼..."
                className="min-h-12 rounded-2xl border border-sky-100 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-800">
              <span className="flex items-center gap-2">
                <Filter size={18} className="text-sky-700" />
                카테고리
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as BoatpediaCategoryFilter)}
                className="min-h-12 rounded-2xl border border-sky-100 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
              >
                <option value="전체">전체 항목</option>
                {boatpediaCategories.map((item) => (
                  <option key={item} value={item}>
                    {item} ({getCategoryCount(item)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory("전체")}
              className={`min-h-10 rounded-full px-4 text-xs font-black transition ${
                category === "전체" ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700"
              }`}
            >
              전체 ({boatpediaItems.length})
            </button>
            {boatpediaCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`min-h-10 rounded-full px-4 text-xs font-black transition ${
                  category === item ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                }`}
              >
                {item} ({getCategoryCount(item)})
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-700">
                <Anchor size={16} />
                Boatpedia Results
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">검색 결과 {filteredItems.length}개</h2>
            </div>
            <p className="text-xs font-bold text-slate-500">카드를 누르면 상세 설명, 용도, 주의사항이 열립니다.</p>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 p-6 text-center">
              <p className="text-base font-black text-slate-900">검색 결과가 없습니다.</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">다른 장비명이나 카테고리로 다시 찾아보세요.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const isOpen = openId === item.id;

                return (
                  <article
                    key={item.id}
                    className="min-w-0 rounded-2xl border border-sky-100 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-white hover:shadow-sm"
                  >
                    <button type="button" onClick={() => setOpenId(isOpen ? null : item.id)} className="w-full text-left">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black text-sky-800">{item.category}</span>
                          <h3 className="mt-3 break-words text-lg font-black leading-6 text-slate-950">{item.name}</h3>
                          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{item.shortDescription}</p>
                        </div>
                        <ChevronDown className={`mt-1 shrink-0 text-sky-700 transition ${isOpen ? "rotate-180" : ""}`} size={20} />
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="mt-4 space-y-3 rounded-2xl bg-white p-4">
                        <div>
                          <p className="flex items-center gap-2 text-xs font-black text-slate-950">
                            <Sparkles size={15} className="text-sky-700" />
                            상세 설명
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">{item.description}</p>
                        </div>
                        <div className="rounded-2xl bg-sky-50 p-3">
                          <p className="text-xs font-black text-sky-800">용도</p>
                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{item.usage}</p>
                        </div>
                        <div className="rounded-2xl bg-amber-50 p-3">
                          <p className="flex items-center gap-2 text-xs font-black text-amber-800">
                            <ShieldAlert size={15} />
                            주의사항
                          </p>
                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{item.caution}</p>
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-950">관련 장비</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.relatedItems.map((relatedItem) => (
                              <button
                                key={relatedItem}
                                type="button"
                                onClick={() => {
                                  setQuery(relatedItem);
                                  setOpenId(null);
                                }}
                                className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-800 transition hover:bg-sky-100"
                              >
                                {relatedItem}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppFrame>
  );
}
