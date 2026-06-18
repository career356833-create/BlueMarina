"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  FileText,
  ListChecks,
  Tag
} from "lucide-react";
import { BannerAd } from "@/components/ads/BannerAd";
import { AppFrame } from "@/components/boat/AppFrame";
import { getLicenseLabel, normalizeLicenseType, type LicenseType } from "@/lib/boat/questions";
import { getRelatedQuestionsForTheory, getTheoryByTag } from "@/lib/boat/theory";
import type { TheoryItem } from "@/data/theories";

const statusLabel: Record<TheoryItem["status"], string> = {
  ready: "콘텐츠 준비됨",
  draft: "초안 준비중",
  "coming-soon": "준비중"
};

function SectionCard({
  title,
  icon,
  children
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">{icon}</div>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyList({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-4 text-sm font-semibold leading-6 text-slate-500">
      {label}은 이론 콘텐츠 작성 후 채워집니다.
    </div>
  );
}

function LicenseButton({ current, licenseType, tag, enabled }: { current: LicenseType; licenseType: LicenseType; tag: string; enabled: boolean }) {
  if (!enabled) {
    return (
      <span className="flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-400">
        {getLicenseLabel(licenseType)}
      </span>
    );
  }

  return (
    <Link
      href={`/theory/${encodeURIComponent(tag)}?license=${licenseType}`}
      className={`flex min-h-11 flex-1 items-center justify-center rounded-2xl px-4 text-sm font-black transition ${
        current === licenseType ? "bg-sky-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-sky-50"
      }`}
    >
      {getLicenseLabel(licenseType)}
    </Link>
  );
}

export default function TheoryDetailPage() {
  const params = useParams<{ tag: string }>();
  const searchParams = useSearchParams();
  const licenseType = normalizeLicenseType(searchParams.get("license"));
  const requestedTag = decodeURIComponent(params.tag);
  const theory = getTheoryByTag(params.tag);
  const displayTitle = theory?.title ?? requestedTag;
  const status = theory?.status ?? "coming-soon";
  const relatedQuestions = theory ? getRelatedQuestionsForTheory(theory, licenseType) : [];
  const studyTag = theory?.subTags?.includes(requestedTag) ? requestedTag : theory?.subTags?.[0] ?? theory?.tag;
  const relatedHref = studyTag ? `/study?license=${licenseType}&tag=${encodeURIComponent(studyTag)}` : `/study?license=${licenseType}`;
  const relatedTags = theory?.subTags ?? [];
  const isReady = Boolean(theory?.content);

  return (
    <AppFrame>
      <div className="space-y-5">
        <Link href="/theory" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-slate-600 shadow-sm">
          <ArrowLeft size={16} />
          이론 목록
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-sm">
          <div className="bg-[linear-gradient(135deg,#0f2d52_0%,#075985_58%,#0ea5e9_100%)] p-5 text-white sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-black text-cyan-100">{theory?.category ?? "이론학습"}</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{displayTitle}</h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-sky-50">
                  {theory?.summary || "이론 콘텐츠 준비중입니다."}
                </p>
              </div>
              <span className="w-fit rounded-full bg-white/15 px-3 py-2 text-xs font-black text-white ring-1 ring-white/20">
                {statusLabel[status]}
              </span>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-500">적용 면허</p>
              <p className="mt-2 text-sm font-black text-slate-950">
                {theory?.licenseTypes.map((item) => getLicenseLabel(item)).join(" / ") ?? getLicenseLabel(licenseType)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-500">현재 보기</p>
              <p className="mt-2 text-sm font-black text-slate-950">{getLicenseLabel(licenseType)}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-xs font-black text-sky-700">관련 문항 수</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{relatedQuestions.length}문항</p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-sky-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-black text-slate-700">면허 선택</p>
          <div className="flex gap-2">
            <LicenseButton current={licenseType} licenseType="general" tag={displayTitle} enabled={Boolean(theory?.licenseTypes.includes("general"))} />
            <LicenseButton current={licenseType} licenseType="yacht" tag={displayTitle} enabled={Boolean(theory?.licenseTypes.includes("yacht"))} />
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="space-y-5">
            <SectionCard title="핵심 요약" icon={<FileText size={22} />}>
              {isReady ? (
                <p className="text-base font-semibold leading-8 text-slate-700">{theory?.summary}</p>
              ) : (
                <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-5">
                  <p className="text-base font-black text-slate-800">이론 콘텐츠 준비중</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    현재는 이론 주제, 관련 태그, 관련 문항 연결 구조만 제공합니다. 실제 이론 본문은 검증 후 동일한 형식으로 추가됩니다.
                  </p>
                </div>
              )}
            </SectionCard>

            <SectionCard title="이론 본문" icon={<BookOpenCheck size={22} />}>
              {theory?.content ? (
                <article className="prose prose-slate max-w-none whitespace-pre-line text-base font-semibold leading-8 text-slate-700">{theory.content}</article>
              ) : (
                <EmptyList label="이론 본문" />
              )}
            </SectionCard>

            <BannerAd label="이론학습 광고 영역" size="wide" />

            <SectionCard title="관련 태그" icon={<Tag size={22} />}>
              {relatedTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {relatedTags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/study?license=${licenseType}&tag=${encodeURIComponent(tag)}`}
                      className="rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-100"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyList label="관련 태그" />
              )}
            </SectionCard>
          </div>

          <aside className="space-y-5">
            <SectionCard title="시험에 나오는 포인트" icon={<ListChecks size={22} />}>
              {theory && theory.examPoints.length > 0 ? (
                <div className="space-y-3">
                  {theory.examPoints.map((point) => (
                    <p key={point} className="rounded-2xl bg-sky-50 p-4 text-sm font-semibold leading-6 text-slate-600">
                      {point}
                    </p>
                  ))}
                </div>
              ) : (
                <EmptyList label="시험 포인트" />
              )}
            </SectionCard>

            <SectionCard title="자주 틀리는 부분" icon={<AlertCircle size={22} />}>
              {theory && theory.commonMistakes.length > 0 ? (
                <div className="space-y-3">
                  {theory.commonMistakes.map((mistake) => (
                    <p key={mistake} className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-slate-600">
                      {mistake}
                    </p>
                  ))}
                </div>
              ) : (
                <EmptyList label="자주 틀리는 부분" />
              )}
            </SectionCard>

            <section className="rounded-[1.75rem] border border-sky-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">관련 문제</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {getLicenseLabel(licenseType)} 기준 {relatedQuestions.length}문항
                  </p>
                </div>
              </div>

              <Link
                href={relatedHref}
                className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-5 text-base font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-800"
              >
                <ClipboardList size={20} />
                관련 문제 풀기
                <ArrowRight size={18} />
              </Link>
            </section>

            <BannerAd label="이론 상세 광고 영역" size="box" />
          </aside>
        </div>
      </div>
    </AppFrame>
  );
}
