"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Percent, RotateCcw } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { QuestionCard } from "@/components/boat/QuestionCard";
import { StatCard } from "@/components/boat/StatCard";
import { getLicenseLabel, getRandomQuestions, getTotalQuestionCount, normalizeLicenseType, type Question } from "@/lib/boat/questions";

function RandomContent() {
  const searchParams = useSearchParams();
  const licenseType = normalizeLicenseType(searchParams.get("license"));
  const licenseLabel = getLicenseLabel(licenseType);
  const totalQuestions = getTotalQuestionCount(licenseType);
  const [orderIndex, setOrderIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [solved, setSolved] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [randomOrder, setRandomOrder] = useState<Question[]>([]);
  const question = randomOrder.length > 0 ? randomOrder[orderIndex % randomOrder.length] : undefined;
  const accuracy = solved === 0 ? 0 : Math.round((correct / solved) * 100);

  useEffect(() => {
    setRandomOrder(getRandomQuestions(licenseType, totalQuestions));
    setOrderIndex(0);
    setSolved(0);
    setCorrect(0);
    setSelected(null);
  }, [licenseType, totalQuestions]);

  function answer(answerIndex: number, correctAnswer: boolean) {
    setSelected(answerIndex);
    setSolved((value) => value + 1);
    if (correctAnswer) setCorrect((value) => value + 1);
  }

  function next() {
    setOrderIndex((value) => value + 1);
    setSelected(null);
  }

  function restart() {
    setRandomOrder(getRandomQuestions(licenseType, totalQuestions));
    setOrderIndex(0);
    setSolved(0);
    setCorrect(0);
    setSelected(null);
  }

  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-sky-700">
            <RotateCcw size={17} />
            {licenseLabel}
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{totalQuestions}문항에서 랜덤 풀이</h1>
        </div>
        <button type="button" className="rounded-full bg-white px-3 py-2 text-xs font-black text-sky-700" onClick={restart}>
          새로 섞기
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard label="푼 문제" value={solved} helper={`${totalQuestions}문항 중`} />
        <StatCard label="정답률" value={`${accuracy}%`} icon={<Percent size={20} />} />
      </div>

      {question ? (
        <>
          <QuestionCard question={question} selectedIndex={selected} onSelect={answer} />
          {selected !== null && (
            <button
              type="button"
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 font-black text-white shadow-sm"
              onClick={next}
            >
              다음 랜덤 문제
              <ArrowRight size={18} />
            </button>
          )}
        </>
      ) : (
        <section className="rounded-3xl border border-sky-100 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">문제은행이 비어 있습니다.</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">다른 면허 문제은행을 선택해 주세요.</p>
        </section>
      )}
    </>
  );
}

export default function RandomPage() {
  return (
    <AppFrame>
      <Suspense fallback={<div className="rounded-3xl bg-white p-6 text-sm font-bold text-slate-600">랜덤 문제를 준비하고 있습니다.</div>}>
        <RandomContent />
      </Suspense>
    </AppFrame>
  );
}
