"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Layers3 } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { QuestionCard } from "@/components/boat/QuestionCard";
import {
  DEFAULT_CATEGORY,
  DEFAULT_CATEGORY_LABEL,
  getAvailableCategories,
  getLicenseLabel,
  getQuestionsByCategory,
  getQuestionsByTag,
  normalizeLicenseType
} from "@/lib/boat/questions";

function StudyContent() {
  const searchParams = useSearchParams();
  const licenseType = normalizeLicenseType(searchParams.get("license"));
  const licenseLabel = getLicenseLabel(licenseType);
  const initialTag = searchParams.get("tag") ?? "";
  const availableCategories = getAvailableCategories();
  const initialCategory = searchParams.get("category") ?? DEFAULT_CATEGORY;
  const [category, setCategory] = useState<string>(availableCategories.includes(initialCategory) ? initialCategory : DEFAULT_CATEGORY);
  const [tag, setTag] = useState(initialTag);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const pool = useMemo(
    () => (tag ? getQuestionsByTag(licenseType, tag) : getQuestionsByCategory(licenseType, category)),
    [category, licenseType, tag]
  );
  const question = pool[index];

  function chooseCategory(nextCategory: string) {
    setCategory(nextCategory);
    setTag("");
    setIndex(0);
    setSelected(null);
  }

  function nextQuestion() {
    setIndex((current) => (pool.length === 0 ? 0 : (current + 1) % pool.length));
    setSelected(null);
  }

  return (
    <>
      <div className="mb-5">
        <p className="flex items-center gap-2 text-sm font-black text-sky-700">
          <Layers3 size={17} />
          {licenseLabel}
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">{tag ? `#${tag} 복습` : "분류별 문제은행"}</h1>
      </div>

      {!tag && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {availableCategories.map((item) => (
            <button
              key={item}
              type="button"
              className={`min-h-11 shrink-0 rounded-full px-4 py-2 text-sm font-black ${
                category === item ? "bg-sky-700 text-white" : "bg-white text-slate-600"
              }`}
              onClick={() => chooseCategory(item)}
            >
              {item === DEFAULT_CATEGORY ? DEFAULT_CATEGORY_LABEL : item}
            </button>
          ))}
        </div>
      )}

      {question ? (
        <>
          <QuestionCard
            question={question}
            selectedIndex={selected}
            onSelect={(answerIndex) => setSelected(answerIndex)}
            questionNumber={index + 1}
            total={pool.length}
          />

          {selected !== null && (
            <button
              type="button"
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 font-black text-white shadow-sm"
              onClick={nextQuestion}
            >
              다음 문제
              <ArrowRight size={18} />
            </button>
          )}
        </>
      ) : (
        <section className="rounded-3xl border border-sky-100 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">해당 조건에 맞는 문항이 없습니다.</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">다른 카테고리나 전체 문제은행을 선택해 주세요.</p>
        </section>
      )}
    </>
  );
}

export default function StudyPage() {
  return (
    <AppFrame>
      <Suspense fallback={<div className="rounded-3xl bg-white p-6 text-sm font-bold text-slate-600">학습 화면을 준비하고 있습니다.</div>}>
        <StudyContent />
      </Suspense>
    </AppFrame>
  );
}
