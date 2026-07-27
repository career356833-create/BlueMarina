import fishingSpotsJson from "./fishing-spots.json";

export type FishingSpotType = "boat-fishing-point" | "rock-fishing-point";

export type FishingSpot = {
  id: string;
  name: string;
  type: FishingSpotType;
  region: string;
  city: string;
  address: string;
  lat: string;
  lng: string;
  targetFish: string;
  tideNote: string;
  depthNote: string;
  bottomNote: string;
  methodNote: string;
  safetyStatus: "needs-check";
  sourceType: string;
  sourceName: string;
  sourceUrl: string;
  sourceCheckedAt: string;
  status: "official-data-needs-field-check";
  description: string;
  facilities: string[];
  cautions: string[];
  originalId: string;
  originalPoint: string;
  note: string;
};

export const fishingSpots = fishingSpotsJson as FishingSpot[];

export const fishingSpotTypes: { value: FishingSpotType; label: string }[] = [
  { value: "boat-fishing-point", label: "선상낚시 포인트" },
  { value: "rock-fishing-point", label: "갯바위·방파제 포인트" }
];

export const fishingSpotRegions = Array.from(new Set(fishingSpots.map((spot) => spot.region))).sort((a, b) => a.localeCompare(b, "ko"));

export function getFishingSpotTypeLabel(type: FishingSpotType) {
  return fishingSpotTypes.find((item) => item.value === type)?.label ?? type;
}
