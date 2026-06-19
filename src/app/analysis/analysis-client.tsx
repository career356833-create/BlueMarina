"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookOpenCheck, LineChart, Target, Trophy } from "lucide-react";
import { AnalysisAd } from "@/components/ads/AnalysisAd";
import { StatCard } from "@/components/boat/StatCard";
import { getAllQuestions, getQuestionById, getQuestionsByTag, normalizeLicenseType, type LicenseType, type Question } from "@/lib/boat/questions";
import {
  readAnswerHistory,
  readExamHistory,
  readProgress,
  type AnswerHistoryRecord,
  type ExamHistoryRecord,
  type ProgressRecord
} from "@/lib/boat/storage";
import { hasTheoryForTag } from "@/lib/boat/theory";
import { analyzeWeaknessByTags } from "@/lib/boat/weakness";

type AnalysisClientProps = {
  license?: string;
};

type CategoryAccuracy = {
  category: string;
  attempts: number;
  correct: number;
  wrong: number;
  accuracy: number;
};

function getLicenseDisplayName(licenseType: LicenseType) {
  return licenseType === "general" ? "일반조종면허" : "요트조종면허";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getPassLevel(rate: number) {
  if (rate >= 90) return "매우 높음";
  if (rate >= 75) return "높음";
  if (rate >= 55) return "보통";
  if (rate >= 35) return "주의";
  return "위험";
}

function calculatePassRate(recentAverage: number, passScore: number, trend: number) {
  if (recentAverage === 0) return 0;
  const distance = recentAverage - passScore;
  const base = 50 + distance * 4 + trend * 2;
  return Math.min(98, Math.max(5, Math.round(base)));
}

function getTrend(scores: number[]) {
  if (scores.length < 2) return { label: "기록 부족", value: 0 };
  const latest = scores[0];
  const oldest = scores[scores.length - 1];
  const diff = latest - oldest;
  if (diff >= 5) return { label: "상승", value: diff };
  if (diff <= -5) return { label: "하락", value: diff };
  return { label: "유지", value: diff };
}

function getCategoryAccuracy(answerHistory: AnswerHistoryRecord[]): CategoryAccuracy[] {
  const bucket = new Map<string, { attempts: number; correct: number; wrong: number }>();

  answerHistory.forEach((record) => {
    const category = record.category || "미분류";
    const current = bucket.get(category) ?? { attempts: 0, correct: 0, wrong: 0 };
    bucket.set(category, {
      attempts: current.attempts + 1,
      correct: current.correct + (record.correct ? 1 : 0),
      wrong: current.wrong + (record.correct ? 0 : 1)
    });
  });

  return Array.from(bucket.entries())
    .map(([category, value]) => ({
      category,
      ...value,
      accuracy: value.attempts === 0 ? 0 : Math.round((value.correct / value.attempts) * 100)
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong || b.attempts - a.attempts);
}

function getRecommendedQuestions(answerHistory: AnswerHistoryRecord[], licenseType: LicenseType, primaryTag?: string) {
  const wrongIds = answerHistory.filter((record) => !record.correct).map((record) => record.questionId);
  const uniqueWrong = Array.from(new Set(wrongIds))
    .map((id) => getQuestionById(id, licenseType))
    .filter((question): question is Question => Boolean(question))
    .slice(0, 10);

  if (uniqueWrong.length > 0) return uniqueWrong;
  if (primaryTag) return getQuestionsByTag(licenseType, primaryTag).slice(0, 10);
  return [];
}

function buildStudyStatus(recentAverage: number, trendLabel: string, weakestCategory?: CategoryAccuracy) {
  if (recentAverage === 0) return "모의고사를 1회 이상 풀면 합격 가능성과 학습 상태가 더 정확해집니다.";

  const passMessage = recentAverage >= 70 ? "1급 합격권 진입" : recentAverage >= 60 ? "2급 합격권, 1급은 추가 학습 필요" : "합격권 진입 전";
  const trendMessage = trendLabel === "상승" ? "꾸준히 상승 중" : trendLabel === "하락" ? "최근 점수 하락 주의" : "최근 점수 안정권";
  const weakMessage = weakestCategory ? `${weakestCategory.category} 복습 권장` : "오답 기록을 더 쌓으면 취약 분야가 표시됩니다.";

  return `${trendMessage} · 최근 10회 평균 ${recentAverage}점 · ${passMessage} · ${weakMessage}`;
}

export function AnalysisClient({ license }: AnalysisClientProps) {
  const licenseType = normalizeLicenseType(license);
  const licenseLabel = getLicenseDisplayName(licenseType);
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [examHistory, setExamHistory] = useState<ExamHistoryRecord[]>([]);
  const [answerHistory, setAnswerHistory] = useState<AnswerHistoryRecord[]>([]);

  useEffect(() => {
    setProgress(readProgress(licenseType));
    setExamHistory(readExamHistory(licenseType));
    setAnswerHistory(readAnswerHistory(licenseType));
  }, [licenseType]);

  const recentExamScores = useMemo(() => examHistory.slice(0, 10).map((record) => record.score), [examHistory]);
  const recentAverage = useMemo(() => average(recentExamScores), [recentExamScores]);
  const trend = useMemo(() => getTrend(recentExamScores), [recentExamScores]);
  const categoryAccuracy = useMemo(() => getCategoryAccuracy(answerHistory), [answerHistory]);
  const weakCategories = categoryAccuracy.slice(0, 5);
  const tagAnalysis = useMemo(() => analyzeWeaknessByTags(answerHistory), [answerHistory]);
  const topTags = tagAnalysis.items.slice(0, 5);
  const primaryTag = topTags[0]?.label;
  const recommendedQuestions = useMemo(() => getRecommendedQuestions(answerHistory, licenseType, primaryTag), [answerHistory, licenseType, primaryTag]);
  const totalAttempts = answerHistory.length > 0 ? answerHistory.length : progress?.totalAttempts ?? 0;
  const correct = answerHistory.length > 0 ? answerHistory.filter((record) => record.correct).length : progress?.correctIds.length ?? 0;
  const wrong = answerHistory.length > 0 ? answerHistory.filter((record) => !record.correct).length : progress?.wrongIds.length ?? 0;
  const accuracy = totalAttempts === 0 ? 0 : Math.round((correct / totalAttempts) * 100);
  const grade1PassRate = calculatePassRate(recentAverage, 70, trend.value);
  const grade2PassRate = calculatePassRate(recentAverage, 60, trend.value);
  const studyStatus = buildStudyStatus(recentAverage, trend.label, weakCategories[0]);
  const allQuestions = useMemo(() => getAllQuestions(licenseType), [licenseType]);

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
        <StatCard label="전체 풀이" value={totalAttempts} icon={<BookOpenCheck size={20} />} />
        <StatCard label="정답" value={correct} helper={`${accuracy}% 정답률`} />
        <StatCard label="오답" value={wrong} />
        <StatCard label="최근 평균" value={`${recentAverage}점`} helper={`최근 ${recentExamScores.length}회 기준`} icon={<Trophy size={20} />} />
      </div>

      <section className="mt-5 rounded-3xl bg-slate-950 p-5 text-white shadow-lg">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-cyan-200">합격 예측</p>
            <h2 className="mt-2 text-3xl font-black">예상 점수 {recentAverage}점</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{studyStatus}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-black text-cyan-100">1급 예상 합격률</p>
              <p className="mt-2 text-3xl font-black">{grade1PassRate}%</p>
              <p className="mt-1 text-xs font-bold text-slate-300">{getPassLevel(grade1PassRate)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs font-black text-cyan-100">2급 예상 합격률</p>
              <p className="mt-2 text-3xl font-black">{grade2PassRate}%</p>
              <p className="mt-1 text-xs font-bold text-slate-300">{getPassLevel(grade2PassRate)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <LineChart size={20} className="text-sky-700" />
          <h2 className="text-lg font-black text-slate-950">최근 모의고사 점수 추세</h2>
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-500">최근 10회 평균 {recentAverage}점 · 추세 {trend.label}</p>
        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {recentExamScores.length === 0 ? (
            <p className="col-span-full rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">아직 모의고사 기록이 없습니다.</p>
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

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">카테고리별 정답률</h2>
          <div className="mt-4 space-y-3">
            {categoryAccuracy.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">문제를 풀면 카테고리별 정답률이 표시됩니다.</p>
            ) : (
              categoryAccuracy.map((item) => (
                <div key={item.category} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-950">{item.category}</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">{item.accuracy}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-sky-600" style={{ width: `${item.accuracy}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    정답 {item.correct} · 오답 {item.wrong} · 풀이 {item.attempts}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">취약 분야 TOP5</h2>
          <div className="mt-4 space-y-3">
            {weakCategories.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">오답 기록이 쌓이면 취약 분야가 표시됩니다.</p>
            ) : (
              weakCategories.map((item, index) => (
                <div key={item.category} className="rounded-2xl bg-rose-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-950">
                      {index + 1}. {item.category}
                    </p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-700">정답률 {item.accuracy}%</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {item.wrong}/{item.attempts} 오답 · 관련 문항 {allQuestions.filter((question) => question.category === item.category).length}개
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Target className="mt-1 shrink-0 text-sky-600" size={22} />
          <div>
            <h2 className="text-lg font-black text-slate-950">추천 복습 문제</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              오답 기록을 우선으로 최대 10문항을 추천합니다. 취약 태그가 있으면 태그 복습으로 이어집니다.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {recommendedQuestions.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">추천할 오답 문제가 아직 없습니다.</p>
          ) : (
            recommendedQuestions.map((question) => (
              <div key={question.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-black text-sky-700">#{question.id}</p>
                <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-800">{question.question}</p>
              </div>
            ))
          )}
        </div>

        <Link
          href={primaryTag ? `/study?license=${licenseType}&tag=${encodeURIComponent(primaryTag)}` : `/random?license=${licenseType}`}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-black text-white shadow-sm"
        >
          복습 시작
          <ArrowRight size={18} />
        </Link>
      </section>

      <section className="mt-5 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">취약 태그 TOP5</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {topTags.length === 0 ? (
            <p className="w-full rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">문제를 풀면 태그별 취약점이 표시됩니다.</p>
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

      <AnalysisAd />
    </>
  );
}
