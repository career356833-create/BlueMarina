import type { FishCategory, FishItem } from "@/data/fish-data";
import type { FishSpecies } from "@/lib/types/drafts/nifs-fish-contract";

export type FishSpeciesToFishItemOptions = {
  category: FishCategory;
  includeUnpublished?: boolean;
  includeUnreviewed?: boolean;
  relatedFishIds?: string[];
  resolveFishLabel?: (speciesId: string) => string | undefined;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function pickFirstText(...values: Array<string | undefined | null>) {
  return values.find(hasText)?.trim() ?? "";
}

function normalizeList(values: string[] | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );
}

function buildDescription(species: FishSpecies) {
  const lines: string[] = [];

  if (hasText(species.scientificName)) {
    lines.push(`학명: ${species.scientificName.trim()}`);
  }
  if (hasText(species.taxonomy?.family)) {
    lines.push(`과: ${species.taxonomy?.family?.trim()}`);
  }
  if (hasText(species.morphology)) {
    lines.push(`형태: ${species.morphology.trim()}`);
  }
  if (hasText(species.habitat)) {
    lines.push(`서식: ${species.habitat.trim()}`);
  }
  if (hasText(species.distribution)) {
    lines.push(`분포: ${species.distribution.trim()}`);
  }
  if (hasText(species.ecology)) {
    lines.push(`생태: ${species.ecology.trim()}`);
  }
  if (hasText(species.spawning)) {
    lines.push(`산란: ${species.spawning.trim()}`);
  }
  if (hasText(species.feeding)) {
    lines.push(`먹이: ${species.feeding.trim()}`);
  }
  if (hasText(species.size)) {
    lines.push(`크기: ${species.size.trim()}`);
  }
  if (hasText(species.foodNutrition)) {
    lines.push(`식용: ${species.foodNutrition.trim()}`);
  }

  return lines.join("\n\n");
}

function buildShortDescription(species: FishSpecies) {
  return pickFirstText(species.ecology, species.habitat, species.distribution, species.morphology, species.season);
}

function buildFishingTips(species: FishSpecies) {
  const methods = normalizeList(species.fishingMethods);
  return methods.length > 0 ? methods.join(" · ") : "";
}

function buildRelatedFish(
  relatedFishIds: string[] | undefined,
  resolveFishLabel: ((speciesId: string) => string | undefined) | undefined
) {
  if (!relatedFishIds?.length || !resolveFishLabel) return [];

  const labels = relatedFishIds
    .map((speciesId) => resolveFishLabel(speciesId))
    .filter((label): label is string => hasText(label));

  return Array.from(new Set(labels.map((label) => label.trim())));
}

function hasRenderableLegacyContent(species: FishSpecies) {
  return (
    hasText(species.season) ||
    hasText(species.habitat) ||
    hasText(species.distribution) ||
    hasText(species.ecology) ||
    hasText(species.morphology) ||
    hasText(species.spawning) ||
    hasText(species.feeding) ||
    hasText(species.size) ||
    normalizeList(species.fishingMethods).length > 0 ||
    hasText(species.foodNutrition)
  );
}

export function fishSpeciesToFishItem(
  species: FishSpecies,
  options: FishSpeciesToFishItemOptions
): FishItem | null {
  if (!options.includeUnpublished && species.publishStatus !== "published") {
    return null;
  }

  if (!options.includeUnreviewed && species.factReviewStatus !== "approved") {
    return null;
  }

  const name = pickFirstText(species.koreanName, species.commonName, species.englishName);
  const season = pickFirstText(species.season);
  const habitat = pickFirstText(species.habitat);
  const shortDescription = buildShortDescription(species);
  const description = buildDescription(species);
  const fishingTips = buildFishingTips(species);
  const caution = "";
  const relatedFish = buildRelatedFish(options.relatedFishIds, options.resolveFishLabel);

  if (!hasText(name)) return null;
  if (!hasText(season)) return null;
  if (!hasText(habitat) && !hasRenderableLegacyContent(species)) return null;
  if (!hasText(shortDescription) && !hasText(description)) return null;

  return {
    id: species.id,
    name,
    category: options.category,
    season,
    habitat,
    shortDescription,
    description,
    fishingTips,
    caution,
    relatedFish
  };
}

export function fishSpeciesToFishItemOrNull(
  species: FishSpecies,
  options: FishSpeciesToFishItemOptions
) {
  return fishSpeciesToFishItem(species, options);
}
