"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NotebookTabs, Trash2 } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { QuestionCard } from "@/components/boat/QuestionCard";
import { getLicenseLabel, normalizeLicenseType, type Question } from "@/lib/boat/questions";
import { readWrongQuestions, removeWrongQuestion } from "@/lib/boat/storage";

function WrongContent() {
  const searchParams = useSearchParams();
  const licenseType = normalizeLicenseType(searchParams.get("license"));
  const licenseLabel = getLicenseLabel(licenseType);
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const question = wrongQuestions[index];

  const refresh = useCallback(() => {
    const next = readWrongQuestions(licenseType);
    setWrongQuestions(next);
    setIndex((current) => Math.min(current, Math.max(next.length - 1, 0)));
  }, [licenseType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function removeCurrent() {
    if (!question) return;
    removeWrongQuestion(question.id, licenseType);
    setSelected(null);
    refresh();
  }

  function next() {
    setSelected(null);
    const nextQuestions = readWrongQuestions(licenseType);
    setWrongQuestions(nextQuestions);
    setIndex((current) => (nextQuestions.length === 0 ? 0 : (current + 1) % nextQuestions.length));
  }

  return (
    <>
      <div className="mb-5">
        <p className="flex items-center gap-2 text-sm font-black text-sky-700">
          <NotebookTabs size={17} />
          {licenseLabel}
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">오답노트</h1>
      </div>

      {!question ? (
        <section className="rounded-3xl border border-sky-100 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">아직 저장된 오답이 없습니다.</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            학습 중 틀린 문항은 면허 종류별 오답노트에 자동 저장됩니다.
          </p>
        </section>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600">
              {index + 1}/{wrongQuestions.length}
            </span>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"
              onClick={removeCurrent}
            >
              <Trash2 size={14} />
              삭제
            </button>
          </div>
          <QuestionCard question={question} selectedIndex={selected} onSelect={(answerIndex) => setSelected(answerIndex)} />
          {selected !== null && (
            <button type="button" className="mt-4 h-12 w-full rounded-2xl bg-sky-700 font-black text-white" onClick={next}>
              {wrongQuestions.length > 1 ? "다음 오답" : "목록 갱신"}
            </button>
          )}
        </>
      )}
    </>
  );
}

export default function WrongPage() {
  return (
    <AppFrame>
      <Suspense fallback={<div className="rounded-3xl bg-white p-6 text-sm font-bold text-slate-600">오답노트를 불러오고 있습니다.</div>}>
        <WrongContent />
      </Suspense>
    </AppFrame>
  );
}
