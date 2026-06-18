"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList, RotateCcw } from "lucide-react";
import { ResultAd } from "@/components/ads/ResultAd";
import { AppFrame } from "@/components/boat/AppFrame";
import { QuestionCard } from "@/components/boat/QuestionCard";
import { pickMockExamQuestions, scoreExam } from "@/lib/boat/exam";
import { getLicenseLabel, normalizeLicenseType, type Question } from "@/lib/boat/questions";
import { recordAnswer, saveExamHistory } from "@/lib/boat/storage";

type ExamAnswer = {
  question: Question;
  selectedIndex: number;
  correct: boolean;
};

function ExamContent() {
  const searchParams = useSearchParams();
  const licenseType = normalizeLicenseType(searchParams.get("license"));
  const licenseLabel = getLicenseLabel(licenseType);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);
  const result = scoreExam(examQuestions.length, answers.filter((answer) => answer.correct).length);
  const question = examQuestions[index];

  useEffect(() => {
    setExamQuestions(pickMockExamQuestions(licenseType, 50));
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setSubmitted(false);
    setHistorySaved(false);
  }, [licenseType]);

  function answer(selectedIndex: number, correct: boolean) {
    if (!question) return;
    setSelected(selectedIndex);
    setAnswers((current) => {
      if (current.some((item) => item.question.id === question.id)) return current;
      return [...current, { question, selectedIndex, correct }];
    });
  }

  function next() {
    if (!question) return;
    if (selected !== null) recordAnswer(question, selected === question.answer);
    setSelected(null);
    setIndex((current) => Math.min(current + 1, examQuestions.length - 1));
  }

  function submitExam() {
    if (!question) return;
    if (selected !== null) recordAnswer(question, selected === question.answer);
    if (!historySaved) {
      saveExamHistory(
        {
          total: examQuestions.length,
          correct: answers.filter((answer) => answer.correct).length,
          score: result.score,
          firstClassPassed: result.firstClassPassed,
          secondClassPassed: result.secondClassPassed
        },
        licenseType
      );
      setHistorySaved(true);
    }
    setSubmitted(true);
  }

  function restart() {
    setExamQuestions(pickMockExamQuestions(licenseType, 50));
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setSubmitted(false);
    setHistorySaved(false);
  }

  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-sky-700">
            <ClipboardList size={17} />
            {licenseLabel}
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">50문항 실전 모의고사</h1>
        </div>
        <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600">1급 70점 / 2급 60점</span>
      </div>

      {examQuestions.length === 0 ? (
        <section className="rounded-3xl border border-sky-100 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">문제은행이 비어 있습니다.</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">다른 면허 문제은행을 선택해 주세요.</p>
        </section>
      ) : !submitted && question ? (
        <>
          <QuestionCard
            question={question}
            selectedIndex={selected}
            onSelect={answer}
            questionNumber={index + 1}
            total={examQuestions.length}
            recordProgress={false}
            debugMode="exam"
          />
          {selected !== null && (
            <button
              type="button"
              className="mt-4 h-12 w-full rounded-2xl bg-sky-700 font-black text-white shadow-sm"
              onClick={index + 1 === examQuestions.length ? submitExam : next}
            >
              {index + 1 === examQuestions.length ? "제출하고 결과 보기" : "다음 문제"}
            </button>
          )}
        </>
      ) : (
        <>
          <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
            <p className={`text-sm font-black ${result.secondClassPassed ? "text-emerald-700" : "text-rose-700"}`}>{result.label}</p>
            <h2 className="mt-2 text-5xl font-black text-slate-950">{result.score}점</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              정답 {answers.filter((answer) => answer.correct).length}개 / 총 {examQuestions.length}문제
            </p>
            <div className="mt-3 flex gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black ${result.firstClassPassed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                1급 {result.firstClassPassed ? "합격 가능" : "미달"}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${result.secondClassPassed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                2급 {result.secondClassPassed ? "합격 가능" : "미달"}
              </span>
            </div>

            <div className="mt-6">
              <h3 className="text-base font-black text-slate-950">틀린 문제</h3>
              <div className="mt-3 space-y-3">
                {answers.filter((answer) => !answer.correct).length === 0 ? (
                  <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">틀린 문제가 없습니다.</p>
                ) : (
                  answers
                    .filter((answer) => !answer.correct)
                    .map((answer) => (
                      <div key={answer.question.id} className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm font-black text-slate-900">{answer.question.question}</p>
                        <p className="mt-2 text-xs font-semibold text-rose-700">
                          선택: {answer.question.choices[answer.selectedIndex]} / 정답: {answer.question.choices[answer.question.answer]}
                        </p>
                      </div>
                    ))
                )}
              </div>
            </div>

            <button
              type="button"
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 font-black text-white"
              onClick={restart}
            >
              <RotateCcw size={18} />
              다시 응시
            </button>
          </section>
          <ResultAd />
        </>
      )}
    </>
  );
}

export default function ExamPage() {
  return (
    <AppFrame>
      <Suspense fallback={<div className="rounded-3xl bg-white p-6 text-sm font-bold text-slate-600">모의고사를 준비하고 있습니다.</div>}>
        <ExamContent />
      </Suspense>
    </AppFrame>
  );
}
