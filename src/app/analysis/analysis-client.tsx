"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookOpenCheck, Target, Trophy } from "lucide-react";
import { AnalysisAd } from "@/components/ads/AnalysisAd";
import { StatCard } from "@/components/boat/StatCard";
import { getLicenseLabel, getQuestionsByTag, normalizeLicenseType } from "@/lib/boat/questions";
import { getExamScoreStats, predictPass } from "@/lib/boat/prediction";
import {
  readAnswerHistory,
  readExamHistory,
  readProgress,
  type AnswerHistoryRecord,
  type ExamHistoryRecord,
  type ProgressRecord
} from "@/lib/boat/storage";
import { hasTheoryForTag } from "@/lib/boat/theory";
import { analyzeWeaknessByCategory, analyzeWeaknessByTags } from "@/lib/boat/weakness";

type AnalysisClientProps = {
  license?: string;
};

export function AnalysisClient({ license }: AnalysisClientProps) {
  const licenseType = normalizeLicenseType(license);
  const licenseLabel = getLicenseLabel(licenseType);
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [examHistory, setExamHistory] = useState<ExamHistoryRecord[]>([]);
  const [answerHistory, setAnswerHistory] = useState<AnswerHistoryRecord[]>([]);

  useEffect(() => {
    setProgress(readProgress(licenseType));
    setExamHistory(readExamHistory(licenseType));
    setAnswerHistory(readAnswerHistory(licenseType));
  }, [licenseType]);

  const categoryAnalysis = useMemo(() => analyzeWeaknessByCategory(answerHistory), [answerHistory]);
  const tagAnalysis = useMemo(() => analyzeWeaknessByTags(answerHistory), [answerHistory]);
  const topCategories = categoryAnalysis.items.slice(0, 5);
  const topTags = tagAnalysis.items.slice(0, 5);
  const primaryTag = topTags[0]?.label;
  const recommendedQuestions = useMemo(
    () => (primaryTag ? getQuestionsByTag(licenseType, primaryTag).slice(0, 10) : []),
    [licenseType, primaryTag]
  );
  const examStats = useMemo(() => getExamScoreStats(examHistory), [examHistory]);
  const prediction = useMemo(() => predictPass(examHistory, topTags.map((item) => item.label)), [examHistory, topTags]);
  const solved = progress?.solvedIds.length ?? 0;
  const correct = progress?.correctIds.length ?? 0;
  const wrong = progress?.wrongIds.length ?? 0;
  const totalAttempts = progress?.totalAttempts ?? 0;
  const accuracy = solved === 0 ? 0 : Math.round((correct / solved) * 100);

  return (
    <>
      <div className="mb-5">
        <p className="flex items-center gap-2 text-sm font-black text-sky-700">
          <BarChart3 size={17} />
          {licenseLabel}
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">학습 분석 리포트</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="전체 풀이 수" value={totalAttempts} icon={<BookOpenCheck size={20} />} />
        <StatCard label="정답 수" value={correct} helper={`${accuracy}% 정답률`} />
        <StatCard label="오답 수" value={wrong} />
        <StatCard label="최근 평균" value={`${prediction.recentAverageScore}점`} helper={`최고 ${examStats.best}점`} icon={<Trophy size={20} />} />
      </div>

      <section className="mt-5 rounded-3xl bg-slate-950 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-cyan-200">합격예측</p>
            <h2 className="mt-2 text-4xl font-black">{prediction.passRate}%</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
              예상 점수 {prediction.expectedScore}점 · {prediction.message}
            </p>
          </div>
          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-8 border-cyan-300/30 bg-cyan-300/10">
            <span className="text-sm font-black text-cyan-100">1급</span>
            <span className="text-xs font-bold text-slate-300">{prediction.grade1PassRisk}</span>
            <span className="mt-1 text-sm font-black text-cyan-100">2급</span>
            <span className="text-xs font-bold text-slate-300">{prediction.grade2PassRisk}</span>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">취약 카테고리 TOP5</h2>
          <div className="mt-4 space-y-3">
            {topCategories.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">문제를 더 풀면 카테고리별 약점이 표시됩니다.</p>
            ) : (
              topCategories.map((item, index) => (
                <div key={item.key} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-950">
                      {index + 1}. {item.label}
                    </p>
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">오답률 {item.wrongRate}%</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {item.wrong}/{item.attempts} 오답
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">취약 태그 TOP5</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {topTags.length === 0 ? (
              <p className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">문제를 더 풀면 태그별 약점이 표시됩니다.</p>
            ) : (
              topTags.map((item) => (
                <Link
                  key={item.key}
                  href={
                    hasTheoryForTag(item.label)
                      ? `/theory/${encodeURIComponent(item.label)}?license=${licenseType}`
                      : `/study?license=${licenseType}&tag=${encodeURIComponent(item.label)}`
                  }
                  className="rounded-2xl bg-sky-50 px-4 py-3 transition hover:bg-sky-100"
                >
                  <p className="text-sm font-black text-sky-800">#{item.label}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">오답률 {item.wrongRate}%</p>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Target className="mt-1 shrink-0 text-sky-600" size={22} />
          <div>
            <h2 className="text-lg font-black text-slate-950">추천 복습</h2>
            {topTags.length === 0 ? (
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                아직 충분한 풀이 기록이 없습니다. 랜덤 풀이 또는 모의고사를 진행하면 맞춤 복습이 열립니다.
              </p>
            ) : (
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                {topTags.slice(0, 2).map((item) => item.label).join(", ")} 개념이 취약합니다. 해당 문제를 복습하면 약 5~8점 향상이 예상됩니다.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {recommendedQuestions.slice(0, 10).map((question) => (
            <div key={question.id} className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-black text-sky-700">#{question.id}</p>
              <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-800">{question.question}</p>
            </div>
          ))}
        </div>

        <Link
          href={primaryTag ? `/study?license=${licenseType}&tag=${encodeURIComponent(primaryTag)}` : `/random?license=${licenseType}`}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-black text-white shadow-sm"
        >
          복습 시작
          <ArrowRight size={18} />
        </Link>
      </section>

      <AnalysisAd />
    </>
  );
}
