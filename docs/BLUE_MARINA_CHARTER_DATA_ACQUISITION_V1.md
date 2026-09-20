# Blue Marina Charter Data Acquisition V1

Batch 001 is a deterministic research-staging pipeline. It reads the public Ministry of Oceans and Fisheries fishing-vessel business register and keeps the raw CSV separate from normalized output.

The register is an authoritative bulk source for its published fields: serial number, maximum passenger/crew counts, departure/entry port name, business area, and business place. It does not publish operator identity, boat name or registration, charter product, target species, price, schedule, remaining seats, or port coordinates. Therefore Batch 001 retains 100 source registrations and source-backed ports while creating zero `Operator`, `Boat`, `Charter`, and `CharterSchedule` records. A register row is not treated as a charter product.

IDs are SHA-256-derived from stable source keys. Ports deduplicate on normalized source port name plus business area; coordinate proximity is never used to merge. All coordinates remain `null` with `UNKNOWN` status. Target species require an exact canonical name or an approved safe alias; the source has no species field, so no mapping is attempted. Unknown values stay unknown and no price, seats, schedule, availability, or coordinate is inferred.

The source file comes from the [MOF fishing-vessel business register](https://www.data.go.kr/data/15147464/fileData.do). The public file download was used without login. The associated API requires a Data.go.kr application and service key; no credential, login, CAPTCHA, paywall, or access restriction was bypassed.

Outputs remain research artifacts. Promotion requires a source that supplies a verifiable operator/boat/product relationship and any field shown in production. Before production activation, validate external URLs, source freshness, reference integrity, duplicate candidates, exact species mappings, and verified or policy-allowed port coordinates. No production registry, runtime listing, DB, or Supabase data is changed by this program.
