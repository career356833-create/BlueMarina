import type { ReactNode } from "react";

type PrimitiveMorphologyValue = string | number | boolean;

export type FishMorphologyStructuredValue =
  | PrimitiveMorphologyValue
  | null
  | undefined
  | readonly FishMorphologyStructuredValue[]
  | {
      readonly [key: string]: FishMorphologyStructuredValue;
    };

export type FishMorphologySectionProps = {
  morphology?: string | null;
  morphologySourceStatus?: "present" | "source_missing";
  distinguishingFeatures?: FishMorphologyStructuredValue;
  featureSourceStatus?: "present" | "source_missing";
  sourceLabel?: string;
  className?: string;
};

const DEFAULT_SOURCE_LABEL = "국립수산과학원 공식 어종정보";

function hasVisibleText(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeParagraphs(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function isRenderablePrimitive(value: unknown): value is PrimitiveMorphologyValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function renderStructuredValue(
  value: FishMorphologyStructuredValue,
  keyPrefix: string
): ReactNode {
  if (value == null) {
    return null;
  }

  if (isRenderablePrimitive(value)) {
    const text = String(value).trim();
    if (!text) {
      return null;
    }

    return (
      <p key={keyPrefix} className="whitespace-pre-line break-words text-sm leading-7 text-slate-700">
        {text}
      </p>
    );
  }

  if (Array.isArray(value)) {
    const items = value
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry != null);

    if (items.length === 0) {
      return null;
    }

    return (
      <ul key={keyPrefix} className="space-y-2">
        {items.map(({ entry, index }) => (
          <li key={`${keyPrefix}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            {renderStructuredValue(entry, `${keyPrefix}-${index}`)}
          </li>
        ))}
      </ul>
    );
  }

  const entries = Object.entries(value).filter(([, nested]) => nested != null);

  if (entries.length === 0) {
    return null;
  }

  return (
    <dl key={keyPrefix} className="grid gap-2">
      {entries.map(([label, nested], index) => {
        const nestedKey = `${keyPrefix}-${label}-${index}`;

        return (
          <div key={nestedKey} className="grid gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
            <dd className="text-sm leading-7 text-slate-700">
              {renderStructuredValue(nested, `${nestedKey}-value`)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function FishMorphologySection({
  morphology,
  morphologySourceStatus,
  distinguishingFeatures,
  featureSourceStatus,
  sourceLabel = DEFAULT_SOURCE_LABEL,
  className
}: FishMorphologySectionProps) {
  if (!hasVisibleText(morphology)) {
    return null;
  }

  const paragraphs = normalizeParagraphs(morphology ?? "");
  const featureContent = renderStructuredValue(distinguishingFeatures, "feature");
  const hasFeatureText = featureSourceStatus !== "source_missing" && featureContent != null;

  return (
    <section
      className={[
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        "sm:p-5",
        className ?? ""
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="형태와 생김새"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">NIFS</p>
          <h3 className="text-lg font-bold text-slate-900 sm:text-xl">형태와 생김새</h3>
        </div>
        {morphologySourceStatus ? (
          <span className="shrink-0 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
            {morphologySourceStatus === "present" ? "공식 원문" : "출처 확인 필요"}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-3">
          {paragraphs.map((paragraph, index) => (
            <p
              key={`${paragraph.slice(0, 16)}-${index}`}
              className="whitespace-pre-line break-words text-sm leading-7 text-slate-800 sm:text-[15px]"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {hasFeatureText ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <h4 className="text-sm font-bold text-slate-900">구별되는 특징</h4>
            <div className="mt-3 space-y-3">
              {featureContent}
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-xs font-medium text-slate-500">{sourceLabel}</p>
    </section>
  );
}

export default FishMorphologySection;
