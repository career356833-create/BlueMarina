"use client";

import { useMemo, useState } from "react";
import { Anchor, BookOpen, ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { marineDictionary, marineDictionaryCategories, type MarineDictionaryCategory } from "@/data/marine-dictionary";

type CategoryFilter = MarineDictionaryCategory | "전체";
type InitialFilter = string | "전체";

const PAGE_SIZE = 10;
const INITIAL_INDEXES = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ", "A-Z"] as const;

function getCategoryCount(category: MarineDictionaryCategory) {
  return marineDictionary.filter((item) => item.category === category).length;
}

function getInitialIndex(value: string) {
  const first = value.trim().charAt(0);
  const code = first.charCodeAt(0);

  if (code >= 0xac00 && code <= 0xd7a3) {
    return INITIAL_INDEXES[Math.floor((code - 0xac00) / 588)] ?? "A-Z";
  }

  return "A-Z";
}

export default function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("전체");
  const [initial, setInitial] = useState<InitialFilter>("전체");
  const [page, setPage] = useState(1);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return marineDictionary.filter((item) => {
      const matchesCategory = category === "전체" || item.category === category;
      const matchesInitial = initial === "전체" || getInitialIndex(item.term) === initial;
      const searchable = [item.term, item.category, item.shortDescription, item.description, ...item.relatedTerms].join(" ").toLowerCase();
      const matchesQuery = normalizedQuery.length === 0 || searchable.includes(normalizedQuery);

      return matchesCategory && matchesInitial && matchesQuery;
    });
  }, [category, initial, query]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const setCategoryFilter = (nextCategory: CategoryFilter) => {
    setCategory(nextCategory);
    setPage(1);
  };

  const setInitialFilter = (nextInitial: InitialFilter) => {
    setInitial(nextInitial);
    setPage(1);
  };

  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.38),transparent_35%),linear-gradient(135deg,rgba(14,116,144,0.42),transparent_55%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <BookOpen size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Blue Marina Dictionary</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">해양용어사전</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                조종면허 학습과 해양레저 활동에서 자주 만나는 용어를 쉽게 찾아볼 수 있는 기본 사전입니다.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">{marineDictionary.length}</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">등록 용어</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">{marineDictionaryCategories.length}</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">카테고리</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">모바일</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">검색 최적화</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-black">기초</p>
                  <p className="mt-1 text-xs font-bold text-sky-100">초보자 기준</p>
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
                용어 검색
              </span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="좌현, 만조, 엔진, 감성돔..."
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
                onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
                className="min-h-12 rounded-2xl border border-sky-100 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
              >
                <option value="전체">전체 카테고리</option>
                {marineDictionaryCategories.map((item) => (
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
              onClick={() => setCategoryFilter("전체")}
              className={`min-h-10 rounded-full px-4 text-xs font-black transition ${
                category === "전체" ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700"
              }`}
            >
              전체 ({marineDictionary.length})
            </button>
            {marineDictionaryCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategoryFilter(item)}
                className={`min-h-10 rounded-full px-4 text-xs font-black transition ${
                  category === item ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                }`}
              >
                {item} ({getCategoryCount(item)})
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/60 p-3">
            <p className="mb-2 text-xs font-black text-sky-800">가나다 색인</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setInitialFilter("전체")}
                className={`min-h-9 rounded-full px-3 text-xs font-black transition ${
                  initial === "전체" ? "bg-[#0F2D52] text-white" : "bg-white text-slate-600 hover:bg-sky-100 hover:text-sky-800"
                }`}
              >
                전체
              </button>
              {INITIAL_INDEXES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setInitialFilter(item)}
                  className={`min-h-9 min-w-9 rounded-full px-3 text-xs font-black transition ${
                    initial === item ? "bg-[#0F2D52] text-white" : "bg-white text-slate-600 hover:bg-sky-100 hover:text-sky-800"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-700">
                <Anchor size={16} />
                Dictionary Results
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">색인 결과 {filteredItems.length}개</h2>
            </div>
            <p className="text-xs font-bold text-slate-500">1페이지 10개씩, 용어 색인만 표시합니다.</p>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 p-6 text-center">
              <p className="text-base font-black text-slate-900">검색 결과가 없습니다.</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">다른 용어명이나 카테고리로 다시 검색해보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2">
                {pagedItems.map((item, index) => (
                  <article key={item.id} className="min-w-0 rounded-2xl border border-sky-100 bg-slate-50 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-sky-800 ring-1 ring-sky-100">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-base font-black text-slate-950">{item.term}</h3>
                        <p className="mt-1 text-xs font-bold text-sky-700">{item.category}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-sky-100">{getInitialIndex(item.term)}</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-sky-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-black text-slate-500">
                  {currentPage} / {pageCount} 페이지
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-slate-100 px-4 text-xs font-black text-slate-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    이전
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    disabled={currentPage === pageCount}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-sky-700 px-4 text-xs font-black text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    다음
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppFrame>
  );
}
