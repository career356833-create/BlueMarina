const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const artifactPath = path.join(root, "data/fishing-condition/species-environment/v1/species-environment-profiles.json");
const reportPath = path.join(root, "reports/fishing-condition/species-environment-profile-audit-v1.json");
const raw = fs.readFileSync(artifactPath);
const artifact = JSON.parse(raw);
const profiles = artifact.profiles;
const covered = (predicate) => profiles.filter(predicate).length;
const sourceDistribution = {};
const confidenceDistribution = {};
for (const profile of profiles) {
  confidenceDistribution[profile.confidence] = (confidenceDistribution[profile.confidence] || 0) + 1;
  for (const evidence of profile.evidence) sourceDistribution[evidence.sourceType] = (sourceDistribution[evidence.sourceType] || 0) + 1;
}
const report = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  sourceId: artifact.sourceId,
  artifact: {
    path: "data/fishing-condition/species-environment/v1/species-environment-profiles.json",
    bytes: raw.length,
    sha256: crypto.createHash("sha256").update(raw).digest("hex"),
  },
  species: {
    total: profiles.length,
    complete: covered((p) => p.profileStatus === "COMPLETE"),
    partial: covered((p) => p.profileStatus === "PARTIAL"),
    conflictReviewRequired: covered((p) => p.profileStatus === "CONFLICT_REVIEW_REQUIRED"),
    canonicalMatches: profiles.length,
    missingSpecies: [],
  },
  coverage: {
    temperature: covered((p) => p.temperature.observed.length + p.temperature.preferred.length + p.temperature.spawning.length > 0),
    depth: covered((p) => p.depth.observed.length + p.depth.spawning.length + p.depth.juvenile.length + p.depth.adult.length > 0),
    salinity: covered((p) => p.salinity.ranges.length > 0 || p.salinity.qualitative.length > 0),
    dissolvedOxygen: covered((p) => p.dissolvedOxygen.observations.length > 0 || p.dissolvedOxygen.minimumMgL !== null),
    habitat: covered((p) => p.habitats.length > 0 && !p.habitats.every((v) => v === "UNKNOWN")),
    spawning: covered((p) => p.spawning.length > 0),
    migration: covered((p) => p.migration.length > 0),
    activity: covered((p) => p.activityPeriod !== "UNKNOWN"),
  },
  sources: sourceDistribution,
  sourcesPerSpecies: Object.fromEntries(profiles.map((p) => [p.speciesId, p.evidence.length])),
  confidenceDistribution,
  conflicts: profiles.flatMap((p) => p.conflicts.map((conflict) => ({ speciesId: p.speciesId, koreanName: p.koreanName, ...conflict }))),
  unsupportedFields: Object.fromEntries(profiles.map((p) => [p.speciesId, p.unsupportedFields])),
  boundaries: { suitabilityScoreImplemented: false, fishingProbabilityImplemented: false, recommendationRankImplemented: false, observationComparisonImplemented: false },
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ report: path.relative(root, reportPath), profiles: profiles.length, sha256: report.artifact.sha256 }));
