"use client";
import { RelatedActions } from "@/components/platform/RelatedActions";


import { useMemo, useState } from "react";
import { ChevronDown, Filter, HelpCircle, Search, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { faqCategories, faqItems, type FaqCategory } from "@/data/faq-data";

type FaqCategoryFilter = FaqCategory | "전체";

function getCategoryCount(category: FaqCategory) {
  return faqItems.filter((item) => item.category === category).length;
}

export default function FaqPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategoryFilter>("전체");
  const [openId, setOpenId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return faqItems.filter((item) => {
      const matchesCategory = category === "전체" || item.category === category;
      const searchable = [item.category, item.question, item.answer].join(" ").toLowerCase();
      const matchesQuery = normalizedQuery.length === 0 || searchable.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <AppFrame family="discovery">
      <div className="bm-v3-public mx-auto max-w-[var(--bm-content-reading)] space-y-5">
        <section className="bm-page-hero overflow-hidden">
          <div className="relative p-6 sm:p-8">
                        <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bm-surface)]/15 text-white/75 ring-1 ring-white/20">
                <HelpCircle size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-white/75">Blue Marina FAQ</p>
              <h1 className="mt-2 text-3xl font-serif font-normal tracking-tight sm:text-4xl">FAQ 센터</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/80 sm:text-base">
                조종면허 학습, 시험 준비, 면허 발급 과정에서 자주 묻는 질문을 한곳에 모았습니다.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-[var(--bm-surface)]/10 p-4">
                  <p className="text-2xl font-black">{faqItems.length}</p>
                  <p className="mt-1 text-xs font-bold text-white/75">FAQ</p>
                </div>
                <div className="rounded-2xl bg-[var(--bm-surface)]/10 p-4">
                  <p className="text-2xl font-black">{faqCategories.length}</p>
                  <p className="mt-1 text-xs font-bold text-white/75">카테고리</p>
                </div>
                <div className="rounded-2xl bg-[var(--bm-surface)]/10 p-4">
                  <p className="text-2xl font-black">검색</p>
                  <p className="mt-1 text-xs font-bold text-white/75">질문 빠른 찾기</p>
                </div>
                <div className="rounded-2xl bg-[var(--bm-surface)]/10 p-4">
                  <p className="text-2xl font-black">안내</p>
                  <p className="mt-1 text-xs font-bold text-white/75">공식 확인 권장</p>
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
                FAQ 검색
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="1급, 재응시, 면허증, 요트..."
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
                onChange={(event) => setCategory(event.target.value as FaqCategoryFilter)}
                className="min-h-12 rounded-2xl border border-[var(--bm-border)] bg-[var(--bm-surface-elevated)] px-4 text-sm font-bold text-[var(--bm-foreground)] outline-none transition focus:border-[var(--bm-brand-accent)] focus:bg-[var(--bm-surface)]"
              >
                <option value="전체">전체 FAQ</option>
                {faqCategories.map((item) => (
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
              aria-pressed={category === "전체"} onClick={() => setCategory("전체")}
              className={`min-h-11 rounded-full px-4 text-xs font-black transition ${
                category === "전체" ? "bg-[var(--bm-brand-accent)] text-[var(--bm-ink)]" : "bg-[var(--bm-surface-elevated)] text-[var(--bm-foreground-muted)] hover:bg-[var(--bm-surface-elevated)] hover:text-[var(--bm-brand-accent)]"
              }`}
            >
              전체 ({faqItems.length})
            </button>
            {faqCategories.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item} onClick={() => setCategory(item)}
                className={`min-h-11 rounded-full px-4 text-xs font-black transition ${
                  category === item ? "bg-[var(--bm-brand-accent)] text-[var(--bm-ink)]" : "bg-[var(--bm-surface-elevated)] text-[var(--bm-foreground-muted)] hover:bg-[var(--bm-surface-elevated)] hover:text-[var(--bm-brand-accent)]"
                }`}
              >
                {item} ({getCategoryCount(item)})
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--bm-border)] bg-[var(--bm-surface)] p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[var(--bm-brand-accent)]">
                <ShieldCheck size={16} />
                Frequently Asked Questions
              </p>
              <h2 className="mt-1 text-xl font-black text-[var(--bm-foreground)]">검색 결과 {filteredFaqs.length}개</h2>
            </div>
            <p className="text-xs font-bold text-[var(--bm-foreground-muted)]">질문 카드를 누르면 답변이 열립니다.</p>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="rounded-3xl bg-[var(--bm-surface-elevated)] p-6 text-center">
              <p className="text-base font-black text-[var(--bm-foreground)]">검색 결과가 없습니다.</p>
              <p className="mt-2 text-sm font-semibold text-[var(--bm-foreground-muted)]">다른 검색어 또는 카테고리로 다시 확인해보세요.</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredFaqs.map((item) => {
                const isOpen = openId === item.id;

                return (
                  <article key={item.id} className="min-w-0 rounded-2xl border border-[var(--bm-border)] bg-[var(--bm-surface-elevated)] p-4 transition hover:border-[var(--bm-brand-accent)] hover:bg-[var(--bm-surface-elevated)] hover:shadow-sm">
                    <button type="button" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : item.id)} className="w-full text-left">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex rounded-full bg-[var(--bm-surface-elevated)] px-3 py-1 text-[11px] font-black text-[var(--bm-brand-accent)]">{item.category}</span>
                          <h3 className="mt-3 break-words text-base font-black leading-6 text-[var(--bm-foreground)]">{item.question}</h3>
                        </div>
                        <ChevronDown className={`mt-1 shrink-0 text-[var(--bm-brand-accent)] transition ${isOpen ? "rotate-180" : ""}`} size={20} />
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="mt-4 rounded-2xl bg-[var(--bm-surface)] p-4">
                        <p className="text-sm font-semibold leading-7 text-[var(--bm-foreground-muted)]">{item.answer}</p>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    <RelatedActions title="이어서 살펴보기" items={[{"href":"/contact","label":"해결되지 않은 내용 문의"},{"href":"/coming-soon","label":"준비 중 기능 안내"},{"href":"/","label":"이용 가능한 서비스"}]} />
    </AppFrame>
  );
}
