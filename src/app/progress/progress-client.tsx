"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, RotateCcw, Target, Trophy } from "lucide-react";
import { StatCard } from "@/components/boat/StatCard";
import { categories, getAllQuestions, getLicenseLabel, getTotalQuestionCount, normalizeLicenseType } from "@/lib/boat/questions";
import { getExamScoreStats, predictPass } from "@/lib/boat/prediction";
import { readExamHistory, readProgress, resetProgress, type ExamHistoryRecord, type ProgressRecord } from "@/lib/boat/storage";
import { getTopWeakTags } from "@/lib/boat/weakness";

type ProgressClientProps = {
  license?: string;
};

export function ProgressClient({ license }: ProgressClientProps) {
  const licenseType = normalizeLicenseType(license);
  const licenseLabel = getLicenseLabel(licenseType);
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [examHistory, setExamHistory] = useState<ExamHistoryRecord[]>([]);
  const [weakTags, setWeakTags] = useState<string[]>([]);
  const totalQuestions = getTotalQuestionCount(licenseType);

  useEffect(() => {
    setProgress(readProgress(licenseType));
    setExamHistory(readExamHistory(licenseType));
    setWeakTags(getTopWeakTags(5, licenseType).items.map((item) => item.label));
  }, [licenseType]);

  const stats = useMemo(() => {
    const totalAttempts = progress?.totalAttempts ?? 0;
    const solved = progress?.solvedIds.length ?? 0;
    const correct = progress?.correctIds.length ?? 0;
    const wrong = progress?.wrongIds.length ?? 0;
    const accuracy = solved === 0 ? 0 : Math.round((correct / solved) * 100);
    return { totalAttempts, solved, correct, wrong, accuracy };
  }, [progress]);

  const examStats = useMemo(() => getExamScoreStats(examHistory), [examHistory]);
  const prediction = useMemo(() => predictPass(examHistory, weakTags), [examHistory, weakTags]);

  function clear() {
    resetProgress(licenseType);
    setProgress(readProgress(licenseType));
    setExamHistory(readExamHistory(licenseType));
    setWeakTags(getTopWeakTags(5, licenseType).items.map((item) => item.label));
  }

  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-sky-700">
            <Trophy size={17} />
            {licenseLabel}
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">내 학습 현황</h1>
        </div>
        <button type="button" className="flex min-h-11 items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600" onClick={clear}>
          <RotateCcw size={14} />
          초기화
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="전체 풀이 수" value={stats.totalAttempts} helper={`완료 ${stats.solved}/${totalQuestions}`} icon={<Target size={20} />} />
        <StatCard label="정답 수" value={stats.correct} helper={`${stats.accuracy}% 정답률`} />
        <StatCard label="오답 수" value={stats.wrong} helper="오답노트 자동 저장" />
        <StatCard label="정답률" value={`${stats.accuracy}%`} helper="고유 문항 기준" />
      </div>

      <section className="mt-6 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-sky-700">
              <BarChart3 size={17} />
              합격예측
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">예상 점수 {prediction.expectedScore}점</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">최근 모의고사 5회 기준 단순 예측</p>
          </div>
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-slate-950 text-white">
            <span className="text-2xl font-black">{prediction.passRate}%</span>
            <span className="text-[10px] font-bold text-cyan-200">합격률</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-sky-50 p-3">
            <p className="text-lg font-black text-sky-800">{examStats.recent}점</p>
            <p className="text-xs font-bold text-slate-500">최근 점수</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3">
            <p className="text-lg font-black text-emerald-800">{examStats.best}점</p>
            <p className="text-xs font-bold text-slate-500">최고 점수</p>
          </div>
          <div className="rounded-2xl bg-cyan-50 p-3">
            <p className="text-lg font-black text-cyan-800">{examStats.average}점</p>
            <p className="text-xs font-bold text-slate-500">평균 점수</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-black text-slate-950">카테고리별 진행률</h2>
        <div className="mt-4 space-y-4">
          {categories.map((category) => {
            const total = category === "전체" ? totalQuestions : getAllQuestions(licenseType).filter((question) => question.category === category).length;
            const solved = progress?.categorySolved[category]?.length ?? 0;
            const percent = total === 0 ? 0 : Math.round((solved / total) * 100);
            const label = category === "전체" ? "전체 문제은행" : category;

            return (
              <div key={category}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-black text-slate-800">{label}</p>
                  <p className="text-xs font-bold text-slate-500">
                    {solved}/{total} · {percent}%
                  </p>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-sky-600" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-black text-slate-950">모의고사 기록</h2>
        <div className="mt-4 space-y-3">
          {examHistory.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">아직 저장된 모의고사 기록이 없습니다.</p>
          ) : (
            examHistory.slice(0, 5).map((record) => (
              <div key={record.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-black text-slate-900">{record.score}점</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    정답 {record.correct}/{record.total} · {new Date(record.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${record.secondClassPassed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {record.firstClassPassed ? "1급 가능" : record.secondClassPassed ? "2급 가능" : "학습 필요"}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
