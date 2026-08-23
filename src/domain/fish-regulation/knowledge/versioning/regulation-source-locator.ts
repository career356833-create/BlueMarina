export type RegulationSourceLocator = {
  documentName: string;
  article?: string;
  paragraph?: string;
  item?: string;
  table?: string;
  page?: number;
};

export type RegulationSourceLocatorValidation = {
  valid: boolean;
  completenessScore: number;
  missingFields: Array<keyof RegulationSourceLocator>;
};

export function validateRegulationSourceLocator(locator?: RegulationSourceLocator): RegulationSourceLocatorValidation {
  if (!locator) {
    return {
      valid: false,
      completenessScore: 0,
      missingFields: ["documentName"]
    };
  }

  const missingFields: Array<keyof RegulationSourceLocator> = [];
  if (!locator.documentName) missingFields.push("documentName");
  const locatorSpecificity = [locator.article, locator.paragraph, locator.item, locator.table, locator.page].filter(Boolean).length;
  const completenessScore = Math.min(1, (locator.documentName ? 0.4 : 0) + locatorSpecificity * 0.15);

  return {
    valid: Boolean(locator.documentName) && locatorSpecificity > 0,
    completenessScore: round(completenessScore),
    missingFields
  };
}

export function formatRegulationSourceLocator(locator?: RegulationSourceLocator | string) {
  if (!locator) return undefined;
  if (typeof locator === "string") return locator;
  return [
    locator.documentName,
    locator.article,
    locator.paragraph,
    locator.item,
    locator.table,
    locator.page ? `p.${locator.page}` : undefined
  ].filter(Boolean).join(" ");
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
