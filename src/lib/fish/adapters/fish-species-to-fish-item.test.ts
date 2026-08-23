import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fishSpeciesToFishItem } from "./fish-species-to-fish-item";
import type { FishSpecies } from "@/lib/types/drafts/nifs-fish-contract";
import type { FishCategory } from "@/data/fish-data";

const sampleCategory = "諛붾떎?싳떆 ?멸린?댁쥌" as FishCategory;

function createSpecies(overrides: Partial<FishSpecies> = {}): FishSpecies {
  return {
    id: "fish-korean-rockfish",
    slug: "korean-rockfish",
    koreanName: "우럭",
    commonName: "Korean Rockfish",
    englishName: "Korean Rockfish",
    scientificName: "Sebastes koreanus",
    taxonomy: {
      family: "Scorpaenidae"
    },
    morphology: "몸이 납작하고 등지느러미 가시가 발달한다.",
    habitat: "연안 암초와 방파제 주변",
    distribution: "동해, 남해, 서해",
    ecology: "저서성 어종으로 연안에서 주로 서식한다.",
    spawning: "초여름",
    feeding: "갑각류와 작은 어류",
    size: "30~40cm",
    season: "봄~가을",
    fishingMethods: ["루어낚시", "생미끼낚시"],
    foodNutrition: "담백한 흰살",
    aliases: ["rockfish"],
    officialSourceIds: [{ sourceProvider: "NIFS", sourceId: "1234" }],
    factReviewStatus: "approved",
    publishStatus: "published",
    version: 1,
    ...overrides
  };
}

describe("fishSpeciesToFishItem", () => {
  it("converts a published and approved FishSpecies into a legacy FishItem", () => {
    const item = fishSpeciesToFishItem(createSpecies(), {
      category: sampleCategory,
      relatedFishIds: ["fish-japanese-flounder", "missing-id"],
      resolveFishLabel: (speciesId) =>
        ({
          "fish-japanese-flounder": "광어"
        })[speciesId]
    });

    assert.ok(item);
    assert.equal(item?.id, "fish-korean-rockfish");
    assert.equal(item?.name, "우럭");
    assert.equal(item?.category, sampleCategory);
    assert.equal(item?.season, "봄~가을");
    assert.equal(item?.habitat, "연안 암초와 방파제 주변");
    assert.equal(item?.shortDescription, "저서성 어종으로 연안에서 주로 서식한다.");
    assert.match(item?.description ?? "", /학명: Sebastes koreanus/);
    assert.match(item?.description ?? "", /서식: 연안 암초와 방파제 주변/);
    assert.match(item?.fishingTips ?? "", /루어낚시/);
    assert.deepEqual(item?.relatedFish, ["광어"]);
  });

  it("returns null when the legacy view is missing enough display content", () => {
    const item = fishSpeciesToFishItem(
      createSpecies({
        season: "",
        habitat: "",
        morphology: "",
        distribution: "",
        ecology: "",
        spawning: "",
        feeding: "",
        size: "",
        fishingMethods: [],
        foodNutrition: ""
      }),
      { category: sampleCategory }
    );

    assert.equal(item, null);
  });

  it("filters out unpublished species by default", () => {
    const item = fishSpeciesToFishItem(createSpecies({ publishStatus: "draft" }), {
      category: sampleCategory
    });

    assert.equal(item, null);
  });

  it("filters out species that are not fact-reviewed by default", () => {
    const item = fishSpeciesToFishItem(createSpecies({ factReviewStatus: "needs_review" }), {
      category: sampleCategory
    });

    assert.equal(item, null);
  });

  it("keeps only related species labels that can be resolved", () => {
    const item = fishSpeciesToFishItem(createSpecies(), {
      category: sampleCategory,
      relatedFishIds: ["fish-japanese-flounder", "unknown-species", "fish-japanese-eel"],
      resolveFishLabel: (speciesId) =>
        ({
          "fish-japanese-flounder": "광어",
          "fish-japanese-eel": "갈치"
        })[speciesId]
    });

    assert.deepEqual(item?.relatedFish, ["광어", "갈치"]);
  });
});
