"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, RotateCcw, Target, Trophy } from "lucide-react";
import { StatCard } from "@/components/boat/StatCard";
import { getAllQuestions, normalizeLicenseType, type LicenseType } from "@/lib/boat/questions";
import {
  readAnswerHistory,
  readExamHistory,
  readProgress,
  resetProgress,
  type AnswerHistoryRecord,
  type ExamHistoryRecord,
  type ProgressRecord
} from "@/lib/boat/storage";

type ProgressClientProps = {
  license?: string;
};

type CategoryProgress = {
  category: string;
  total: number;
  solved: number;
  percent: number;
  attempts: number;
  correct: number;
  wrong: number;
  accuracy: number;
};

function getLicenseDisplayName(licenseType: LicenseType) {
  return licenseType === "general" ? "일반조종면허" : "요트조종면허";
}

function formatDate(value?: string) {
  if (!value) return "기록 없음";
  return new Date(value).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric"
  });
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getTrend(scores: number[]) {
  if (scores.length < 2) return "기록 부족";
  const diff = scores[0] - scores[scores.length - 1];
  if (diff >= 5) return "상승 중";
  if (diff <= -5) return "하락 주의";
  return "안정권";
}

function buildCategoryProgress(progress: ProgressRecord | null, answerHistory: AnswerHistoryRecord[], licenseType: LicenseType): CategoryProgress[] {
  const questions = getAllQuestions(licenseType);
  const totals = new Map<string, number>();
  const attempts = new Map<string, { attempts: number; correct: number; wrong: number }>();

  questions.forEach((question) => {
    const category = question.category || "미분류";
    totals.set(category, (totals.get(category) ?? 0) + 1);
  });

  answerHistory.forEach((record) => {
    const category = record.category || "미분류";
    const current = attempts.get(category) ?? { attempts: 0, correct: 0, wrong: 0 };
    attempts.set(category, {
      attempts: current.attempts + 1,
      correct: current.correct + (record.correct ? 1 : 0),
      wrong: current.wrong + (record.correct ? 0 : 1)
    });
  });

  return Array.from(totals.entries())
    .map(([category, total]) => {
      const solved = progress?.categorySolved[category]?.length ?? 0;
      const history = attempts.get(category) ?? { attempts: 0, correct: 0, wrong: 0 };
      return {
        category,
        total,
        solved,
        percent: total === 0 ? 0 : Math.round((solved / total) * 100),
        ...history,
        accuracy: history.attempts === 0 ? 0 : Math.round((history.correct / history.attempts) * 100)
      };
    })
    .sort((a, b) => b.percent - a.percent || b.attempts - a.attempts || a.category.localeCompare(b.category));
}

function getMostPracticedCategory(categories: CategoryProgress[]) {
  return [...categories].sort((a, b) => b.attempts - a.attempts || b.solved - a.solved)[0];
}

function getWeakestCategory(categories: CategoryProgress[]) {
  return categories
    .filter((category) => category.attempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong || b.attempts - a.attempts)[0];
}

