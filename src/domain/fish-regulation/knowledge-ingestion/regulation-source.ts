export type RegulationSourceType =
  | "LAW"
  | "ENFORCEMENT_DECREE"
  | "NOTICE"
  | "GUIDELINE"
  | "OTHER";

export type RegulationSource = {
  sourceId: string;
  sourceType: RegulationSourceType;
  title: string;
  issuingAuthority: string;
  documentVersion?: string;
  sourceUrl: string;
  sourceLocator?: string;
  collectedAt: string;
};

export function sourceFromFishingRegulation(input: {
  id: string;
  legalBasis?: string;
  sourceName: string;
  sourceUrl: string;
  sourceCheckedAt: string;
}): RegulationSource {
  return {
    sourceId: `source:${input.id}`,
    sourceType: inferSourceType(`${input.legalBasis ?? ""} ${input.sourceName}`),
    title: input.legalBasis || input.sourceName,
    issuingAuthority: input.sourceName,
    sourceUrl: input.sourceUrl,
    sourceLocator: input.legalBasis,
    collectedAt: input.sourceCheckedAt
  };
}

function inferSourceType(text: string): RegulationSourceType {
  if (/법률|법\b|수산자원관리법/.test(text)) return "LAW";
  if (/시행령/.test(text)) return "ENFORCEMENT_DECREE";
  if (/고시|공고|훈령/.test(text)) return "NOTICE";
  if (/안내|가이드|지침/.test(text)) return "GUIDELINE";
  return "OTHER";
}
