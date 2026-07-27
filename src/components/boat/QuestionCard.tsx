"use client";

import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { recordAnswer } from "@/lib/boat/storage";
import { DEFAULT_CATEGORY, DEFAULT_CATEGORY_LABEL, type Question } from "@/lib/boat/questions";
import { cn } from "@/lib/utils";

type QuestionCardProps = {
  question: Question;
  selectedIndex: number | null;
  onSelect: (index: number, correct: boolean) => void;
  questionNumber?: number;
  total?: number;
  recordProgress?: boolean;
};

const choiceLabels = ["갑", "을", "병", "정"];

function splitInlineNumberedText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!/[①②③④⑤⑥⑦⑧⑨⑩]/.test(normalized)) {
    return [normalized];
  }

  return normalized
    .split(/(?=[①②③④⑤⑥⑦⑧⑨⑩])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function QuestionCard({
  question,
  selectedIndex,
  onSelect,
  questionNumber,
  total,
  recordProgress = true
}: QuestionCardProps) {
  const answered = selectedIndex !== null;
  const isCorrect = selectedIndex === question.answer;
  const categoryLabel = question.category === DEFAULT_CATEGORY ? DEFAULT_CATEGORY_LABEL : question.category;
  const questionLines = splitInlineNumberedText(question.question);
  const explanationLines = question.explanation ? splitInlineNumberedText(question.explanation) : [];

  function select(index: number) {
    if (answered) return;

    const correct = index === question.answer;
    onSelect(index, correct);

    if (recordProgress) {
      try {
        recordAnswer(question, correct);
      } catch {
        // 저장 실패가 문제 풀이 흐름을 막지 않도록 둔다.
      }
    }
  }

  return (
    <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">{categoryLabel}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">문제 #{question.id}</span>
          </div>
        </div>
        {questionNumber && total && (
          <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
            {questionNumber}/{total}
          </span>
        )}
      </div>

      <div className="flex gap-3">
        <HelpCircle className="mt-1 shrink-0 text-sky-600" size={22} />
        <h2 className="min-w-0 space-y-2 text-lg font-black leading-7 text-slate-950">
          {questionLines.map((line, index) => (
            <span key={`${question.id}-question-line-${index}`} className="block break-keep">
              {line}
            </span>
          ))}
        </h2>
      </div>

      <div className="mt-5 space-y-2">
        {question.choices.map((choice, index) => {
          const correctOption = answered && index === question.answer;
          const wrongSelected = answered && selectedIndex === index && selectedIndex !== question.answer;

          return (
            <button
              key={`${question.id}-${index}`}
              type="button"
              className={cn(
                "relative z-0 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition",
                !answered && "border-slate-200 bg-white hover:border-sky-400 hover:bg-sky-50",
                correctOption && "border-emerald-300 bg-emerald-50 text-emerald-800",
                wrongSelected && "border-rose-300 bg-rose-50 text-rose-800",
                answered && !correctOption && !wrongSelected && "border-slate-100 bg-slate-50 text-slate-500"
              )}
              onClick={() => select(index)}
              disabled={answered}
              aria-pressed={selectedIndex === index}
            >
              <span className="flex min-w-0 gap-2">
                <span className="shrink-0 font-black text-sky-700">{choiceLabels[index]}</span>
                <span className="leading-6 break-keep">{choice}</span>
              </span>
              {correctOption && <CheckCircle2 className="shrink-0" size={18} />}
              {wrongSelected && <XCircle className="shrink-0" size={18} />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-5 rounded-2xl bg-sky-50 p-4">
          <p className={cn("text-sm font-black", isCorrect ? "text-emerald-700" : "text-rose-700")}>
            {isCorrect ? "정답" : "오답"}
          </p>
          {explanationLines.length > 0 ? (
            <div className="mt-2 space-y-1 text-sm font-medium leading-6 text-slate-700">
              {explanationLines.map((line, index) => (
                <p key={`${question.id}-explanation-line-${index}`} className="break-keep">
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">등록된 해설이 없습니다.</p>
          )}
        </div>
      )}
    </section>
  );
}