export function ProgressClient({ license }: ProgressClientProps) {
  const licenseType = normalizeLicenseType(license);
  const licenseLabel = getLicenseDisplayName(licenseType);
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [examHistory, setExamHistory] = useState<ExamHistoryRecord[]>([]);
  const [answerHistory, setAnswerHistory] = useState<AnswerHistoryRecord[]>([]);
  const totalQuestions = getAllQuestions(licenseType).length;

  useEffect(() => {
    setProgress(readProgress(licenseType));
    setExamHistory(readExamHistory(licenseType));
    setAnswerHistory(readAnswerHistory(licenseType));
  }, [licenseType]);

  const categoryProgress = useMemo(() => buildCategoryProgress(progress, answerHistory, licenseType), [answerHistory, licenseType, progress]);
  const recentExamScores = useMemo(() => examHistory.slice(0, 10).map((record) => record.score), [examHistory]);
  const recentAverage = useMemo(() => average(recentExamScores), [recentExamScores]);
  const trend = useMemo(() => getTrend(recentExamScores), [recentExamScores]);
  const mostPracticed = useMemo(() => getMostPracticedCategory(categoryProgress), [categoryProgress]);
  const weakest = useMemo(() => getWeakestCategory(categoryProgress), [categoryProgress]);

  const totalAttempts = answerHistory.length > 0 ? answerHistory.length : progress?.totalAttempts ?? 0;
  const correct = answerHistory.length > 0 ? answerHistory.filter((record) => record.correct).length : progress?.correctIds.length ?? 0;
  const wrong = answerHistory.length > 0 ? answerHistory.filter((record) => !record.correct).length : progress?.wrongIds.length ?? 0;
  const solved = progress?.solvedIds.length ?? 0;
  const accuracy = totalAttempts === 0 ? 0 : Math.round((correct / totalAttempts) * 100);
  const latestAnswer = answerHistory[0]?.answeredAt;
  const latestExam = examHistory[0]?.createdAt;
  const recentStudyDate = latestAnswer && latestExam ? (new Date(latestAnswer) > new Date(latestExam) ? latestAnswer : latestExam) : latestAnswer ?? latestExam;

  function clear() {
    resetProgress(licenseType);
    setProgress(readProgress(licenseType));
    setExamHistory(readExamHistory(licenseType));
    setAnswerHistory(readAnswerHistory(licenseType));
  }

  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-sky-700">
            <Trophy size={17} />
            {licenseLabel}
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">진도율 현황</h1>
        </div>
        <button type="button" className="flex min-h-11 items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm" onClick={clear}>
          <RotateCcw size={14} />
          초기화
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="총 풀이 수" value={totalAttempts} helper={`완료 ${solved}/${totalQuestions}`} icon={<Target size={20} />} />
        <StatCard label="정답 수" value={correct} helper={`${accuracy}% 정답률`} />
        <StatCard label="오답 수" value={wrong} helper="오답노트 자동 저장" />
        <StatCard label="최근 학습일" value={formatDate(recentStudyDate)} helper="문제풀이/모의고사 기준" icon={<CalendarDays size={20} />} />
      </div>

      <section className="mt-6 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-sky-700" />
          <h2 className="text-lg font-black text-slate-950">학습 상태 요약</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-sky-50 p-4">
            <p className="text-xs font-black text-sky-700">전체 정답률</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{accuracy}%</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-black text-emerald-700">최근 모의고사 평균</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{recentAverage}점</p>
          </div>
          <div className="rounded-2xl bg-cyan-50 p-4">
            <p className="text-xs font-black text-cyan-700">점수 추세</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{trend}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="text-xs font-black text-amber-700">가장 많이 푼 분야</p>
            <p className="mt-2 text-base font-black text-slate-950">{mostPracticed?.category ?? "기록 없음"}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-950">가장 취약한 카테고리</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
            {weakest ? `${weakest.category} 정답률 ${weakest.accuracy}%입니다. 이 분야의 오답 문제를 먼저 복습하면 점수 향상에 도움이 됩니다.` : "아직 오답 기록이 부족합니다. 문제를 더 풀면 취약 분야가 자동으로 표시됩니다."}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">최근 모의고사 점수 추세</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">최근 10회 평균 {recentAverage}점 · {trend}</p>
        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {recentExamScores.length === 0 ? (
            <p className="col-span-full rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">아직 저장된 모의고사 기록이 없습니다.</p>
          ) : (
            recentExamScores.map((score, index) => (
              <div key={`${score}-${index}`} className="rounded-2xl bg-sky-50 p-3 text-center">
                <p className="text-lg font-black text-sky-800">{score}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">{index + 1}회전</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">카테고리별 진도율과 정답률</h2>
        <div className="mt-4 space-y-4">
          {categoryProgress.map((category) => (
            <div key={category.category} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{category.category}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    완료 {category.solved}/{category.total} · 풀이 {category.attempts}회 · 정답률 {category.accuracy}%
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-sky-700">{category.percent}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-sky-600" style={{ width: `${category.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
