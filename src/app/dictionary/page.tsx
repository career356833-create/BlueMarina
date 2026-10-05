"use client";
import { RelatedActions } from "@/components/platform/RelatedActions";


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
    <AppFrame family="discovery">
      <div className="bm-v3-public mx-auto max-w-[var(--bm-content-reading)] space-y-5">
        <section className="bm-page-hero overflow-hidden">
          <div className="relative p-6 sm:p-8">
                        <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bm-surface)]/15 text-white/75 ring-1 ring-white/20">
                <BookOpen size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-white/75">Blue Marina Dictionary</p>
              <h1 className="mt-2 text-3xl font-serif font-normal tracking-tight sm:text-4xl">해양용어사전</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/80 sm:text-base">
                조종면허 학습과 해양레저 활동에서 자주 만나는 용어를 쉽게 찾아볼 수 있는 기본 사전입니다.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-[var(--bm-surface)]/10 p-4">
                  <p className="text-2xl font-black">{marineDictionary.length}</p>
                  <p className="mt-1 text-xs font-bold text-white/75">등록 용어</p>
                </div>
                <div className="rounded-2xl bg-[var(--bm-surface)]/10 p-4">
                  <p className="text-2xl font-black">{marineDictionaryCategories.length}</p>
                  <p className="mt-1 text-xs font-bold text-white/75">카테고리</p>
                </div>
                <div className="rounded-2xl bg-[var(--bm-surface)]/10 p-4">
                  <p className="text-2xl font-black">모바일</p>
                  <p className="mt-1 text-xs font-bold text-white/75">검색 최적화</p>
                </div>
                <div className="rounded-2xl bg-[var(--bm-surface)]/10 p-4">
                  <p className="text-2xl font-black">기초</p>
                  <p className="mt-1 text-xs font-bold text-white/75">초보자 기준</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--bm-border)] bg-[var(--bm-surface)] p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <label className="grid gap-2 text-sm font-black text-[var(--bm-foreground)]">
              <span className="flex items-center gap-2">
                <Search size={18} className="text-[var(--bm-brand-accent)]" />
                용어 검색
              </span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="좌현, 만조, 엔진, 감성돔..."
                className="min-h-12 rounded-2xl border border-[var(--bm-border)] bg-[var(--bm-surface-elevated)] px-4 text-sm font-bold text-[var(--bm-foreground)] outline-none transition placeholder:text-[var(--bm-foreground-muted)] focus:border-[var(--bm-brand-accent)] focus:bg-[var(--bm-surface)]"
              />
            </label>

            <label className="grid gap-2 text-sm font-black text-[var(--bm-foreground)]">
              <span className="flex items-center gap-2">
                <Filter size={18} className="text-[var(--bm-brand-accent)]" />
                카테고리
              </span>
              <select
                value={category}
                onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
                className="min-h-12 rounded-2xl border border-[var(--bm-border)] bg-[var(--bm-surface-elevated)] px-4 text-sm font-bold text-[var(--bm-foreground)] outline-none transition focus:border-[var(--bm-brand-accent)] focus:bg-[var(--bm-surface)]"
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
              aria-pressed={category === "전체"} onClick={() => setCategoryFilter("전체")}
              className={`min-h-11 rounded-full px-4 text-xs font-black transition ${
                category === "전체" ? "bg-[var(--bm-brand-accent)] text-[var(--bm-ink)]" : "bg-[var(--bm-surface-elevated)] text-[var(--bm-foreground-muted)] hover:bg-[var(--bm-surface-elevated)] hover:text-[var(--bm-brand-accent)]"
              }`}
            >
              전체 ({marineDictionary.length})
            </button>
            {marineDictionaryCategories.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item} onClick={() => setCategoryFilter(item)}
                className={`min-h-11 rounded-full px-4 text-xs font-black transition ${
                  category === item ? "bg-[var(--bm-brand-accent)] text-[var(--bm-ink)]" : "bg-[var(--bm-surface-elevated)] text-[var(--bm-foreground-muted)] hover:bg-[var(--bm-surface-elevated)] hover:text-[var(--bm-brand-accent)]"
                }`}
              >
                {item} ({getCategoryCount(item)})
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--bm-border)] bg-[var(--bm-surface-elevated)]/60 p-3">
            <p className="mb-2 text-xs font-black text-[var(--bm-brand-accent)]">가나다 색인</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={initial === "전체"} onClick={() => setInitialFilter("전체")}
                className={`min-h-11 rounded-full px-3 text-xs font-black transition ${
                  initial === "전체" ? "bg-[var(--bm-brand-accent)] text-[var(--bm-ink)]" : "bg-[var(--bm-surface)] text-[var(--bm-foreground-muted)] hover:bg-[var(--bm-surface-elevated)] hover:text-[var(--bm-brand-accent)]"
                }`}
              >
                전체
              </button>
              {INITIAL_INDEXES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={initial === item} onClick={() => setInitialFilter(item)}
                  className={`min-h-11 min-w-9 rounded-full px-3 text-xs font-black transition ${
                    initial === item ? "bg-[var(--bm-brand-accent)] text-[var(--bm-ink)]" : "bg-[var(--bm-surface)] text-[var(--bm-foreground-muted)] hover:bg-[var(--bm-surface-elevated)] hover:text-[var(--bm-brand-accent)]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--bm-border)] bg-[var(--bm-surface)] p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[var(--bm-brand-accent)]">
                <Anchor size={16} />
                Dictionary Results
              </p>
              <h2 className="mt-1 text-xl font-black text-[var(--bm-foreground)]">색인 결과 {filteredItems.length}개</h2>
            </div>
            <p className="text-xs font-bold text-[var(--bm-foreground-muted)]">1페이지 10개씩, 용어 색인만 표시합니다.</p>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-3xl bg-[var(--bm-surface-elevated)] p-6 text-center">
              <p className="text-base font-black text-[var(--bm-foreground)]">검색 결과가 없습니다.</p>
              <p className="mt-2 text-sm font-semibold text-[var(--bm-foreground-muted)]">다른 용어명이나 카테고리로 다시 검색해보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2">
                {pagedItems.map((item, index) => (
                  <article key={item.id} className="min-w-0 rounded-2xl border border-[var(--bm-border)] bg-[var(--bm-surface-elevated)] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bm-surface)] text-xs font-black text-[var(--bm-brand-accent)] ring-1 ring-[var(--bm-border)]">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-base font-black text-[var(--bm-foreground)]">{item.term}</h3>
                        <p className="mt-1 text-xs font-bold text-[var(--bm-brand-accent)]">{item.category}</p>
                      </div>
                      <span className="rounded-full bg-[var(--bm-surface)] px-3 py-1 text-[11px] font-black text-[var(--bm-foreground-muted)] ring-1 ring-[var(--bm-border)]">{getInitialIndex(item.term)}</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-[var(--bm-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-black text-[var(--bm-foreground-muted)]">
                  {currentPage} / {pageCount} 페이지
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bm-surface-elevated)] px-4 text-xs font-black text-[var(--bm-foreground-muted)] transition hover:bg-[var(--bm-surface-elevated)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    이전
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    disabled={currentPage === pageCount}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--bm-brand-accent)] px-4 text-xs font-black text-[var(--bm-ink)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
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
    <RelatedActions title="이어서 살펴보기" items={[{"href":"/theory","label":"이론으로 연결"},{"href":"/boatpedia","label":"선박·장비 살펴보기"},{"href":"/license-guide","label":"가이드로 돌아가기"}]} />
    </AppFrame>
  );
}
