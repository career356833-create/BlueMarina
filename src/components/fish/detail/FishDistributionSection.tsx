import type { ReactNode } from "react";

export type FishDistributionSectionProps = {
  distribution?: string | null;
  distributionSourceStatus?: "present" | "source_missing";
  sourceLabel?: string;
  className?: string;
};

const DEFAULT_SOURCE_LABEL = "국립수산과학원 공식 어종정보";

function hasVisibleText(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function splitParagraphs(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function renderParagraphs(paragraphs: string[]): ReactNode {
  return paragraphs.map((paragraph, index) => (
    <p
      key={`${paragraph.slice(0, 16)}-${index}`}
      className="whitespace-pre-line break-words text-sm leading-7 text-slate-800 sm:text-[15px]"
    >
      {paragraph}
    </p>
  ));
}

export function FishDistributionSection({
  distribution,
  distributionSourceStatus,
  sourceLabel = DEFAULT_SOURCE_LABEL,
  className
}: FishDistributionSectionProps) {
  if (!hasVisibleText(distribution) || distributionSourceStatus === "source_missing") {
    return null;
  }

  const paragraphs = splitParagraphs(distribution ?? "");

  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <section
      className={[
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        "sm:p-5",
        className ?? ""
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="분포"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">NIFS</p>
          <h3 className="text-lg font-bold text-slate-900 sm:text-xl">분포</h3>
        </div>
        <span className="shrink-0 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
          공식 원문
        </span>
      </div>

      <div className="mt-4 space-y-3">{renderParagraphs(paragraphs)}</div>

      <p className="mt-4 text-xs font-medium text-slate-500">{sourceLabel}</p>
    </section>
  );
}

export default FishDistributionSection;
